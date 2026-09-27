const sanitizeHtml = require('sanitize-html');

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Rich-text post bodies come from a contenteditable editor, so only a safe subset is kept.
function sanitizeBody(html = '') {
    return sanitizeHtml(String(html), {
        allowedTags: ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 's', 'strike', 'del', 'sup', 'sub',
            'h1', 'h2', 'h3', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a',
            'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        allowedAttributes: { a: ['href', 'target', 'rel'] },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' })
        }
    }).trim();
}

function htmlToText(html = '') {
    return sanitizeHtml(String(html), { allowedTags: [], allowedAttributes: {} })
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeUrl(url = '') {
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(withScheme);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return parsed.toString();
    } catch {
        throw new HttpError(400, 'That link is not a valid URL');
    }
}

// Reddit's classic "hot" formula: log-scaled score plus a time bonus.
function hotRank(score, createdAt) {
    const order = Math.log10(Math.max(Math.abs(score), 1));
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
    const seconds = new Date(createdAt).getTime() / 1000 - 1134028003;
    return Number((sign * order + seconds / 45000).toFixed(7));
}

function applyRanks(post) {
    post.hotScore = hotRank(post.score, post.createdAt || new Date());
    post.bestScore = hotRank(post.score + post.commentCount * 2, post.createdAt || new Date());
}

function escapeRegex(str = '') {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
const COMMUNITY_RE = /^[A-Za-z0-9_]{3,21}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function publicUser(user) {
    if (!user) return { username: '[deleted]', avatarColor: '#828F9A' };
    return {
        id: user._id,
        username: user.username,
        displayName: user.displayName || '',
        avatarColor: user.avatarColor
    };
}

function publicCommunity(c, viewer) {
    if (!c) return null;
    const joined = !!viewer && viewer.joinedCommunities.some(id => id.equals(c._id));
    const isMod = !!viewer && (c.moderators || []).some(m => (m._id || m).equals(viewer._id));
    return {
        id: c._id,
        name: c.name,
        description: c.description,
        topic: c.topic,
        type: c.type,
        mature: c.mature,
        icon: c.icon,
        color: c.color,
        bannerColor: c.bannerColor,
        memberCount: c.memberCount,
        createdAt: c.createdAt,
        joined,
        isMod
    };
}

module.exports = {
    HttpError, sanitizeBody, htmlToText, normalizeUrl, hotRank, applyRanks, escapeRegex,
    USERNAME_RE, COMMUNITY_RE, EMAIL_RE, COLOR_RE, publicUser, publicCommunity
};
