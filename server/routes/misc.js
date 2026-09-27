const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const config = require('../config');
const User = require('../models/User');
const Community = require('../models/Community');
const Comment = require('../models/Comment');
const { Draft, Message, Notification } = require('../models/misc');
const { requireAuth } = require('../middleware/auth');
const { HttpError, escapeRegex, publicCommunity, publicUser, sanitizeBody } = require('../utils/helpers');
const { queryPosts } = require('./posts');
const { hiddenCommunityIds } = require('../utils/access');

// ---- Search ----------------------------------------------------------------------

const search = express.Router();

search.get('/suggest', async (req, res) => {
    const q = String(req.query.q || '').trim().replace(/^[ru]\//i, '');
    if (!q) return res.json({ communities: [], users: [] });
    const re = new RegExp(escapeRegex(q.toLowerCase()));
    const communityFilter = { nameLower: re, type: { $ne: 'Private' } };
    if (!req.user?.prefs?.showMature) communityFilter.mature = false;
    const [communities, users] = await Promise.all([
        Community.find(communityFilter).sort({ memberCount: -1 }).limit(5),
        User.find({ usernameLower: re }).limit(4).select('username avatarColor displayName')
    ]);
    res.json({ communities: communities.map(c => publicCommunity(c, req.user)), users: users.map(publicUser) });
});

search.get('/', async (req, res) => {
    const q = String(req.query.q || '').trim();
    const type = req.query.type || 'posts';
    const page = Math.max(Number(req.query.page) || 0, 0);
    if (!q) return res.json({ results: [], hasMore: false });
    const re = new RegExp(escapeRegex(q), 'i');

    if (type === 'communities') {
        const filter = { type: { $ne: 'Private' }, $or: [{ name: re }, { description: re }, { topic: re }] };
        if (!req.user?.prefs?.showMature) filter.mature = false;
        const found = await Community.find(filter).sort({ memberCount: -1 }).skip(page * 20).limit(21);
        return res.json({ results: found.slice(0, 20).map(c => publicCommunity(c, req.user)), hasMore: found.length > 20 });
    }

    if (type === 'people') {
        const found = await User.find({ $or: [{ username: re }, { displayName: re }] }).skip(page * 20).limit(21)
            .select('username displayName avatarColor postKarma commentKarma bio createdAt');
        return res.json({
            results: found.slice(0, 20).map(u => ({
                ...publicUser(u), bio: u.bio, karma: u.postKarma + u.commentKarma, createdAt: u.createdAt
            })),
            hasMore: found.length > 20
        });
    }

    if (type === 'comments') {
        const blocked = new Set((await hiddenCommunityIds(req.user)).map(String));
        const found = await Comment.find({ body: re, deleted: false }).sort({ score: -1 }).skip(page * 20).limit(21)
            .populate('author', 'username avatarColor')
            .populate({ path: 'post', select: 'title community removed', populate: { path: 'community', select: 'name icon color' } });
        const visible = found.slice(0, 20).filter(c => c.post && !c.post.removed && c.post.community && !blocked.has(String(c.post.community._id)));
        return res.json({
            results: visible.map(c => ({
                id: c._id, body: c.body, score: c.score, createdAt: c.createdAt,
                author: publicUser(c.author),
                post: { id: c.post._id, title: c.post.title },
                community: { name: c.post.community.name, icon: c.post.community.icon, color: c.post.community.color }
            })),
            hasMore: found.length > 20
        });
    }

    const blocked = await hiddenCommunityIds(req.user);
    const namedCommunities = await Community.find({ nameLower: new RegExp(escapeRegex(q.toLowerCase().replace(/^r\//, ''))) }).distinct('_id');
    const filter = { $or: [{ title: re }, { bodyText: re }, { community: { $in: namedCommunities } }] };
    if (blocked.length) filter.$and = [{ community: { $nin: blocked } }];
    const { posts, hasMore } = await queryPosts({ filter, sort: req.query.sort || 'top', t: req.query.t, page, limit: 15, viewer: req.user });
    res.json({ results: posts, hasMore });
});

// ---- Drafts ----------------------------------------------------------------------

const drafts = express.Router();
drafts.use(requireAuth);

function serializeDraft(d) {
    return {
        id: d._id,
        title: d.title,
        body: d.body,
        url: d.url,
        tags: d.tags,
        media: d.media.map(m => ({ type: m.type, url: m.url })),
        community: d.community ? { name: d.community.name, icon: d.community.icon, color: d.community.color } : null,
        updatedAt: d.updatedAt
    };
}

drafts.get('/', async (req, res) => {
    const list = await Draft.find({ user: req.user._id }).sort({ updatedAt: -1 }).populate('community', 'name icon color');
    res.json({ drafts: list.map(serializeDraft) });
});

drafts.post('/', async (req, res) => {
    const { id, title = '', body = '', url = '', tags = [], media = [], community } = req.body;
    const communityDoc = community ? await Community.findOne({ nameLower: String(community).toLowerCase() }) : null;
    const data = {
        title: String(title).slice(0, 300),
        body: sanitizeBody(body),
        url: String(url).slice(0, 2000),
        tags: (Array.isArray(tags) ? tags : []).map(String).slice(0, 10),
        media: (Array.isArray(media) ? media : []).filter(m => m && String(m.url || '').startsWith('/uploads/')).slice(0, 20)
            .map(m => ({ type: m.type === 'video' ? 'video' : 'image', url: m.url })),
        community: communityDoc?._id || null
    };
    if (!data.title && !data.body && data.media.length === 0) throw new HttpError(400, 'Draft is empty');

    let draft;
    if (id && mongoose.isValidObjectId(id)) {
        draft = await Draft.findOneAndUpdate({ _id: id, user: req.user._id }, data, { returnDocument: 'after' });
    }
    if (!draft) {
        if ((await Draft.countDocuments({ user: req.user._id })) >= 50) throw new HttpError(400, 'You can keep at most 50 drafts');
        draft = await Draft.create({ ...data, user: req.user._id });
    }
    await draft.populate('community', 'name icon color');
    res.json({ draft: serializeDraft(draft) });
});

drafts.delete('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Draft not found');
    await Draft.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
});

// ---- Chats -----------------------------------------------------------------------

const chats = express.Router();
chats.use(requireAuth);

chats.get('/', async (req, res) => {
    const me = req.user._id;
    const convos = await Message.aggregate([
        { $match: { $or: [{ from: me }, { to: me }] } },
        { $sort: { createdAt: -1 } },
        { $addFields: { other: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] } } },
        {
            $group: {
                _id: '$other',
                last: { $first: '$$ROOT' },
                unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$readAt', null] }] }, 1, 0] } }
            }
        },
        { $sort: { 'last.createdAt': -1 } },
        { $limit: 50 }
    ]);
    const users = new Map((await User.find({ _id: { $in: convos.map(c => c._id) } }).select('username avatarColor displayName'))
        .map(u => [String(u._id), u]));
    res.json({
        conversations: convos.filter(c => users.has(String(c._id))).map(c => ({
            user: publicUser(users.get(String(c._id))),
            lastMessage: { text: c.last.text, fromMe: String(c.last.from) === String(me), createdAt: c.last.createdAt },
            unread: c.unread
        }))
    });
});

chats.get('/unread', async (req, res) => {
    res.json({ count: await Message.countDocuments({ to: req.user._id, readAt: null }) });
});

async function chatPartner(req) {
    const other = await User.findOne({ usernameLower: String(req.params.username).toLowerCase() });
    if (!other) throw new HttpError(404, `u/${req.params.username} doesn't exist`);
    if (other._id.equals(req.user._id)) throw new HttpError(400, "You can't chat with yourself");
    return other;
}

chats.get('/:username', async (req, res) => {
    const other = await chatPartner(req);
    const me = req.user._id;
    const messages = await Message.find({ $or: [{ from: me, to: other._id }, { from: other._id, to: me }] })
        .sort({ createdAt: -1 }).limit(200);
    await Message.updateMany({ from: other._id, to: me, readAt: null }, { readAt: new Date() });
    res.json({
        user: { ...publicUser(other), karma: other.postKarma + other.commentKarma, createdAt: other.createdAt, allowChats: other.prefs.allowChats },
        messages: messages.reverse().map(m => ({ id: m._id, text: m.text, fromMe: m.from.equals(me), createdAt: m.createdAt }))
    });
});

chats.post('/:username', async (req, res) => {
    const other = await chatPartner(req);
    const text = String(req.body.text || '').trim();
    if (!text) throw new HttpError(400, 'Message cannot be empty');
    if (!other.prefs.allowChats) throw new HttpError(403, `u/${other.username} isn't accepting chats`);
    const msg = await Message.create({ from: req.user._id, to: other._id, text: text.slice(0, 2000) });
    const hasUnreadNotice = await Notification.exists({ user: other._id, type: 'message', actor: req.user.username, read: false });
    if (!hasUnreadNotice) {
        await Notification.create({
            user: other._id, type: 'message', actor: req.user.username,
            text: `u/${req.user.username} sent you a chat message`, link: `chat:${req.user.username}`
        });
    }
    res.status(201).json({ message: { id: msg._id, text: msg.text, fromMe: true, createdAt: msg.createdAt } });
});

// ---- Notifications ---------------------------------------------------------------

const notifications = express.Router();
notifications.use(requireAuth);

notifications.get('/', async (req, res) => {
    const [list, unread] = await Promise.all([
        Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
        Notification.countDocuments({ user: req.user._id, read: false })
    ]);
    res.json({
        unread,
        notifications: list.map(n => ({ id: n._id, type: n.type, text: n.text, link: n.link, read: n.read, createdAt: n.createdAt }))
    });
});

notifications.post('/read-all', async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
});

notifications.post('/:id/read', async (req, res) => {
    if (mongoose.isValidObjectId(req.params.id)) {
        await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    }
    res.json({ ok: true });
});

// ---- Uploads ---------------------------------------------------------------------

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const EXTENSIONS = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov'
};
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[file.mimetype]}`)
    }),
    limits: { fileSize: config.uploadMaxBytes },
    fileFilter: (req, file, cb) => {
        if (EXTENSIONS[file.mimetype]) cb(null, true);
        else cb(new HttpError(400, 'Only JPG, PNG, GIF, WEBP images and MP4, WEBM, MOV videos are supported'));
    }
});

const uploads = express.Router();
uploads.post('/', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file uploaded');
    res.status(201).json({
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
        name: req.file.originalname
    });
});

module.exports = { search, drafts, chats, notifications, uploads };
