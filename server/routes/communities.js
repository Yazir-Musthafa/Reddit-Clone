const express = require('express');
const Community = require('../models/Community');
const User = require('../models/User');
const Post = require('../models/Post');
const { Notification } = require('../models/misc');
const { requireAuth } = require('../middleware/auth');
const { HttpError, COMMUNITY_RE, COLOR_RE, escapeRegex, publicCommunity, publicUser } = require('../utils/helpers');
const { canView, canPost, isMember } = require('../utils/access');

const router = express.Router();

const TOPICS = ['Anime & Cosplay', 'Art', 'Business & Finance', 'Collectibles & Other Hobbies', 'Education & Career',
    'Fashion & Beauty', 'Food & Drinks', 'Games', 'Health', 'Home & Garden', 'Humanities & Law',
    'Identity & Relationships', 'Internet Culture', 'Movies & TV', 'Music', 'Nature & Outdoors', 'News & Politics',
    'Places & Travel', 'Pop Culture', 'Q&As & Stories', 'Reading & Writing', 'Sciences', 'Spooky', 'Sports',
    'Technology', 'Vehicles', 'Wellness', 'Adult Content', 'Mature Topics'];

async function loadCommunity(name) {
    const community = await Community.findOne({ nameLower: String(name || '').toLowerCase() });
    if (!community) throw new HttpError(404, `r/${name} doesn't exist`);
    return community;
}

function requireMod(community, user) {
    if (!isMember(community.moderators, user)) throw new HttpError(403, 'Only moderators can do that');
}

async function detail(community, viewer) {
    await community.populate('moderators', 'username avatarColor displayName');
    await community.populate('creator', 'username');
    const isMod = isMember(community.moderators, viewer);
    const [postCount, weekPosts] = await Promise.all([
        Post.countDocuments({ community: community._id, removed: false }),
        Post.countDocuments({ community: community._id, removed: false, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
    ]);
    const approved = isMod ? await User.find({ _id: { $in: community.approvedUsers } }).select('username') : [];
    return {
        ...publicCommunity(community, viewer),
        isMod,
        canView: canView(community, viewer),
        canPost: canPost(community, viewer),
        creator: community.creator?.username || null,
        moderators: community.moderators.map(publicUser),
        approvedUsers: approved.map(u => u.username),
        rules: community.rules.map(r => ({ title: r.title, description: r.description })),
        postCount,
        weeklyPosts: weekPosts
    };
}

router.get('/topics', (req, res) => res.json({ topics: TOPICS }));

router.get('/', async (req, res) => {
    const { topic, q, sort = 'members', limit = 20, page = 0 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const filter = { type: { $ne: 'Private' } };
    if (topic) filter.topic = topic;
    if (q) filter.nameLower = new RegExp(escapeRegex(String(q).toLowerCase()));
    if (!req.user?.prefs?.showMature) filter.mature = false;

    const communities = await Community.find(filter)
        .sort(sort === 'new' ? { createdAt: -1 } : { memberCount: -1, name: 1 })
        .skip((Number(page) || 0) * safeLimit)
        .limit(safeLimit + 1);
    res.json({
        communities: communities.slice(0, safeLimit).map(c => publicCommunity(c, req.user)),
        hasMore: communities.length > safeLimit
    });
});

router.get('/check-name', async (req, res) => {
    const name = String(req.query.name || '').trim();
    if (!COMMUNITY_RE.test(name)) {
        return res.json({ available: false, message: 'Names must be 3-21 characters: letters, numbers or underscores' });
    }
    const taken = await Community.exists({ nameLower: name.toLowerCase() });
    res.json({ available: !taken, message: taken ? `r/${name} is already taken` : '' });
});

router.get('/:name', async (req, res) => {
    const community = await loadCommunity(req.params.name);
    res.json({ community: await detail(community, req.user) });
});

router.post('/', requireAuth, async (req, res) => {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const { topic = 'Internet Culture', type = 'Public', mature = false } = req.body;

    if (!COMMUNITY_RE.test(name)) throw new HttpError(400, 'Community names must be 3-21 characters: letters, numbers or underscores');
    if (!description) throw new HttpError(400, 'Please add a description');
    if (!TOPICS.includes(topic)) throw new HttpError(400, 'Please pick a topic');
    if (!['Public', 'Restricted', 'Private'].includes(type)) throw new HttpError(400, 'Invalid community type');
    if (await Community.exists({ nameLower: name.toLowerCase() })) throw new HttpError(409, `r/${name} is already taken`);

    const community = await Community.create({
        name,
        nameLower: name.toLowerCase(),
        description: description.slice(0, 500),
        topic,
        type,
        mature: !!mature || ['Adult Content', 'Mature Topics'].includes(topic),
        icon: name.charAt(0).toUpperCase(),
        color: '#FF4500',
        bannerColor: '#FF87A2',
        memberCount: 1,
        creator: req.user._id,
        moderators: [req.user._id],
        rules: [
            { title: 'Be respectful', description: 'Treat others the way you would like to be treated.' },
            { title: 'Stay on topic', description: `Posts should relate to r/${name}.` }
        ]
    });
    req.user.joinedCommunities.push(community._id);
    await req.user.save();
    res.status(201).json({ community: await detail(community, req.user) });
});

router.patch('/:name', requireAuth, async (req, res) => {
    const community = await loadCommunity(req.params.name);
    requireMod(community, req.user);
    const { description, icon, color, bannerColor, topic, type, mature, rules } = req.body;

    if (description !== undefined) community.description = String(description).trim().slice(0, 500);
    if (icon !== undefined) community.icon = String(icon).trim().slice(0, 4);
    if (color !== undefined) {
        if (!COLOR_RE.test(color)) throw new HttpError(400, 'Colors must be hex values like #FF4500');
        community.color = color;
    }
    if (bannerColor !== undefined) {
        if (!COLOR_RE.test(bannerColor)) throw new HttpError(400, 'Colors must be hex values like #FF4500');
        community.bannerColor = bannerColor;
    }
    if (topic !== undefined) {
        if (!TOPICS.includes(topic)) throw new HttpError(400, 'Please pick a topic');
        community.topic = topic;
    }
    if (type !== undefined) {
        if (!['Public', 'Restricted', 'Private'].includes(type)) throw new HttpError(400, 'Invalid community type');
        community.type = type;
    }
    if (mature !== undefined) community.mature = !!mature;
    if (Array.isArray(rules)) {
        community.rules = rules
            .filter(r => r && String(r.title || '').trim())
            .slice(0, 15)
            .map(r => ({ title: String(r.title).trim().slice(0, 100), description: String(r.description || '').trim().slice(0, 500) }));
    }
    await community.save();
    res.json({ community: await detail(community, req.user) });
});

router.post('/:name/join', requireAuth, async (req, res) => {
    const community = await loadCommunity(req.params.name);
    const idx = req.user.joinedCommunities.findIndex(id => id.equals(community._id));
    let joined;
    if (idx >= 0) {
        req.user.joinedCommunities.splice(idx, 1);
        joined = false;
    } else {
        if (community.type === 'Private' && !canView(community, req.user)) {
            throw new HttpError(403, 'This community is private. Ask a moderator to approve you.');
        }
        req.user.joinedCommunities.push(community._id);
        joined = true;
    }
    await req.user.save();
    const updated = await Community.findByIdAndUpdate(
        community._id,
        { $inc: { memberCount: joined ? 1 : -1 } },
        { returnDocument: 'after' }
    );
    res.json({ joined, memberCount: Math.max(updated.memberCount, 0) });
});

async function findUserByName(username) {
    const user = await User.findOne({ usernameLower: String(username || '').trim().toLowerCase() });
    if (!user) throw new HttpError(404, `u/${username} doesn't exist`);
    return user;
}

router.post('/:name/approved', requireAuth, async (req, res) => {
    const community = await loadCommunity(req.params.name);
    requireMod(community, req.user);
    const user = await findUserByName(req.body.username);
    if (!isMember(community.approvedUsers, user)) {
        community.approvedUsers.push(user._id);
        await community.save();
        await Notification.create({
            user: user._id, type: 'community', actor: req.user.username,
            text: `You were approved to post in r/${community.name}`, link: `community.html?name=${community.name}`
        });
    }
    res.json({ community: await detail(community, req.user) });
});

router.delete('/:name/approved/:username', requireAuth, async (req, res) => {
    const community = await loadCommunity(req.params.name);
    requireMod(community, req.user);
    const user = await findUserByName(req.params.username);
    community.approvedUsers = community.approvedUsers.filter(id => !id.equals(user._id));
    await community.save();
    res.json({ community: await detail(community, req.user) });
});

router.post('/:name/moderators', requireAuth, async (req, res) => {
    const community = await loadCommunity(req.params.name);
    requireMod(community, req.user);
    const user = await findUserByName(req.body.username);
    if (!isMember(community.moderators, user)) {
        community.moderators.push(user._id);
        await community.save();
        await Notification.create({
            user: user._id, type: 'community', actor: req.user.username,
            text: `You are now a moderator of r/${community.name}`, link: `community.html?name=${community.name}`
        });
    }
    res.json({ community: await detail(community, req.user) });
});

module.exports = { router, TOPICS };
