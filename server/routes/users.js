const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const { Vote, Draft, Notification } = require('../models/misc');
const { requireAuth, clearAuthCookie } = require('../middleware/auth');
const { HttpError, COLOR_RE, EMAIL_RE, publicCommunity } = require('../utils/helpers');
const { computeAchievements } = require('../utils/achievements');
const { queryPosts } = require('./posts');
const { selfUser } = require('./auth');
const { hiddenCommunityIds } = require('../utils/access');

const router = express.Router();

async function findUser(username) {
    const user = await User.findOne({ usernameLower: String(username || '').toLowerCase() });
    if (!user) throw new HttpError(404, `u/${username} doesn't exist`);
    return user;
}

// ---- Current user ------------------------------------------------------------

router.patch('/me', requireAuth, async (req, res) => {
    const { displayName, bio, avatarColor, bannerColor, prefs } = req.body;
    const user = req.user;
    if (displayName !== undefined) user.displayName = String(displayName).trim().slice(0, 30);
    if (bio !== undefined) user.bio = String(bio).trim().slice(0, 200);
    for (const [key, value] of Object.entries({ avatarColor, bannerColor })) {
        if (value === undefined) continue;
        if (!COLOR_RE.test(value)) throw new HttpError(400, 'Colors must be hex values like #FF4500');
        user[key] = value;
    }
    if (prefs && typeof prefs === 'object') {
        for (const key of ['modMode', 'showMature', 'allowChats']) {
            if (prefs[key] !== undefined) user.prefs[key] = !!prefs[key];
        }
        if (['card', 'compact'].includes(prefs.defaultView)) user.prefs.defaultView = prefs.defaultView;
    }
    await user.save();
    res.json({ user: await selfUser(user) });
});

router.post('/me/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(String(currentPassword || ''), req.user.passwordHash))) {
        throw new HttpError(400, 'Your current password is incorrect');
    }
    if (String(newPassword || '').length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
    req.user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await req.user.save();
    res.json({ ok: true });
});

router.post('/me/email', requireAuth, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    if (!(await bcrypt.compare(String(req.body.password || ''), req.user.passwordHash))) {
        throw new HttpError(400, 'Your password is incorrect');
    }
    if (await User.exists({ email, _id: { $ne: req.user._id } })) throw new HttpError(409, 'That email is already in use');
    req.user.email = email;
    await req.user.save();
    res.json({ user: await selfUser(req.user) });
});

router.delete('/me', requireAuth, async (req, res) => {
    if (!(await bcrypt.compare(String(req.body.password || ''), req.user.passwordHash))) {
        throw new HttpError(400, 'Your password is incorrect');
    }
    const id = req.user._id;
    // Content stays but shows as [deleted], matching Reddit's behaviour.
    await Promise.all([
        Community.updateMany({ _id: { $in: req.user.joinedCommunities } }, { $inc: { memberCount: -1 } }),
        Community.updateMany({}, { $pull: { moderators: id, approvedUsers: id } }),
        Vote.deleteMany({ user: id }),
        Draft.deleteMany({ user: id }),
        Notification.deleteMany({ user: id })
    ]);
    await User.deleteOne({ _id: id });
    clearAuthCookie(res);
    res.json({ ok: true });
});

router.get('/me/communities', requireAuth, async (req, res) => {
    const [joined, moderated] = await Promise.all([
        Community.find({ _id: { $in: req.user.joinedCommunities } }).sort({ name: 1 }),
        Community.find({ moderators: req.user._id }).sort({ name: 1 })
    ]);
    res.json({
        joined: joined.map(c => publicCommunity(c, req.user)),
        moderated: moderated.map(c => publicCommunity(c, req.user))
    });
});

// ---- Custom feeds --------------------------------------------------------------

async function resolveCommunityIds(names) {
    const lower = (Array.isArray(names) ? names : []).map(n => String(n).toLowerCase().replace(/^r\//, ''));
    const found = await Community.find({ nameLower: { $in: lower } }).select('_id');
    return found.map(c => c._id);
}

router.post('/me/feeds', requireAuth, async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw new HttpError(400, 'Give your custom feed a name');
    if (req.user.customFeeds.length >= 20) throw new HttpError(400, 'You can have at most 20 custom feeds');
    req.user.customFeeds.push({
        name: name.slice(0, 50),
        description: String(req.body.description || '').slice(0, 300),
        communities: await resolveCommunityIds(req.body.communities)
    });
    await req.user.save();
    const feed = req.user.customFeeds[req.user.customFeeds.length - 1];
    res.status(201).json({ feedId: feed._id, user: await selfUser(req.user) });
});

router.patch('/me/feeds/:id', requireAuth, async (req, res) => {
    const feed = req.user.customFeeds.id(req.params.id);
    if (!feed) throw new HttpError(404, 'Custom feed not found');
    if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();
        if (!name) throw new HttpError(400, 'Give your custom feed a name');
        feed.name = name.slice(0, 50);
    }
    if (req.body.description !== undefined) feed.description = String(req.body.description).slice(0, 300);
    if (req.body.communities !== undefined) feed.communities = await resolveCommunityIds(req.body.communities);
    await req.user.save();
    res.json({ user: await selfUser(req.user) });
});

router.delete('/me/feeds/:id', requireAuth, async (req, res) => {
    const feed = req.user.customFeeds.id(req.params.id);
    if (!feed) throw new HttpError(404, 'Custom feed not found');
    feed.deleteOne();
    await req.user.save();
    res.json({ user: await selfUser(req.user) });
});

// ---- Public profiles -----------------------------------------------------------

router.get('/:username', async (req, res) => {
    const user = await findUser(req.params.username);
    const achievements = await computeAchievements(user);
    const isMe = !!req.user && req.user._id.equals(user._id);
    const moderated = await Community.find({ moderators: user._id, type: { $ne: 'Private' } }).select('name icon color memberCount');
    res.json({
        user: {
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatarColor: user.avatarColor,
            bannerColor: user.bannerColor,
            postKarma: user.postKarma,
            commentKarma: user.commentKarma,
            karma: user.postKarma + user.commentKarma,
            createdAt: user.createdAt,
            isMe,
            stats: achievements.stats,
            achievements: achievements.list,
            moderated: moderated.map(c => ({ name: c.name, icon: c.icon, color: c.color, memberCount: c.memberCount }))
        }
    });
});

router.get('/:username/posts', async (req, res) => {
    const user = await findUser(req.params.username);
    const filter = await visibleOnly({ author: user._id }, req.user);
    res.json(await queryPosts({ filter, sort: req.query.sort || 'new', t: req.query.t, page: req.query.page, viewer: req.user }));
});

router.get('/:username/comments', async (req, res) => {
    const user = await findUser(req.params.username);
    const page = Math.max(Number(req.query.page) || 0, 0);
    const limit = 20;
    const sort = req.query.sort === 'top' ? { score: -1 } : { createdAt: -1 };
    const blocked = new Set((await hiddenCommunityIds(req.user)).map(String));

    const comments = await Comment.find({ author: user._id, deleted: false })
        .sort(sort)
        .skip(page * limit)
        .limit(limit + 1)
        .populate({ path: 'post', select: 'title community removed', populate: { path: 'community', select: 'name icon color' } });

    const visible = comments.slice(0, limit).filter(c => c.post && !c.post.removed && c.post.community && !blocked.has(String(c.post.community._id)));
    const votes = req.user
        ? new Map((await Vote.find({ user: req.user._id, target: { $in: visible.map(c => c._id) } }).lean()).map(v => [String(v.target), v.dir]))
        : new Map();

    res.json({
        comments: visible.map(c => ({
            id: c._id,
            body: c.body,
            score: c.score,
            createdAt: c.createdAt,
            edited: c.edited,
            userVote: votes.get(String(c._id)) || 0,
            post: { id: c.post._id, title: c.post.title },
            community: { name: c.post.community.name, icon: c.post.community.icon, color: c.post.community.color }
        })),
        hasMore: comments.length > limit
    });
});

/** Adds the private/mature community exclusion used by every mixed post list. */
async function visibleOnly(filter, viewer) {
    const blocked = await hiddenCommunityIds(viewer);
    return blocked.length ? { ...filter, community: { $nin: blocked } } : filter;
}

async function ownList(req, username) {
    const user = await findUser(username);
    if (!req.user || !req.user._id.equals(user._id)) throw new HttpError(403, 'This list is private');
    return user;
}

router.get('/:username/saved', requireAuth, async (req, res) => {
    const user = await ownList(req, req.params.username);
    res.json(await queryPosts({ filter: await visibleOnly({ _id: { $in: user.savedPosts } }, req.user), sort: 'new', page: req.query.page, viewer: req.user }));
});

router.get('/:username/hidden', requireAuth, async (req, res) => {
    const user = await ownList(req, req.params.username);
    res.json(await queryPosts({ filter: await visibleOnly({ _id: { $in: user.hiddenPosts } }, req.user), sort: 'new', page: req.query.page, viewer: req.user }));
});

for (const [path, dir] of [['upvoted', 1], ['downvoted', -1]]) {
    router.get(`/:username/${path}`, requireAuth, async (req, res) => {
        const user = await ownList(req, req.params.username);
        const ids = await Vote.find({ user: user._id, targetType: 'Post', dir }).sort({ createdAt: -1 }).limit(500).distinct('target');
        const filter = await visibleOnly({ _id: { $in: ids.filter(id => mongoose.isValidObjectId(id)) } }, req.user);
        res.json(await queryPosts({ filter, sort: 'new', page: req.query.page, viewer: req.user }));
    });
}

module.exports = router;
