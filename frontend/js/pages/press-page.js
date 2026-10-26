import { initShell } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { showToast } from '../interactions.js';
import { escapeHtml, getParam, formatDate, formatNumber, copyToClipboard, absoluteUrl } from '../utils.js';

const BRAND_COLORS = [
    { name: 'OrangeRed', hex: '#FF4500' },
    { name: 'Periwinkle', hex: '#7193FF' },
    { name: 'Dark', hex: '#1A1A1B' },
    { name: 'Light Grey', hex: '#F6F7F8' }
];
const ASSETS = [
    { file: 'assets/brand/logo-light.svg', label: 'Logo (light background)' },
    { file: 'assets/brand/logo-dark.svg', label: 'Logo (dark background)' },
    { file: 'assets/brand/icon.svg', label: 'Snoo icon' }
];

const container = () => document.getElementById('feed-container');

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    route();
    window.addEventListener('popstate', route);
});

function route() {
    const slug = getParam('release');
    if (slug) renderRelease(slug);
    else renderHome();
}

function navigate(url) {
    window.history.pushState({}, '', url);
    container().scrollTop = 0;
    route();
}

function renderHome() {
    document.title = 'Press - Reddit';
    container().innerHTML = `
        <div class="rc-company-page">
            <section class="rc-company-hero rc-hero-press no-invert">
                <h1>Press</h1>
                <p>News, facts and brand assets for journalists writing about Reddit.</p>
                <a class="ui-btn rc-hero-btn" href="#mediaInquiry">Contact the press team</a>
            </section>

            <section>
                <h2 class="rc-section-heading">Reddit by the numbers</h2>
                <div class="rc-stat-grid" id="pressStats"><div class="rc-spinner"></div></div>
                <p class="rc-muted-text">Live figures from this site's database.</p>
            </section>

            <section>
                <h2 class="rc-section-heading">Latest news</h2>
                <div class="rc-chip-row" id="releaseCategories"></div>
                <div id="releaseList"><div class="rc-spinner"></div></div>
                <div class="rc-feed-status" id="releaseMore"></div>
            </section>

            <section>
                <h2 class="rc-section-heading">Brand assets</h2>
                <div class="rc-asset-grid">
                    ${ASSETS.map(a => `
                        <div class="rc-asset-card">
                            <div class="rc-asset-preview no-invert"><img src="${a.file}" alt="${escapeHtml(a.label)}"></div>
                            <strong>${escapeHtml(a.label)}</strong>
                            <a class="ui-btn ui-btn-secondary" href="${a.file}" download>Download SVG</a>
                        </div>`).join('')}
                </div>
                <div class="rc-color-row">
                    ${BRAND_COLORS.map(c => `
                        <button class="rc-color-chip" data-hex="${c.hex}" title="Copy ${c.hex}">
                            <span class="no-invert" style="background:${c.hex}"></span>${c.name}<small>${c.hex}</small>
                        </button>`).join('')}
                </div>
            </section>

            <section id="mediaInquiry" class="rc-settings-section">
                <h2>Media inquiries</h2>
                <p class="rc-muted-text">Working on a story? Send us the details and we'll get back to you, usually within one business day.</p>
                <form id="inquiryForm" class="ui-form" novalidate>
                    <div class="rc-form-grid">
                        <div><label class="ui-field-label" for="inqName">Your name *</label>
                            <input class="ui-input" id="inqName" name="name" maxlength="100" required value="${escapeHtml(authState.user?.displayName || '')}"></div>
                        <div><label class="ui-field-label" for="inqEmail">Email *</label>
                            <input class="ui-input" id="inqEmail" name="email" type="email" required value="${escapeHtml(authState.user?.email || '')}"></div>
                        <div><label class="ui-field-label" for="inqOutlet">Publication / outlet *</label>
                            <input class="ui-input" id="inqOutlet" name="outlet" maxlength="150" required></div>
                        <div><label class="ui-field-label" for="inqDeadline">Deadline</label>
                            <input class="ui-input" id="inqDeadline" name="deadline" type="date"></div>
                    </div>
                    <label class="ui-field-label" for="inqTopic">Topic *</label>
                    <input class="ui-input" id="inqTopic" name="topic" maxlength="150" required>
                    <label class="ui-field-label" for="inqMessage">Message *</label>
                    <textarea class="ui-input ui-textarea" id="inqMessage" name="message" rows="5" maxlength="5000" required></textarea>
                    <p class="ui-error hidden" id="inqError"></p>
                    <div class="ui-dialog-actions" style="justify-content:flex-start">
                        <button type="submit" class="ui-btn ui-btn-primary">Send inquiry</button>
                    </div>
                </form>
            </section>
        </div>`;

    loadStats();
    loadReleases();
    bindColors();
    bindInquiry();
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
}

async function loadStats() {
    const el = document.getElementById('pressStats');
    try {
        const s = await api.get('/press/stats');
        el.innerHTML = [['Redditors', s.users], ['Communities', s.communities], ['Posts', s.posts], ['Comments', s.comments]]
            .map(([label, n]) => `<div class="rc-stat"><strong>${formatNumber(n)}</strong><span>${label}</span></div>`).join('');
    } catch (err) {
        el.innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
    }
}

function loadReleases() {
    let category = '';
    let page = 0;
    const list = document.getElementById('releaseList');
    const more = document.getElementById('releaseMore');
    const chips = document.getElementById('releaseCategories');

    const load = async (reset) => {
        if (reset) {
            page = 0;
            list.innerHTML = '';
        }
        try {
            const { releases, categories, hasMore } = await api.get(`/press/releases?page=${page}${category ? `&category=${encodeURIComponent(category)}` : ''}`);
            page += 1;
            if (!chips.children.length) {
                chips.innerHTML = ['', ...categories].map(c => `<button class="explore-tab-pill ${c === category ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c || 'All')}</button>`).join('');
                chips.querySelectorAll('[data-category]').forEach(chip => {
                    chip.onclick = () => {
                        category = chip.dataset.category;
                        chips.querySelectorAll('[data-category]').forEach(c => c.classList.toggle('active', c === chip));
                        load(true);
                    };
                });
            }
            list.querySelector('.rc-spinner')?.remove();
            list.insertAdjacentHTML('beforeend', releases.map(r => `
                <a class="rc-release-row" href="press.html?release=${encodeURIComponent(r.slug)}" data-slug="${escapeHtml(r.slug)}">
                    <span class="rc-release-meta"><span class="rc-badge">${escapeHtml(r.category)}</span> ${formatDate(r.publishedAt)}</span>
                    <strong>${escapeHtml(r.title)}</strong>
                    <p>${escapeHtml(r.summary)}</p>
                </a>`).join('') || '<p class="rc-muted-text">No press releases yet.</p>');
            list.querySelectorAll('.rc-release-row').forEach(row => {
                row.onclick = (e) => {
                    e.preventDefault();
                    navigate(`press.html?release=${encodeURIComponent(row.dataset.slug)}`);
                };
            });
            more.innerHTML = hasMore ? '<button class="ui-btn ui-btn-secondary">Load more</button>' : '';
            more.querySelector('button')?.addEventListener('click', () => load(false));
        } catch (err) {
            list.innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
        }
    };
    load(true);
}

function bindColors() {
    document.querySelectorAll('.rc-color-chip').forEach(chip => {
        chip.onclick = async () => {
            showToast((await copyToClipboard(chip.dataset.hex)) ? `Copied ${chip.dataset.hex}` : "Couldn't copy the colour");
        };
    });
}

function bindInquiry() {
    const form = document.getElementById('inquiryForm');
    const error = document.getElementById('inqError');
    form.onsubmit = async (e) => {
        e.preventDefault();
        error.classList.add('hidden');
        const values = Object.fromEntries(new FormData(form));
        const missing = [['name', 'your name'], ['email', 'your email'], ['outlet', 'your publication'], ['topic', 'a topic'], ['message', 'a message']]
            .find(([key]) => !String(values[key] || '').trim());
        if (missing) {
            error.textContent = `Please enter ${missing[1]}`;
            error.classList.remove('hidden');
            return;
        }
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.textContent = 'Sending…';
        try {
            const { reference } = await api.post('/press/inquiries', values);
            document.getElementById('mediaInquiry').innerHTML = `
                <div class="rc-success-box">
                    <span class="rc-success-icon">📨</span>
                    <div><strong>Thanks, your inquiry was sent.</strong>
                    <p>Your reference number is <strong>${escapeHtml(reference)}</strong>. We'll reply to ${escapeHtml(values.email)}.</p></div>
                </div>`;
            showToast('Inquiry sent');
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hidden');
            submit.disabled = false;
            submit.textContent = 'Send inquiry';
        }
    };
}

async function renderRelease(slug) {
    container().innerHTML = '<div class="rc-spinner"></div>';
    try {
        const { release } = await api.get(`/press/releases/${encodeURIComponent(slug)}`);
        document.title = `${release.title} - Press - Reddit`;
        container().innerHTML = `
            <div class="rc-company-page">
                <a class="rc-back-link" href="press.html" id="backToPress">← All press releases</a>
                <article class="rc-info-page">
                    <p class="rc-release-meta"><span class="rc-badge">${escapeHtml(release.category)}</span> ${formatDate(release.publishedAt)}</p>
                    <h1>${escapeHtml(release.title)}</h1>
                    <p class="rc-release-lede">${escapeHtml(release.summary)}</p>
                    ${release.body}
                    <div class="ui-dialog-actions" style="justify-content:flex-start">
                        <button class="ui-btn ui-btn-secondary" id="copyReleaseLink">Copy link</button>
                        <a class="ui-btn ui-btn-primary" href="press.html#mediaInquiry">Contact the press team</a>
                    </div>
                </article>
            </div>`;
        document.getElementById('backToPress').onclick = (e) => {
            e.preventDefault();
            navigate('press.html');
        };
        document.getElementById('copyReleaseLink').onclick = async () => {
            showToast((await copyToClipboard(absoluteUrl(`press.html?release=${release.slug}`))) ? 'Link copied!' : "Couldn't copy the link");
        };
    } catch (err) {
        container().innerHTML = `<div class="rc-empty-state"><h3>${escapeHtml(err.message)}</h3><a class="ui-btn ui-btn-primary" href="press.html">Back to Press</a></div>`;
    }
}
