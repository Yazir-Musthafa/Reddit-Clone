const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { Report } = require('../models/misc');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/helpers');
const { serializeComments, isModOf } = require('../utils/serialize');
const { castVote } = require('../utils/votes');

const router = express.Router();

async function loadComment(id) {
    if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Comment not found');
    const comment = await Comment.findById(id).populate('author');
    if (!comment) throw new HttpError(404, 'Comment not found');
    const post = await Post.findById(comment.post).populate('community');
    return { comment, post };
}

router.patch('/:id', requireAuth, async (req, res) => {
    const { comment, post } = await loadComment(req.params.id);
    if (comment.deleted || String(comment.author?._id) !== String(req.user._id)) {
        throw new HttpError(403, 'You can only edit your own comments');
    }
    const body = String(req.body.body || '').trim();
    if (!body) throw new HttpError(400, 'Comment cannot be empty');
    comment.body = body.slice(0, 10000);
    comment.edited = new Date();
    await comment.save();
    const [serialized] = await serializeComments([comment], req.user, post?.community);
    res.json({ comment: serialized });
});

router.delete('/:id', requireAuth, async (req, res) => {
    const { comment, post } = await loadComment(req.params.id);
    const isAuthor = String(comment.author?._id) === String(req.user._id);
    if (!isAuthor && !isModOf(req.user, post?.community)) throw new HttpError(403, 'You cannot delete this comment');
    if (!comment.deleted) {
        comment.deleted = true;
        await comment.save();
        await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
    }
    res.json({ ok: true });
});

router.post('/:id/vote', requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Comment not found');
    res.json(await castVote(req.user, 'Comment', req.params.id, Number(req.body.dir)));
});

router.post('/:id/report', requireAuth, async (req, res) => {
    const { comment } = await loadComment(req.params.id);
    const reason = String(req.body.reason || '').trim();
    if (!reason) throw new HttpError(400, 'Please pick a reason');
    await Report.create({ reporter: req.user._id, targetType: 'Comment', target: comment._id, reason: reason.slice(0, 200) });
    res.json({ ok: true });
});

module.exports = router;
