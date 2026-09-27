const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Community = require('../models/Community');
const { VerificationCode } = require('../models/misc');
const { setAuthCookie, clearAuthCookie, rateLimit } = require('../middleware/auth');
const { HttpError, USERNAME_RE, EMAIL_RE } = require('../utils/helpers');
const { computeAchievements } = require('../utils/achievements');
const { sendCode } = require('../utils/mailer');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const INTEREST_TOPICS = {
    Art: ['Art'],
    Beauty: ['Fashion & Beauty'],
    Career: ['Education & Career'],
    Entertainment: ['Movies & TV', 'Pop Culture'],
    Finance: ['Business & Finance'],
    Food: ['Food & Drinks'],
    Gaming: ['Games'],
    News: ['News & Politics'],
    Sports: ['Sports'],
    Technology: ['Technology'],
    Travel: ['Places & Travel'],
    Wellness: ['Wellness', 'Health']
};

const ADJECTIVES = ['Fantastic', 'Curious', 'Pixel', 'Starry', 'Cosmic', 'Bold', 'Quiet', 'Lucky', 'Clever', 'Brave', 'Sunny', 'Witty'];
const NOUNS = ['Series', 'Explorer', 'Artisan', 'Voyager', 'Dev', 'Adventurer', 'Otter', 'Panda', 'Comet', 'Falcon', 'Maple', 'River'];

async function selfUser(user) {
    await user.populate('joinedCommunities', 'name icon color memberCount');
    await user.populate('customFeeds.communities', 'name icon color');
    const achievements = await computeAchievements(user);
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarColor: user.avatarColor,
        bannerColor: user.bannerColor,
        postKarma: user.postKarma,
        commentKarma: user.commentKarma,
        karma: user.postKarma + user.commentKarma,
        createdAt: user.createdAt,
        prefs: user.prefs,
        interests: user.interests,
        joinedCommunities: user.joinedCommunities.filter(Boolean).map(c => ({
            id: c._id, name: c.name, icon: c.icon, color: c.color, memberCount: c.memberCount
        })),
        customFeeds: user.customFeeds.map(f => ({
            id: f._id, name: f.name, description: f.description,
            communities: f.communities.filter(Boolean).map(c => ({ id: c._id, name: c.name, icon: c.icon, color: c.color }))
        })),
        achievementsUnlocked: achievements.unlocked
    };
}

function findByIdentifier(identifier) {
    const value = String(identifier || '').trim();
    if (value.includes('@')) return User.findOne({ email: value.toLowerCase() });
    return User.findOne({ usernameLower: value.toLowerCase() });
}

async function issueCode(email, purpose) {
    const code = String(crypto.randomInt(100000, 1000000));
    await VerificationCode.deleteMany({ email, purpose });
    await VerificationCode.create({ email, purpose, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    return sendCode(email, code, purpose);
}

async function consumeCode(email, purpose, code, { requireVerified = false } = {}) {
    const record = await VerificationCode.findOne({ email, purpose });
    if (!record || record.expiresAt < new Date()) throw new HttpError(400, 'That code has expired. Request a new one.');
    if (requireVerified && record.verified && record.code === String(code)) return record;
    if (record.attempts >= 5) throw new HttpError(429, 'Too many wrong attempts. Request a new code.');
    if (record.code !== String(code).trim()) {
        record.attempts += 1;
        await record.save();
        throw new HttpError(400, 'That code is incorrect');
    }
    return record;
}

router.get('/me', async (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: await selfUser(req.user) });
});

router.get('/suggest-username', async (req, res) => {
    for (let i = 0; i < 20; i++) {
        const name = `${ADJECTIVES[crypto.randomInt(ADJECTIVES.length)]}-${NOUNS[crypto.randomInt(NOUNS.length)]}${crypto.randomInt(10, 9999)}`;
        if (!(await User.exists({ usernameLower: name.toLowerCase() }))) return res.json({ username: name });
    }
    res.json({ username: `Redditor-${Date.now().toString(36)}` });
});

router.get('/check-username', async (req, res) => {
    const username = String(req.query.username || '').trim();
    if (!USERNAME_RE.test(username)) {
        return res.json({ available: false, message: 'Usernames must be 3-20 characters: letters, numbers, - or _' });
    }
    const taken = await User.exists({ usernameLower: username.toLowerCase() });
    res.json({ available: !taken, message: taken ? 'That username is already taken' : "Great name! It's not taken, so it's all yours." });
});

router.post('/request-code', limiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const purpose = req.body.purpose;
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    if (!['signup', 'login', 'reset'].includes(purpose)) throw new HttpError(400, 'Invalid request');

    const exists = await User.exists({ email });
    if (purpose === 'signup' && exists) throw new HttpError(409, 'That email is already registered. Try logging in.');
    if (purpose === 'login' && !exists) throw new HttpError(404, 'No account uses that email');
    // For password resets we don't reveal whether the email exists.
    if (purpose === 'reset' && !exists) return res.json({ ok: true });

    const devCode = await issueCode(email, purpose);
    res.json({ ok: true, devCode: devCode || undefined });
});

router.post('/verify-code', limiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const record = await consumeCode(email, 'signup', req.body.code);
    record.verified = true;
    await record.save();
    res.json({ ok: true });
});

router.post('/signup', limiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const { code, gender = '', interests = [], topics = [] } = req.body;

    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Usernames must be 3-20 characters: letters, numbers, - or _');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    const record = await consumeCode(email, 'signup', code, { requireVerified: true });
    if (await User.exists({ email })) throw new HttpError(409, 'That email is already registered');
    if (await User.exists({ usernameLower: username.toLowerCase() })) throw new HttpError(409, 'That username is already taken');

    const safeInterests = (Array.isArray(interests) ? interests : []).filter(i => INTEREST_TOPICS[i]).slice(0, 12);
    const topicNames = safeInterests.flatMap(i => INTEREST_TOPICS[i]);
    const starter = topicNames.length
        ? await Community.find({ topic: { $in: topicNames }, type: { $ne: 'Private' }, mature: false }).sort({ memberCount: -1 }).limit(8)
        : await Community.find({ type: 'Public', mature: false }).sort({ memberCount: -1 }).limit(5);

    const user = await User.create({
        username,
        usernameLower: username.toLowerCase(),
        email,
        passwordHash: await bcrypt.hash(password, 10),
        gender: String(gender).slice(0, 40),
        interests: safeInterests,
        topics: (Array.isArray(topics) ? topics : []).map(t => String(t).slice(0, 60)).slice(0, 30),
        avatarColor: ['#FF87A2', '#FF4500', '#0079D3', '#46D160', '#FFB000', '#7193FF'][crypto.randomInt(6)],
        joinedCommunities: starter.map(c => c._id)
    });
    await Community.updateMany({ _id: { $in: starter.map(c => c._id) } }, { $inc: { memberCount: 1 } });
    await record.deleteOne();

    setAuthCookie(res, user);
    res.status(201).json({ user: await selfUser(user) });
});

router.post('/login', limiter, async (req, res) => {
    const user = await findByIdentifier(req.body.identifier);
    const ok = user && await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
    if (!ok) throw new HttpError(401, 'Incorrect username or password');
    setAuthCookie(res, user);
    res.json({ user: await selfUser(user) });
});

router.post('/login-code', limiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const record = await consumeCode(email, 'login', req.body.code);
    const user = await User.findOne({ email });
    if (!user) throw new HttpError(404, 'No account uses that email');
    await record.deleteOne();
    setAuthCookie(res, user);
    res.json({ user: await selfUser(user) });
});

router.post('/reset-password', limiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    const record = await consumeCode(email, 'reset', req.body.code);
    const user = await User.findOne({ email });
    if (!user) throw new HttpError(400, 'That code is incorrect');
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await record.deleteOne();
    setAuthCookie(res, user);
    res.json({ user: await selfUser(user) });
});

router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
});

module.exports = { router, selfUser };
