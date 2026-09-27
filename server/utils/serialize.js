const { Vote } = require('../models/misc');
const { publicUser, publicCommunity } = require('./helpers');

async function voteMapFor(viewer, targets) {
    const map = new Map();
    if (!viewer || targets.length === 0) return map;
    const votes = await Vote.find({ user: viewer._id, target: { $in: targets.map(t => t._id) } }).lean();
    votes.forEach(v => map.set(String(v.target), v.dir));
    return map;
}

function isModOf(viewer, community) {
    return !!viewer && !!community && (community.moderators || []).some(m => String(m._id || m) === String(viewer._id));
}

/** Posts must be populated with `author` and `community`. */
async function serializePosts(posts, viewer) {
    const votes = await voteMapFor(viewer, posts);
    const saved = new Set((viewer?.savedPosts || []).map(String));
    const hidden = new Set((viewer?.hiddenPosts || []).map(String));

    return posts.map(p => {
        const id = String(p._id);
        const isAuthor = !!viewer && !!p.author && String(p.author._id) === String(viewer._id);
        return {
            id,
            title: p.title,
            body: p.body,
            excerpt: (p.bodyText || '').slice(0, 280),
            url: p.url,
            media: (p.media || []).map(m => ({ type: m.type, url: m.url })),
            tags: p.tags || [],
            author: publicUser(p.author),
            community: publicCommunity(p.community, viewer),
            score: p.score,
            commentCount: p.commentCount,
            createdAt: p.createdAt,
            edited: p.edited,
            userVote: votes.get(id) || 0,
            saved: saved.has(id),
            hidden: hidden.has(id),
            isAuthor,
            canModerate: isModOf(viewer, p.community)
        };
    });
}

/** Comments must be populated with `author`. `community` is the post's community (for mod rights). */
async function serializeComments(comments, viewer, community) {
    const votes = await voteMapFor(viewer, comments);
    const canModerate = isModOf(viewer, community);
    return comments.map(c => {
        const id = String(c._id);
        const isAuthor = !!viewer && !!c.author && String(c.author._id) === String(viewer._id);
        return {
            id,
            post: String(c.post?._id || c.post),
            parent: c.parent ? String(c.parent) : null,
            body: c.deleted ? '' : c.body,
            deleted: c.deleted,
            author: c.deleted ? publicUser(null) : publicUser(c.author),
            score: c.score,
            createdAt: c.createdAt,
            edited: c.edited,
            userVote: votes.get(id) || 0,
            isAuthor: isAuthor && !c.deleted,
            canModerate
        };
    });
}

module.exports = { serializePosts, serializeComments, isModOf };
