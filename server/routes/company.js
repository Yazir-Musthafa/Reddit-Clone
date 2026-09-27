const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('../models/User');
const Community = require('../models/Community');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { Job, JobApplication, PressRelease, PressInquiry } = require('../models/company');
const { requireAuth, rateLimit } = require('../middleware/auth');
const { HttpError, EMAIL_RE, escapeRegex, normalizeUrl } = require('../utils/helpers');

const limiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

function requiredText(value, label, max) {
    const text = String(value || '').trim();
    if (!text) throw new HttpError(400, `Please enter your ${label}`);
    if (text.length > max) throw new HttpError(400, `${label.charAt(0).toUpperCase() + label.slice(1)} must be at most ${max} characters`);
    return text;
}

function validEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    return email;
}

// ---- Careers -------------------------------------------------------------------------

const RESUME_DIR = path.join(__dirname, '..', '..', '.data', 'resumes');
fs.mkdirSync(RESUME_DIR, { recursive: true });
const RESUME_TYPES = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};
const resumeUpload = multer({
    storage: multer.diskStorage({
        destination: RESUME_DIR,
        filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${RESUME_TYPES[file.mimetype]}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (RESUME_TYPES[file.mimetype]) cb(null, true);
        else cb(new HttpError(400, 'Resumes must be a PDF or Word document'));
    }
});

function publicJob(job) {
    return {
        id: job._id,
        slug: job.slug,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        remote: job.remote,
        summary: job.summary,
        responsibilities: job.responsibilities,
        requirements: job.requirements,
        postedAt: job.createdAt
    };
}

const careers = express.Router();

careers.get('/jobs', async (req, res) => {
    const { q, department, location, remote } = req.query;
    const filter = { open: true };
    if (department) filter.department = department;
    if (location) filter.location = location;
    if (remote === 'true') filter.remote = true;
    if (q) {
        const re = new RegExp(escapeRegex(String(q).trim()), 'i');
        filter.$or = [{ title: re }, { summary: re }, { department: re }];
    }
    const [jobs, departments, locations] = await Promise.all([
        Job.find(filter).sort({ department: 1, title: 1 }),
        Job.find({ open: true }).distinct('department'),
        Job.find({ open: true }).distinct('location')
    ]);
    res.json({ jobs: jobs.map(publicJob), departments: departments.sort(), locations: locations.sort() });
});

careers.get('/jobs/:slug', async (req, res) => {
    const job = await Job.findOne({ slug: req.params.slug, open: true });
    if (!job) throw new HttpError(404, 'This job is no longer open');
    const application = req.user
        ? await JobApplication.findOne({ job: job._id, $or: [{ user: req.user._id }, { email: req.user.email }] })
        : null;
    res.json({ job: publicJob(job), appliedAt: application?.createdAt || null });
});

careers.post('/jobs/:slug/apply', limiter, resumeUpload.single('resume'), async (req, res) => {
    const removeUpload = () => req.file && fs.promises.unlink(req.file.path).catch(() => {});
    try {
        const job = await Job.findOne({ slug: req.params.slug, open: true });
        if (!job) throw new HttpError(404, 'This job is no longer open');

        const name = requiredText(req.body.name, 'name', 100);
        const email = validEmail(req.body.email);
        const linkedin = String(req.body.linkedin || '').trim() ? normalizeUrl(req.body.linkedin) : '';
        const coverLetter = String(req.body.coverLetter || '').trim().slice(0, 5000);
        if (!req.file) throw new HttpError(400, 'Please attach your resume (PDF or Word)');

        if (await JobApplication.exists({ job: job._id, email })) {
            throw new HttpError(409, 'You have already applied for this role with that email');
        }
        const application = await JobApplication.create({
            job: job._id,
            user: req.user?._id || null,
            name,
            email,
            phone: String(req.body.phone || '').trim().slice(0, 40),
            linkedin,
            coverLetter,
            resumeFile: req.file.filename,
            resumeName: req.file.originalname.slice(0, 200)
        });
        console.log(`[careers] New application for "${job.title}" from ${email}`);
        res.status(201).json({ ok: true, applicationId: application._id, appliedAt: application.createdAt });
    } catch (err) {
        removeUpload();
        throw err;
    }
});

careers.get('/applications', requireAuth, async (req, res) => {
    const list = await JobApplication.find({ $or: [{ user: req.user._id }, { email: req.user.email }] })
        .sort({ createdAt: -1 })
        .populate('job', 'title slug department location');
    res.json({
        applications: list.filter(a => a.job).map(a => ({
            id: a._id,
            job: { title: a.job.title, slug: a.job.slug, department: a.job.department, location: a.job.location },
            status: a.status,
            resumeName: a.resumeName,
            appliedAt: a.createdAt
        }))
    });
});

careers.delete('/applications/:id', requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Application not found');
    const application = await JobApplication.findOne({
        _id: req.params.id,
        $or: [{ user: req.user._id }, { email: req.user.email }]
    });
    if (!application) throw new HttpError(404, 'Application not found');
    if (application.resumeFile) await fs.promises.unlink(path.join(RESUME_DIR, application.resumeFile)).catch(() => {});
    await application.deleteOne();
    res.json({ ok: true });
});

// ---- Press ---------------------------------------------------------------------------

const press = express.Router();

press.get('/releases', async (req, res) => {
    const page = Math.max(Number(req.query.page) || 0, 0);
    const filter = req.query.category ? { category: req.query.category } : {};
    const [releases, categories] = await Promise.all([
        PressRelease.find(filter).sort({ publishedAt: -1 }).skip(page * 10).limit(11),
        PressRelease.distinct('category')
    ]);
    res.json({
        releases: releases.slice(0, 10).map(r => ({ slug: r.slug, title: r.title, summary: r.summary, category: r.category, publishedAt: r.publishedAt })),
        categories: categories.sort(),
        hasMore: releases.length > 10
    });
});

press.get('/releases/:slug', async (req, res) => {
    const release = await PressRelease.findOne({ slug: req.params.slug });
    if (!release) throw new HttpError(404, 'Press release not found');
    res.json({ release: { slug: release.slug, title: release.title, summary: release.summary, body: release.body, category: release.category, publishedAt: release.publishedAt } });
});

// Live numbers for the fact sheet.
press.get('/stats', async (req, res) => {
    const [users, communities, posts, comments] = await Promise.all([
        User.estimatedDocumentCount(),
        Community.countDocuments({ type: { $ne: 'Private' } }),
        Post.countDocuments({ removed: false }),
        Comment.countDocuments({ deleted: false })
    ]);
    res.json({ users, communities, posts, comments });
});

press.post('/inquiries', limiter, async (req, res) => {
    const deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    if (deadline && Number.isNaN(deadline.getTime())) throw new HttpError(400, 'That deadline is not a valid date');
    const inquiry = await PressInquiry.create({
        name: requiredText(req.body.name, 'name', 100),
        email: validEmail(req.body.email),
        outlet: requiredText(req.body.outlet, 'publication or outlet', 150),
        topic: requiredText(req.body.topic, 'topic', 150),
        message: requiredText(req.body.message, 'message', 5000),
        deadline
    });
    console.log(`[press] New media inquiry from ${inquiry.email} (${inquiry.outlet})`);
    res.status(201).json({ ok: true, reference: String(inquiry._id).slice(-8).toUpperCase() });
});

module.exports = { careers, press };
