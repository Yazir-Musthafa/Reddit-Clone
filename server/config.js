require('dotenv').config({ quiet: true });

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
    isProd,
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/reddit_clone',
    jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    jwtExpiresDays: 30,
    // When SMTP is not configured, verification codes are printed to the server
    // console and (outside production) returned to the browser so the flow still works.
    smtp: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        from: process.env.SMTP_FROM || 'Reddit Clone <no-reply@localhost>'
    } : null,
    uploadMaxBytes: 50 * 1024 * 1024
};
