const { Schema, model, Types } = require('mongoose');

const commentSchema = new Schema({
    post: { type: Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    parent: { type: Types.ObjectId, ref: 'Comment', default: null },
    body: { type: String, required: true, maxlength: 10000 },
    score: { type: Number, default: 1 },
    upvotes: { type: Number, default: 1 },
    downvotes: { type: Number, default: 0 },
    edited: { type: Date, default: null },
    deleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = model('Comment', commentSchema);
