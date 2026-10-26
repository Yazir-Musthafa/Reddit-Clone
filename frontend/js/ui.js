/**
 * Reusable dialogs built on the existing .reddit-modal-* styles, plus small shared actions.
 */
import { api } from './api.js';
import { authState } from './auth-state.js';
import { escapeHtml } from './utils.js';
import { openAuthModal, showToast } from './interactions.js';

const CLOSE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Opens a modal. `onMount(card, close)` wires up the body; resolves with whatever `close(value)` is given.
 */
export function openDialog({ title, subtitle = '', bodyHtml = '', wide = false, onMount }) {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'reddit-modal-backdrop ui-dialog';
        backdrop.innerHTML = `
            <div class="reddit-modal-card ${wide ? 'ui-dialog-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <button class="reddit-modal-close" data-close aria-label="Close">${CLOSE_ICON}</button>
                <h2 class="reddit-modal-title">${escapeHtml(title)}</h2>
                ${subtitle ? `<p class="reddit-modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                <div class="ui-dialog-body">${bodyHtml}</div>
            </div>`;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('active'));

        const close = (value = null) => {
            backdrop.classList.remove('active');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => backdrop.remove(), 200);
            resolve(value);
        };
        const onKey = (e) => { if (e.key === 'Escape') close(null); };
        document.addEventListener('keydown', onKey);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop || e.target.closest('[data-close]')) close(null);
        });
        onMount?.(backdrop.querySelector('.reddit-modal-card'), close);
    });
}

export function confirmDialog(message, { title = 'Are you sure?', confirmLabel = 'Confirm', danger = false } = {}) {
    return openDialog({
        title,
        bodyHtml: `
            <p class="ui-dialog-text">${escapeHtml(message)}</p>
            <div class="ui-dialog-actions">
                <button class="ui-btn ui-btn-secondary" data-close>Cancel</button>
                <button class="ui-btn ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}" data-confirm>${escapeHtml(confirmLabel)}</button>
            </div>`,
        onMount: (card, close) => {
            card.querySelector('[data-confirm]').onclick = () => close(true);
        }
    }).then(Boolean);
}

/**
 * Generic form dialog. `fields` = [{ name, label, type, value, placeholder, options, maxlength }].
 * `onSubmit(values)` may throw to show an inline error; its return value resolves the dialog.
 */
export function formDialog({ title, subtitle, fields, submitLabel = 'Save', onSubmit, wide = false }) {
    const fieldHtml = fields.map(f => {
        const id = `ui-field-${f.name}`;
        const common = `id="${id}" name="${f.name}" ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} ${f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : ''}`;
        let input;
        if (f.type === 'textarea') {
            input = `<textarea class="ui-input ui-textarea" ${common} rows="${f.rows || 4}">${escapeHtml(f.value || '')}</textarea>`;
        } else if (f.type === 'select') {
            input = `<select class="ui-input" ${common}>${f.options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === f.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>`;
        } else if (f.type === 'checkboxes') {
            input = `<div class="ui-checkbox-list" id="${id}">${f.options.map(o => `
                <label class="ui-checkbox-row"><input type="checkbox" name="${f.name}" value="${escapeHtml(o.value)}" ${o.checked ? 'checked' : ''}> ${o.html || escapeHtml(o.label)}</label>`).join('') || '<p class="ui-muted">Nothing to choose yet.</p>'}</div>`;
        } else if (f.type === 'color') {
            input = `<input type="color" class="ui-color" ${common} value="${escapeHtml(f.value || '#FF4500')}">`;
        } else {
            input = `<input type="${f.type || 'text'}" class="ui-input" ${common} value="${escapeHtml(f.value || '')}" autocomplete="off">`;
        }
        return `<label class="ui-field-label" for="${id}">${escapeHtml(f.label)}</label>${input}${f.hint ? `<p class="ui-muted">${escapeHtml(f.hint)}</p>` : ''}`;
    }).join('');

    return openDialog({
        title, subtitle, wide,
        bodyHtml: `
            <form class="ui-form" novalidate>
                ${fieldHtml}
                <p class="ui-error hidden" data-error></p>
                <div class="ui-dialog-actions">
                    <button type="button" class="ui-btn ui-btn-secondary" data-close>Cancel</button>
                    <button type="submit" class="ui-btn ui-btn-primary">${escapeHtml(submitLabel)}</button>
                </div>
            </form>`,
        onMount: (card, close) => {
            const form = card.querySelector('form');
            const errorEl = card.querySelector('[data-error]');
            form.querySelector('input:not([type=checkbox]), textarea')?.focus();
            form.onsubmit = async (e) => {
                e.preventDefault();
                const values = {};
                fields.forEach(f => {
                    if (f.type === 'checkboxes') {
                        values[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map(i => i.value);
                    } else {
                        values[f.name] = form.elements[f.name].value;
                    }
                });
                const submit = form.querySelector('[type=submit]');
                submit.disabled = true;
                errorEl.classList.add('hidden');
                try {
                    close(await onSubmit(values));
                } catch (err) {
                    errorEl.textContent = err.message;
                    errorEl.classList.remove('hidden');
                    submit.disabled = false;
                }
            };
        }
    });
}

const REPORT_REASONS = ['Spam', 'Harassment', 'Hate', 'Misinformation', 'Sharing personal information', 'Breaks community rules', 'Self-harm or suicide', 'Other'];

export function reportDialog(targetType, id) {
    const endpoint = targetType === 'Post' ? `/posts/${id}/report` : `/comments/${id}/report`;
    return openDialog({
        title: `Report ${targetType.toLowerCase()}`,
        subtitle: 'Thanks for looking out for yourself and your fellow redditors.',
        bodyHtml: `
            <div class="ui-reason-list">${REPORT_REASONS.map(r => `<button class="topic-pill-btn ui-reason" data-reason="${r}">${r}</button>`).join('')}</div>
            <div class="ui-dialog-actions">
                <button class="ui-btn ui-btn-secondary" data-close>Cancel</button>
                <button class="ui-btn ui-btn-primary" data-submit disabled>Submit report</button>
            </div>`,
        onMount: (card, close) => {
            let reason = '';
            const submit = card.querySelector('[data-submit]');
            card.querySelectorAll('.ui-reason').forEach(btn => {
                btn.onclick = () => {
                    card.querySelectorAll('.ui-reason').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    reason = btn.dataset.reason;
                    submit.disabled = false;
                };
            });
            submit.onclick = async () => {
                submit.disabled = true;
                try {
                    await api.post(endpoint, { reason });
                    showToast('Thanks for reporting. Moderators will review it.');
                    close(true);
                } catch (err) {
                    showToast(err.message);
                    submit.disabled = false;
                }
            };
        }
    });
}

/** Returns true when logged in; otherwise opens the login modal. */
export function requireLogin() {
    if (authState.getState().isLoggedIn) return true;
    openAuthModal('Log In');
    return false;
}

/** Toggles membership in a community; returns { joined, memberCount } or null on failure. */
export async function toggleJoin(community) {
    if (!requireLogin()) return null;
    try {
        const result = await api.post(`/communities/${encodeURIComponent(community.name)}/join`);
        authState.markJoined(community, result.joined);
        showToast(result.joined ? `Joined r/${community.name}` : `Left r/${community.name}`);
        document.dispatchEvent(new CustomEvent('community:membership', { detail: { name: community.name, ...result } }));
        return result;
    } catch (err) {
        showToast(err.message);
        return null;
    }
}

/** Keeps every Join button for a community in sync after a join/leave anywhere on the page. */
document.addEventListener('community:membership', (e) => {
    const { name, joined } = e.detail;
    document.querySelectorAll(`[data-join-community="${CSS.escape(name)}"]`).forEach(btn => {
        btn.classList.toggle('joined', joined);
        btn.textContent = joined ? 'Joined' : 'Join';
    });
});
