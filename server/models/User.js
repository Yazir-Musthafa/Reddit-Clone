const { Schema, model, Types } = require('mongoose');

const customFeedSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 300 },
    communities: [{ type: Types.ObjectId, ref: 'Community' }]
}, { timestamps: true });

const userSchema = new Schema({
    username: { type: String, required: true, trim: true },
    usernameLower: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: '', maxlength: 30 },
    bio: { type: String, default: '', maxlength: 200 },
    avatarColor: { type: String, default: '#FF87A2' },
    bannerColor: { type: String, default: '#33A8FF' },
    gender: { type: String, default: '' },
    interests: [String],
    topics: [String],
    postKarma: { type: Number, default: 0 },
    commentKarma: { type: Number, default: 0 },
    joinedCommunities: [{ type: Types.ObjectId, ref: 'Community' }],
    savedPosts: [{ type: Types.ObjectId, ref: 'Post' }],
    hiddenPosts: [{ type: Types.ObjectId, ref: 'Post' }],
    customFeeds: [customFeedSchema],
    prefs: {
        modMode: { type: Boolean, default: true },
        showMature: { type: Boolean, default: false },
        allowChats: { type: Boolean, default: true },
        defaultView: { type: String, enum: ['card', 'compact'], default: 'card' }
    }
}, { timestamps: true });

module.exports = model('User', userSchema);
