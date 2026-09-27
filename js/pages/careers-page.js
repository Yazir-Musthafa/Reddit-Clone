import { initShell } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { showToast } from '../interactions.js';
import { confirmDialog } from '../ui.js';
import { escapeHtml, getParam, debounce, formatDate, timeAgo, copyToClipboard, absoluteUrl } from '../utils.js';

const VALUES = [
    { icon: '🧡', title: 'Community first', text: 'We build for the people who make Reddit what it is.' },
    { icon: '🔭', title: 'Stay curious', text: 'Ask questions, share what you learn, and follow the interesting thread.' },
    { icon: '🤝', title: 'Own it together', text: 'Small teams with big scope, and a culture of helping each other ship.' }
];
const BENEFITS = ['Remote-friendly roles', 'Health, dental and vision cover', 'Learning & conference budget', 'Generous parental leave', 'Home office stipend', 'Flexible time off'];

const container = () => document.getElementById('feed-container');

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    route();
    window.addEventListener('popstate', route);
});

function route() {
    const slug = getParam('job');
    if (slug) renderJob(slug);
    else renderList();
}

function navigate(url) {
    window.history.pushState({}, '', url);
    container().scrollTop = 0;
    route();
}

// ---- Job list ----------------------------------------------------------------------

async function renderList() {
    document.title = 'Careers - Reddit';
    const { isLoggedIn } = authState.getState();
    container().innerHTML = `
        <div class="rc-company-page">
            <section class="rc-company-hero rc-hero-careers no-invert">
                <h1>Build the front page of the internet</h1>
                <p>Join the team behind the communities, conversations and moments that bring people together.</p>
                <a class="ui-btn rc-hero-btn" href="#openRoles">View open roles</a>
            </section>

            <section class="rc-value-grid">
                ${VALUES.map(v => `<div class="rc-value-card"><span class="rc-value-icon">${v.icon}</span><strong>${v.title}</strong><p>${v.text}</p></div>`).join('')}
            </section>

            ${isLoggedIn ? '<section id="myApplications"></section>' : ''}

            <section id="openRoles">
                <h2 class="rc-section-heading">Open roles</h2>
                <div class="rc-job-filters">
                    <input class="ui-input" id="jobSearch" type="search" placeholder="Search roles" value="${escapeHtml(getParam('q') || '')}" aria-label="Search roles">
                    <select class="ui-input" id="jobDepartment" aria-label="Department"><option value="">All departments</option></select>
                    <select class="ui-input" id="jobLocation" aria-label="Location"><option value="">All locations</option></select>
                    <label class="ui-checkbox-row rc-remote-toggle"><input type="checkbox" id="jobRemote"> Remote only</label>
                </div>
                <p class="rc-muted-text" id="jobCount"></p>
                <div id="jobList"><div class="rc-spinner"></div></div>
            </section>

            <section class="rc-benefits">
                <h2 class="rc-section-heading">Benefits</h2>
                <ul>${BENEFITS.map(b => `<li>✓ ${b}</li>`).join('')}</ul>
            </section>
        </div>`;

    if (isLoggedIn) loadMyApplications();

    const search = document.getElementById('jobSearch');
    const department = document.getElementById('jobDepartment');
    const location = document.getElementById('jobLocation');
    const remote = document.getElementById('jobRemote');
    let optionsFilled = false;

    const load = async () => {
        const params = new URLSearchParams();
        if (search.value.trim()) params.set('q', search.value.trim());
        if (department.value) params.set('department', department.value);
        if (location.value) params.set('location', location.value);
        if (remote.checked) params.set('remote', 'true');
        try {
            const { jobs, departments, locations } = await api.get(`/careers/jobs?${params}`);
            if (!optionsFilled) {
                department.insertAdjacentHTML('beforeend', departments.map(d => `<option>${escapeHtml(d)}</option>`).join(''));
                location.insertAdjacentHTML('beforeend', locations.map(l => `<option>${escapeHtml(l)}</option>`).join(''));
                optionsFilled = true;
            }
            renderJobs(jobs);
        } catch (err) {
            document.getElementById('jobList').innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
        }
    };

    search.addEventListener('input', debounce(load, 250));
    [department, location, remote].forEach(el => el.addEventListener('change', load));
    load();
}

function renderJobs(jobs) {
    document.getElementById('jobCount').textContent = `${jobs.length} open role${jobs.length === 1 ? '' : 's'}`;
    const list = document.getElementById('jobList');
    if (!jobs.length) {
        list.innerHTML = '<div class="rc-empty-state rc-empty-small"><h3>No roles match those filters</h3><p>Try a different search or clear the filters.</p></div>';
        return;
    }
    const byDept = jobs.reduce((acc, j) => ((acc[j.department] ||= []).push(j), acc), {});
    list.innerHTML = Object.entries(byDept).map(([dept, items]) => `
        <div class="rc-job-group">
            <h3>${escapeHtml(dept)}</h3>
            ${items.map(j => `
                <a class="rc-job-row" href="careers.html?job=${encodeURIComponent(j.slug)}" data-slug="${escapeHtml(j.slug)}">
                    <span class="rc-job-title">${escapeHtml(j.title)}</span>
                    <span class="rc-job-meta">📍 ${escapeHtml(j.location)} • ${escapeHtml(j.type)}${j.remote ? ' • <span class="rc-badge">Remote</span>' : ''}</span>
                </a>`).join('')}
        </div>`).join('');
    list.querySelectorAll('.rc-job-row').forEach(row => {
        row.onclick = (e) => {
            e.preventDefault();
            navigate(`careers.html?job=${encodeURIComponent(row.dataset.slug)}`);
        };
    });
}

async function loadMyApplications() {
    const section = document.getElementById('myApplications');
    try {
        const { applications } = await api.get('/careers/applications');
        if (!applications.length) {
            section.innerHTML = '';
            return;
        }
        section.innerHTML = `
            <h2 class="rc-section-heading">My applications</h2>
            <div class="rc-application-list">
                ${applications.map(a => `
                    <div class="rc-application-row">
                        <div>
                            <a href="careers.html?job=${encodeURIComponent(a.job.slug)}" class="rc-job-title">${escapeHtml(a.job.title)}</a>
                            <span class="rc-job-meta">${escapeHtml(a.job.department)} • ${escapeHtml(a.job.location)} • applied ${timeAgo(a.appliedAt)} • ${escapeHtml(a.resumeName)}</span>
                        </div>
                        <span class="rc-badge rc-status">${escapeHtml(a.status)}</span>
                        <button class="ui-btn ui-btn-secondary" data-withdraw="${a.id}">Withdraw</button>
                    </div>`).join('')}
            </div>`;
        section.querySelectorAll('[data-withdraw]').forEach(btn => {
            btn.onclick = async () => {
                if (!(await confirmDialog('Withdraw this application? Your resume will be deleted.', { title: 'Withdraw application?', confirmLabel: 'Withdraw', danger: true }))) return;
                try {
                    await api.del(`/careers/applications/${btn.dataset.withdraw}`);
                    showToast('Application withdrawn');
                    loadMyApplications();
                } catch (err) {
                    showToast(err.message);
                }
            };
        });
    } catch {
        section.innerHTML = '';
    }
}

// ---- Job detail & application ------------------------------------------------------------

async function renderJob(slug) {
    container().innerHTML = '<div class="rc-spinner"></div>';
    let job;
    let appliedAt;
    try {
        ({ job, appliedAt } = await api.get(`/careers/jobs/${encodeURIComponent(slug)}`));
    } catch (err) {
        container().innerHTML = `<div class="rc-empty-state"><h3>${escapeHtml(err.message)}</h3><a class="ui-btn ui-btn-primary" href="careers.html">See all open roles</a></div>`;
        return;
    }
    document.title = `${job.title} - Careers - Reddit`;
    const user = authState.user;

    container().innerHTML = `
        <div class="rc-company-page">
            <a class="rc-back-link" href="careers.html" id="backToJobs">← All open roles</a>
            <header class="rc-job-header">
                <span class="rc-muted-text">${escapeHtml(job.department)}</span>
                <h1>${escapeHtml(job.title)}</h1>
                <p class="rc-job-meta">📍 ${escapeHtml(job.location)} • ${escapeHtml(job.type)}${job.remote ? ' • <span class="rc-badge">Remote</span>' : ''} • Posted ${formatDate(job.postedAt)}</p>
                <div class="ui-dialog-actions" style="justify-content:flex-start">
                    <a class="ui-btn ui-btn-primary" href="#applySection">Apply now</a>
                    <button class="ui-btn ui-btn-secondary" id="shareJobBtn">Share</button>
                </div>
            </header>

            <div class="rc-info-page rc-job-body">
                <p>${escapeHtml(job.summary)}</p>
                <h2>What you'll do</h2>
                <ul>${job.responsibilities.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
                <h2>What we're looking for</h2>
                <ul>${job.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
            </div>

            <section id="applySection" class="rc-settings-section">
                ${appliedAt ? appliedHtml(appliedAt) : `
                <h2>Apply for this role</h2>
                <form id="applyForm" class="ui-form" novalidate>
                    <div class="rc-form-grid">
                        <div><label class="ui-field-label" for="applyName">Full name *</label>
                            <input class="ui-input" id="applyName" name="name" maxlength="100" required value="${escapeHtml(user?.displayName || '')}" autocomplete="name"></div>
                        <div><label class="ui-field-label" for="applyEmail">Email *</label>
                            <input class="ui-input" id="applyEmail" name="email" type="email" required value="${escapeHtml(user?.email || '')}" autocomplete="email"></div>
                        <div><label class="ui-field-label" for="applyPhone">Phone</label>
                            <input class="ui-input" id="applyPhone" name="phone" type="tel" maxlength="40" autocomplete="tel"></div>
                        <div><label class="ui-field-label" for="applyLinkedin">LinkedIn or portfolio URL</label>
                            <input class="ui-input" id="applyLinkedin" name="linkedin" type="url" maxlength="300" placeholder="https://"></div>
                    </div>
                    <label class="ui-field-label" for="applyResume">Resume * (PDF or Word, up to 5 MB)</label>
                    <input class="rc-file-input" id="applyResume" name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>
                    <label class="ui-field-label" for="applyCover">Cover letter</label>
                    <textarea class="ui-input ui-textarea" id="applyCover" name="coverLetter" rows="6" maxlength="5000" placeholder="Tell us why you're excited about this role"></textarea>
                    <p class="ui-error hidden" id="applyError"></p>
                    <div class="ui-dialog-actions" style="justify-content:flex-start">
                        <button type="submit" class="ui-btn ui-btn-primary">Submit application</button>
                    </div>
                </form>`}
            </section>
        </div>`;

    document.getElementById('backToJobs').onclick = (e) => {
        e.preventDefault();
        navigate('careers.html');
    };
    document.getElementById('shareJobBtn').onclick = async () => {
        showToast((await copyToClipboard(absoluteUrl(`careers.html?job=${job.slug}`))) ? 'Job link copied!' : "Couldn't copy the link");
    };

    const form = document.getElementById('applyForm');
    if (!form) return;
    const error = document.getElementById('applyError');
    form.onsubmit = async (e) => {
        e.preventDefault();
        error.classList.add('hidden');
        const resume = form.elements.resume.files[0];
        const problem = !form.elements.name.value.trim() ? 'Please enter your name'
            : !form.elements.email.value.includes('@') ? 'Please enter a valid email address'
            : !resume ? 'Please attach your resume'
            : resume.size > 5 * 1024 * 1024 ? 'Your resume must be 5 MB or smaller'
            : '';
        if (problem) {
            error.textContent = problem;
            error.classList.remove('hidden');
            return;
        }
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.textContent = 'Submitting…';
        try {
            const result = await api.post(`/careers/jobs/${encodeURIComponent(job.slug)}/apply`, new FormData(form));
            document.getElementById('applySection').innerHTML = appliedHtml(result.appliedAt, true);
            showToast('Application submitted!');
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hidden');
            submit.disabled = false;
            submit.textContent = 'Submit application';
        }
    };
}

function appliedHtml(appliedAt, justNow = false) {
    return `
        <div class="rc-success-box">
            <span class="rc-success-icon">✅</span>
            <div>
                <strong>${justNow ? 'Thanks, your application is in!' : 'You applied for this role'}</strong>
                <p>Submitted ${formatDate(appliedAt)}. ${authState.getState().isLoggedIn ? 'Track it under “My applications” on the Careers page.' : 'We\'ll be in touch by email.'}</p>
            </div>
        </div>`;
}
