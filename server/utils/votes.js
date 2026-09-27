const { Vote } = require('../models/misc');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { applyRanks, HttpError } = require('./helpers');

/**
 * Sets the viewer's vote on a post or comment to dir (1, -1 or 0 to clear),
 * keeping score counters and the author's karma in sync.
 */
async function castVote(user, targetType, targetId, dir) {
    if (![1, -1, 0].includes(dir)) throw new HttpError(400, 'Invalid vote direction');
    const Model = targetType === 'Post' ? Post : Comment;
    const target = await Model.findById(targetId);
    if (!target || target.removed || target.deleted) throw new HttpError(404, `${targetType} not found`);

    const existing = await Vote.findOne({ user: user._id, target: target._id });
    const prev = existing ? existing.dir : 0;
    if (prev === dir) return { score: target.score, userVote: dir };

    if (dir === 0) {
        await existing.deleteOne();
    } else if (existing) {
        existing.dir = dir;
        await existing.save();
    } else {
        try {
            await Vote.create({ user: user._id, targetType, target: target._id, dir });
        } catch (err) {
            if (err.code === 11000) throw new HttpError(409, 'Vote already in progress');
            throw err;
        }
    }

    const up = (dir === 1 ? 1 : 0) - (prev === 1 ? 1 : 0);
    const down = (dir === -1 ? 1 : 0) - (prev === -1 ? 1 : 0);
    const delta = dir - prev;

    const updated = await Model.findByIdAndUpdate(
        target._id,
        { $inc: { score: delta, upvotes: up, downvotes: down } },
        { returnDocument: 'after' }
    );
    if (targetType === 'Post') {
        applyRanks(updated);
        await Post.updateOne({ _id: updated._id }, { hotScore: updated.hotScore, bestScore: updated.bestScore });
    }

    // Voting on your own content doesn't earn karma.
    if (String(target.author) !== String(user._id)) {
        const field = targetType === 'Post' ? 'postKarma' : 'commentKarma';
        await User.updateOne({ _id: target.author }, { $inc: { [field]: delta } });
    }

    return { score: updated.score, userVote: dir };
}

module.exports = { castVote };
