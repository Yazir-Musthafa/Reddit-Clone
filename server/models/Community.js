const { Schema, model, Types } = require('mongoose');

const communitySchema = new Schema({
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 500 },
    topic: { type: String, default: 'Internet Culture', index: true },
    type: { type: String, enum: ['Public', 'Restricted', 'Private'], default: 'Public' },
    mature: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    color: { type: String, default: '#FF4500' },
    bannerColor: { type: String, default: '#0079D3' },
    memberCount: { type: Number, default: 0 },
    creator: { type: Types.ObjectId, ref: 'User' },
    moderators: [{ type: Types.ObjectId, ref: 'User' }],
    approvedUsers: [{ type: Types.ObjectId, ref: 'User' }],
    rules: [{
        title: { type: String, required: true, maxlength: 100 },
        description: { type: String, default: '', maxlength: 500 }
    }]
}, { timestamps: true });

communitySchema.index({ memberCount: -1 });

module.exports = model('Community', communitySchema);
