const { Schema, model, Types } = require('mongoose');

const voteSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Post', 'Comment'], required: true },
    target: { type: Types.ObjectId, required: true },
    dir: { type: Number, enum: [1, -1], required: true }
}, { timestamps: true });
voteSchema.index({ user: 1, target: 1 }, { unique: true });
voteSchema.index({ user: 1, targetType: 1, dir: 1, createdAt: -1 });

const draftSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', maxlength: 300 },
    body: { type: String, default: '' },
    url: { type: String, default: '' },
    community: { type: Types.ObjectId, ref: 'Community', default: null },
    tags: [String],
    media: [{ type: { type: String }, url: String }]
}, { timestamps: true });

const messageSchema = new Schema({
    from: { type: Types.ObjectId, ref: 'User', required: true },
    to: { type: Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null }
}, { timestamps: true });
messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, readAt: 1 });

const notificationSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['comment', 'reply', 'message', 'community'], required: true },
    actor: { type: String, default: '' },
    text: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const reportSchema = new Schema({
    reporter: { type: Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Post', 'Comment'], required: true },
    target: { type: Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 200 }
}, { timestamps: true });

const verificationCodeSchema = new Schema({
    email: { type: String, required: true, lowercase: true, index: true },
    purpose: { type: String, enum: ['signup', 'login', 'reset'], required: true },
    code: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
});
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
    Vote: model('Vote', voteSchema),
    Draft: model('Draft', draftSchema),
    Message: model('Message', messageSchema),
    Notification: model('Notification', notificationSchema),
    Report: model('Report', reportSchema),
    VerificationCode: model('VerificationCode', verificationCodeSchema)
};
