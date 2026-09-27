const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
if (config.smtp) {
    transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.auth
    });
}

/**
 * Sends a verification code. Returns the code when it could not be emailed
 * (dev mode, no SMTP configured) so the UI can display it; returns null when emailed.
 */
async function sendCode(email, code, purpose) {
    const subjects = {
        signup: 'Verify your email',
        login: 'Your one-time log in code',
        reset: 'Reset your password'
    };
    const text = `Your Reddit Clone code is ${code}. It expires in 10 minutes.`;

    if (transporter) {
        await transporter.sendMail({ from: config.smtp.from, to: email, subject: subjects[purpose], text });
        return null;
    }

    console.log(`[mail:dev] ${subjects[purpose]} -> ${email}: ${code}`);
    if (config.isProd) {
        throw new Error('Email delivery is not configured (set SMTP_HOST)');
    }
    return code;
}

module.exports = { sendCode, emailConfigured: !!transporter };
