const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { HttpError } = require('../utils/helpers');

const COOKIE_NAME = 'rc_token';

function setAuthCookie(res, user) {
    const token = jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: `${config.jwtExpiresDays}d` });
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: config.jwtExpiresDays * 24 * 60 * 60 * 1000
    });
}

function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: config.isProd });
}

// Attaches req.user when a valid session cookie is present; never rejects.
async function optionalAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
        try {
            const payload = jwt.verify(token, config.jwtSecret);
            req.user = await User.findById(payload.sub);
        } catch {
            clearAuthCookie(res);
        }
    }
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) return next(new HttpError(401, 'You need to log in to do that'));
    next();
}

// Minimal fixed-window rate limiter for auth endpoints.
function rateLimit({ windowMs, max }) {
    const hits = new Map();
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        const entry = hits.get(key);
        if (!entry || now - entry.start > windowMs) {
            hits.set(key, { start: now, count: 1 });
            return next();
        }
        entry.count += 1;
        if (entry.count > max) return next(new HttpError(429, 'Too many attempts. Please wait a minute and try again.'));
        next();
    };
}

module.exports = { optionalAuth, requireAuth, setAuthCookie, clearAuthCookie, rateLimit };
