const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const { Vote, Report, Notification } = require('../models/misc');
const { requireAuth } = require('../middleware/auth');
const { HttpError, sanitizeBody, htmlToText, normalizeUrl, applyRanks } = require('../utils/helpers');
const { serializePosts, serializeComments, isModOf } = require('../utils/serialize');
const { castVote } = require('../utils/votes');
const { canView, canPost, hiddenCommunityIds } = require('../utils/access');

const router = express.Router();

const TOP_WINDOWS = { hour: 1, day: 24, week: 24 * 7, month: 24 * 30, year: 24 * 365 };
const ALLOWED_TAGS = ['OC', 'Spoiler', 'NSFW', 'Discussion', 'Advice', 'Showcase', 'News', 'Question', 'Meme'];

function assertId(id, label = 'Post') {
    if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${label} not found`);
}

async function loadPost(id) {
    assertId(id);
    const post = await Post.findById(id).populate('author').populate('community');
    if (!post || !post.community) throw new HttpError(404, 'Post not found');
    return post;
}

/**
 * Shared feed query used by the home/popular/news/all feeds, community pages,
 * user profiles, custom feeds and search.
 */
async function queryPosts({ filter, sort = 'best', t = 'all', page = 0, limit = 10, viewer }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const skip = Math.max(Number(page) || 0, 0) * safeLimit;
    const where = { removed: false, ...filter };

    if (sort === 'top' && TOP_WINDOWS[t]) {
        where.createdAt = { $gte: new Date(Date.now() - TOP_WINDOWS[t] * 3600 * 1000) };
    }

    let docs;
    if (sort === 'rising') {
        // Score velocity over the last few days.
        where.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) };
        const recent = await Post.find(where).select('score createdAt').sort({ createdAt: -1 }).limit(500).lean();
        const ranked = recent
            .map(p => ({ id: p._id, v: p.score / ((Date.now() - p.createdAt) / 3600000 + 2) }))
            .sort((a, b) => b.v - a.v)
            .slice(skip, skip + safeLimit + 1);
        const byId = new Map((await Post.find({ _id: { $in: ranked.map(r => r.id) } }).populate('author').populate('community'))
            .map(p => [String(p._id), p]));
        docs = ranked.map(r => byId.get(String(r.id))).filter(Boolean);
    } else {
        const sorts = {
            best: { bestScore: -1 },
            hot: { hotScore: -1 },
            new: { createdAt: -1 },
            top: { score: -1, createdAt: -1 },
            old: { createdAt: 1 }
        };
        docs = await Post.find(where)
            .sort(sorts[sort] || sorts.best)
            .skip(skip)
            .limit(safeLimit + 1)
            .populate('author')
            .populate('community');
    }

    const hasMore = docs.length > safeLimit;
    const posts = await serializePosts(docs.slice(0, safeLimit).filter(p => p.community), viewer);
    return { posts, hasMore };
}

router.get('/', async (req, res) => {
    const { feed = 'all', sort = 'best', t = 'all', page = 0, limit = 10, community: communityName, feedId } = req.query;
    const viewer = req.user;
    const and = [];

    if (communityName) {
        const community = await Community.findOne({ nameLower: String(communityName).toLowerCase() });
        if (!community) throw new HttpError(404, 'Community not found');
        if (!canView(community, viewer)) throw new HttpError(403, 'This community is private');
        and.push({ community: community._id });
    } else {
        const blocked = await hiddenCommunityIds(viewer);
        if (blocked.length) and.push({ community: { $nin: blocked } });

        if (feed === 'home' && viewer) {
            if (viewer.joinedCommunities.length) {
                and.push({ $or: [{ community: { $in: viewer.joinedCommunities } }, { author: viewer._id }] });
            }
        } else if (feed === 'news') {
            const newsIds = await Community.find({ topic: 'News & Politics' }).distinct('_id');
            and.push({ $or: [{ community: { $in: newsIds } }, { tags: 'News' }] });
        } else if (feed === 'custom') {
            if (!viewer) throw new HttpError(401, 'Log in to view custom feeds');
            const custom = viewer.customFeeds.id(feedId);
            if (!custom) throw new HttpError(404, 'Custom feed not found');
            and.push({ community: { $in: custom.communities } });
        }
    }

    if (viewer?.hiddenPosts?.length) and.push({ _id: { $nin: viewer.hiddenPosts } });

    const effectiveSort = feed === 'popular' && !req.query.sort ? 'hot' : sort;
    res.json(await queryPosts({ filter: and.length ? { $and: and } : {}, sort: effectiveSort, t, page, limit, viewer }));
});

router.get('/:id', async (req, res) => {
    const post = await loadPost(req.params.id);
    if (!canView(post.community, req.user)) throw new HttpError(403, 'This community is private');
    if (post.removed) throw new HttpError(410, 'This post was deleted');
    const [serialized] = await serializePosts([post], req.user);
    res.json({ post: serialized });
});

router.post('/', requireAuth, async (req, res) => {
    const { title, body = '', url = '', media = [], tags = [], community: communityName } = req.body;
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new HttpError(400, 'Please add a title');
    if (cleanTitle.length > 300) throw new HttpError(400, 'Titles can be at most 300 characters');

    const community = await Community.findOne({ nameLower: String(communityName || '').toLowerCase() });
    if (!community) throw new HttpError(400, 'Please choose a community');
    if (!canPost(community, req.user)) throw new HttpError(403, `Only approved users can post in r/${community.name}`);

    const cleanMedia = (Array.isArray(media) ? media : [])
        .filter(m => m && ['image', 'video'].includes(m.type) && typeof m.url === 'string' && m.url.startsWith('/uploads/'))
        .slice(0, 20)
        .map(m => ({ type: m.type, url: m.url }));

    const cleanBody = sanitizeBody(body);
    const post = new Post({
        title: cleanTitle,
        body: cleanBody,
        bodyText: htmlToText(cleanBody),
        url: normalizeUrl(url),
        media: cleanMedia,
        tags: (Array.isArray(tags) ? tags : []).filter(tg => ALLOWED_TAGS.includes(tg)),
        author: req.user._id,
        community: community._id,
        createdAt: new Date()
    });
    applyRanks(post);
    await post.save();
    await Vote.create({ user: req.user._id, targetType: 'Post', target: post._id, dir: 1 });

    await post.populate('author');
    await post.populate('community');
    const [serialized] = await serializePosts([post], req.user);
    res.status(201).json({ post: serialized });
});

router.patch('/:id', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    if (String(post.author?._id) !== String(req.user._id)) throw new HttpError(403, 'You can only edit your own posts');
    if (post.removed) throw new HttpError(410, 'This post was deleted');

    if (req.body.body !== undefined) {
        post.body = sanitizeBody(req.body.body);
        post.bodyText = htmlToText(post.body);
    }
    if (Array.isArray(req.body.tags)) post.tags = req.body.tags.filter(tg => ALLOWED_TAGS.includes(tg));
    post.edited = new Date();
    await post.save();
    const [serialized] = await serializePosts([post], req.user);
    res.json({ post: serialized });
});

router.delete('/:id', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    const isAuthor = String(post.author?._id) === String(req.user._id);
    if (!isAuthor && !isModOf(req.user, post.community)) throw new HttpError(403, 'You cannot delete this post');
    post.removed = true;
    await post.save();
    res.json({ ok: true });
});

router.post('/:id/vote', requireAuth, async (req, res) => {
    assertId(req.params.id);
    res.json(await castVote(req.user, 'Post', req.params.id, Number(req.body.dir)));
});

function toggleInList(list, id) {
    const idx = list.findIndex(x => String(x) === String(id));
    if (idx >= 0) {
        list.splice(idx, 1);
        return false;
    }
    list.push(id);
    return true;
}

router.post('/:id/save', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    const saved = toggleInList(req.user.savedPosts, post._id);
    await req.user.save();
    res.json({ saved });
});

router.post('/:id/hide', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    const hidden = toggleInList(req.user.hiddenPosts, post._id);
    await req.user.save();
    res.json({ hidden });
});

router.post('/:id/report', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    const reason = String(req.body.reason || '').trim();
    if (!reason) throw new HttpError(400, 'Please pick a reason');
    await Report.create({ reporter: req.user._id, targetType: 'Post', target: post._id, reason: reason.slice(0, 200) });
    res.json({ ok: true });
});

router.get('/:id/comments', async (req, res) => {
    const post = await loadPost(req.params.id);
    if (!canView(post.community, req.user)) throw new HttpError(403, 'This community is private');
    const sorts = { best: { score: -1, createdAt: -1 }, top: { score: -1 }, new: { createdAt: -1 }, old: { createdAt: 1 } };
    const comments = await Comment.find({ post: post._id })
        .sort(sorts[req.query.sort] || sorts.best)
        .limit(1000)
        .populate('author');
    res.json({ comments: await serializeComments(comments, req.user, post.community) });
});

router.post('/:id/comments', requireAuth, async (req, res) => {
    const post = await loadPost(req.params.id);
    if (post.removed) throw new HttpError(410, 'This post was deleted');
    if (!canView(post.community, req.user)) throw new HttpError(403, 'This community is private');

    const body = String(req.body.body || '').trim();
    if (!body) throw new HttpError(400, 'Comment cannot be empty');
    if (body.length > 10000) throw new HttpError(400, 'Comments can be at most 10,000 characters');

    let parent = null;
    if (req.body.parentId) {
        assertId(req.body.parentId, 'Comment');
        parent = await Comment.findOne({ _id: req.body.parentId, post: post._id });
        if (!parent) throw new HttpError(404, 'The comment you replied to no longer exists');
    }

    const comment = await Comment.create({ post: post._id, author: req.user._id, parent: parent?._id || null, body });
    await Vote.create({ user: req.user._id, targetType: 'Comment', target: comment._id, dir: 1 });

    post.commentCount += 1;
    applyRanks(post);
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 }, hotScore: post.hotScore, bestScore: post.bestScore });

    const recipient = parent ? parent.author : post.author?._id;
    if (recipient && String(recipient) !== String(req.user._id)) {
        await Notification.create({
            user: recipient,
            type: parent ? 'reply' : 'comment',
            actor: req.user.username,
            text: parent
                ? `u/${req.user.username} replied to your comment in r/${post.community.name}`
                : `u/${req.user.username} commented on your post "${post.title.slice(0, 60)}"`,
            link: `post.html?id=${post._id}#comment-${comment._id}`
        });
    }

    await comment.populate('author');
    const [serialized] = await serializeComments([comment], req.user, post.community);
    res.status(201).json({ comment: serialized });
});

module.exports = { router, queryPosts, toggleInList };
