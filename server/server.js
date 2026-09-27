const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const config = require('./config');
const { optionalAuth } = require('./middleware/auth');
const { HttpError } = require('./utils/helpers');
const { seed } = require('./seed');
const { seedCompany } = require('./seed-company');

const ROOT = path.join(__dirname, '..');
const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
    // Uploaded files must never be sniffed into something executable.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ---- API -------------------------------------------------------------------------
const api = express.Router();
api.use(optionalAuth);
api.use('/auth', require('./routes/auth').router);
api.use('/posts', require('./routes/posts').router);
api.use('/comments', require('./routes/comments'));
api.use('/communities', require('./routes/communities').router);
api.use('/users', require('./routes/users'));
const misc = require('./routes/misc');
api.use('/search', misc.search);
api.use('/drafts', misc.drafts);
api.use('/chats', misc.chats);
api.use('/notifications', misc.notifications);
api.use('/uploads', misc.uploads);
const company = require('./routes/company');
api.use('/careers', company.careers);
api.use('/press', company.press);
api.get('/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
api.use((req, res, next) => next(new HttpError(404, 'API route not found')));
app.use('/api', api);

// ---- Static frontend ---------------------------------------------------------------
// Only the frontend folders are exposed; server code, node_modules and .data stay private.
for (const dir of ['css', 'js', 'components', 'assets', 'uploads']) {
    app.use(`/${dir}`, express.static(path.join(ROOT, dir), { fallthrough: false }));
}
const pages = new Set(fs.readdirSync(ROOT).filter(f => f.endsWith('.html')));
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/:page', (req, res, next) => {
    if (pages.has(req.params.page)) return res.sendFile(path.join(ROOT, req.params.page));
    next();
});
app.use((req, res) => res.status(404).sendFile(path.join(ROOT, 'page.html')));

// ---- Errors ------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err instanceof multer.MulterError) {
        status = 400;
        message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (posts allow up to 50 MB, resumes up to 5 MB)' : err.message;
    } else if (err.name === 'ValidationError' || err.name === 'CastError') {
        status = 400;
    } else if (err.code === 11000) {
        status = 409;
        message = 'That already exists';
    }
    if (status >= 500) {
        console.error(err);
        message = 'Something went wrong on our end. Please try again.';
    }
    if (req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
        return res.status(status).json({ error: message });
    }
    res.status(status).send(message);
});

async function start() {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] Connected to ${config.mongoUri}`);
    await seed();
    await seedCompany();
    app.listen(config.port, () => console.log(`[server] Reddit clone running at http://localhost:${config.port}`));
}

start().catch(err => {
    console.error('[server] Failed to start:', err.message);
    if (/ECONNREFUSED/.test(err.message)) {
        console.error('[server] Is MongoDB running? Start it with `npm run db` in another terminal.');
    }
    process.exit(1);
});
