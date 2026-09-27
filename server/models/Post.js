const { Schema, model, Types } = require('mongoose');

const postSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, default: '' },          // sanitized HTML
    bodyText: { type: String, default: '' },      // plain text, used for search and previews
    url: { type: String, default: '' },           // optional external link
    media: [{
        type: { type: String, enum: ['image', 'video'], required: true },
        url: { type: String, required: true }
    }],
    tags: [String],
    author: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    community: { type: Types.ObjectId, ref: 'Community', required: true, index: true },
    score: { type: Number, default: 1 },
    upvotes: { type: Number, default: 1 },
    downvotes: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    hotScore: { type: Number, default: 0, index: true },
    bestScore: { type: Number, default: 0, index: true },
    edited: { type: Date, default: null },
    removed: { type: Boolean, default: false }
}, { timestamps: true });

postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = model('Post', postSchema);
