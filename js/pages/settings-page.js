import { initShell } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { showToast, openAuthModal } from '../interactions.js';
import { confirmDialog } from '../ui.js';
import { isDarkMode, toggleDisplayMode } from '../display-mode.js';
import { escapeHtml, getParam, userAvatar, writeLocal } from '../utils.js';

const TABS = { account: 'Account', profile: 'Profile', preferences: 'Preferences' };
const SWATCHES = ['#FF87A2', '#FF4500', '#FFB000', '#46D160', '#0DD3BB', '#0079D3', '#7193FF', '#9B59B6', '#1A1A1B'];

document.addEventListener('DOMContentLoaded', async () => {
    const { isLoggedIn } = await initShell();
    const container = document.getElementById('feed-container');
    if (!isLoggedIn) {
        container.innerHTML = '<div class="rc-empty-state"><h3>Log in to manage your settings</h3><button class="ui-btn ui-btn-primary" id="settingsLoginBtn">Log In</button></div>';
        document.getElementById('settingsLoginBtn').onclick = () => openAuthModal('Log In');
        return;
    }

    const initial = TABS[getParam('tab')] ? getParam('tab') : 'account';
    container.innerHTML = `
        <div class="rc-settings-page">
            <h1 class="rc-view-title">Settings</h1>
            <nav class="rc-tabs" role="tablist">
                ${Object.entries(TABS).map(([k, v]) => `<button class="rc-tab ${k === initial ? 'active' : ''}" data-tab="${k}" role="tab">${v}</button>`).join('')}
            </nav>
            <div id="settingsContent"></div>
        </div>`;
    container.querySelectorAll('.rc-tab').forEach(tab => {
        tab.onclick = () => {
            container.querySelectorAll('.rc-tab').forEach(t => t.classList.toggle('active', t === tab));
            window.history.replaceState({}, '', `settings.html?tab=${tab.dataset.tab}`);
            renderTab(tab.dataset.tab);
        };
    });
    renderTab(initial);
});

function renderTab(tab) {
    const content = document.getElementById('settingsContent');
    ({ account: renderAccount, profile: renderProfile, preferences: renderPreferences })[tab](content);
}

function formSection({ id, title, description, fields, submitLabel, danger = false }) {
    return `
        <form class="rc-settings-section" id="${id}" novalidate>
            <h2>${title}</h2>
            ${description ? `<p class="rc-muted-text">${description}</p>` : ''}
            ${fields}
            <p class="ui-error hidden" data-error></p>
            <div class="ui-dialog-actions"><button type="submit" class="ui-btn ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}">${submitLabel}</button></div>
        </form>`;
}

function bindForm(form, handler) {
    const error = form.querySelector('[data-error]');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        error.classList.add('hidden');
        try {
            await handler(Object.fromEntries(new FormData(form)));
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hidden');
        } finally {
            submit.disabled = false;
        }
    };
}

function renderAccount(content) {
    const user = authState.user;
    content.innerHTML = `
        ${formSection({
            id: 'emailForm', title: 'Email address', description: `Currently <strong>${escapeHtml(user.email)}</strong>`,
            submitLabel: 'Change email',
            fields: `
                <label class="ui-field-label" for="newEmail">New email</label>
                <input class="ui-input" type="email" name="email" id="newEmail" autocomplete="email" required>
                <label class="ui-field-label" for="emailPassword">Current password</label>
                <input class="ui-input" type="password" name="password" id="emailPassword" autocomplete="current-password" required>`
        })}
        ${formSection({
            id: 'passwordForm', title: 'Password', description: 'Use at least 8 characters.',
            submitLabel: 'Change password',
            fields: `
                <label class="ui-field-label" for="currentPassword">Current password</label>
                <input class="ui-input" type="password" name="currentPassword" id="currentPassword" autocomplete="current-password" required>
                <label class="ui-field-label" for="newPassword">New password</label>
                <input class="ui-input" type="password" name="newPassword" id="newPassword" autocomplete="new-password" minlength="8" required>
                <label class="ui-field-label" for="confirmPassword">Confirm new password</label>
                <input class="ui-input" type="password" name="confirmPassword" id="confirmPassword" autocomplete="new-password" minlength="8" required>`
        })}
        ${formSection({
            id: 'deleteForm', title: 'Delete account', danger: true,
            description: 'Deleting your account is permanent. Your posts and comments stay up but show as [deleted].',
            submitLabel: 'Delete account',
            fields: `
                <label class="ui-field-label" for="deletePassword">Password</label>
                <input class="ui-input" type="password" name="password" id="deletePassword" autocomplete="current-password" required>`
        })}`;

    bindForm(content.querySelector('#emailForm'), async ({ email, password }) => {
        const { user: updated } = await api.post('/users/me/email', { email, password });
        authState.setUser(updated);
        showToast('Email updated');
        renderAccount(content);
    });
    bindForm(content.querySelector('#passwordForm'), async ({ currentPassword, newPassword, confirmPassword }) => {
        if (newPassword !== confirmPassword) throw new Error("New passwords don't match");
        await api.post('/users/me/password', { currentPassword, newPassword });
        showToast('Password changed');
        content.querySelector('#passwordForm').reset();
    });
    bindForm(content.querySelector('#deleteForm'), async ({ password }) => {
        if (!password) throw new Error('Enter your password to confirm');
        const ok = await confirmDialog('This permanently deletes your account. Are you absolutely sure?', { title: 'Delete account?', confirmLabel: 'Delete forever', danger: true });
        if (!ok) return;
        await api.del('/users/me', { password });
        showToast('Your account was deleted');
        window.location.href = 'index.html';
    });
}

function renderProfile(content) {
    const user = authState.user;
    const draft = { avatarColor: user.avatarColor, bannerColor: user.bannerColor };
    content.innerHTML = formSection({
        id: 'profileForm', title: 'Profile', description: 'This is how others see you on Reddit.',
        submitLabel: 'Save profile',
        fields: `
            <div class="rc-avatar-editor">
                <div class="rc-avatar-preview" id="avatarPreview">
                    <div class="rc-avatar-preview-banner no-invert" id="bannerPreview" style="background-color:${escapeHtml(user.bannerColor)}"></div>
                    <div class="rc-avatar-preview-img" id="avatarPreviewImg">${userAvatar(user, 72)}</div>
                </div>
                <div>
                    <span class="ui-field-label">Avatar color</span>
                    <div class="rc-swatches" id="avatarSwatches">
                        ${SWATCHES.map(c => `<button type="button" class="rc-swatch no-invert ${c === user.avatarColor ? 'selected' : ''}" style="background:${c}" data-color="${c}" aria-label="Avatar color ${c}"></button>`).join('')}
                        <input type="color" class="ui-color" id="avatarColorInput" value="${escapeHtml(user.avatarColor)}" aria-label="Custom avatar color">
                    </div>
                    <label class="ui-field-label" for="bannerColorInput">Banner color</label>
                    <input type="color" class="ui-color" id="bannerColorInput" value="${escapeHtml(user.bannerColor)}">
                </div>
            </div>
            <label class="ui-field-label" for="displayName">Display name</label>
            <input class="ui-input" name="displayName" id="displayName" maxlength="30" value="${escapeHtml(user.displayName)}" placeholder="${escapeHtml(user.username)}">
            <label class="ui-field-label" for="bio">About (bio)</label>
            <textarea class="ui-input ui-textarea" name="bio" id="bio" maxlength="200" rows="3" placeholder="A little about yourself">${escapeHtml(user.bio)}</textarea>`
    });

    const setAvatar = (color) => {
        draft.avatarColor = color.toUpperCase();
        content.querySelector('#avatarPreviewImg').innerHTML = userAvatar({ avatarColor: draft.avatarColor }, 72);
        content.querySelectorAll('.rc-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === draft.avatarColor));
        content.querySelector('#avatarColorInput').value = draft.avatarColor;
    };
    content.querySelectorAll('.rc-swatch').forEach(s => { s.onclick = () => setAvatar(s.dataset.color); });
    content.querySelector('#avatarColorInput').oninput = (e) => setAvatar(e.target.value);
    content.querySelector('#bannerColorInput').oninput = (e) => {
        draft.bannerColor = e.target.value.toUpperCase();
        content.querySelector('#bannerPreview').style.backgroundColor = draft.bannerColor;
    };

    bindForm(content.querySelector('#profileForm'), async ({ displayName, bio }) => {
        const { user: updated } = await api.patch('/users/me', { displayName, bio, ...draft });
        authState.setUser(updated);
        document.getElementById('headerAvatar').innerHTML = userAvatar(updated, 32);
        document.getElementById('dropdownAvatar').innerHTML = userAvatar(updated, 36);
        showToast('Profile saved');
    });
}

function renderPreferences(content) {
    const prefs = authState.user.prefs;
    const toggle = (id, label, description, checked) => `
        <label class="rc-pref-row" for="${id}">
            <span><strong>${label}</strong><small>${description}</small></span>
            <span class="toggle-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></span>
        </label>`;
    content.innerHTML = `
        <div class="rc-settings-section">
            <h2>Preferences</h2>
            ${toggle('prefDark', 'Dark mode', 'Saved in this browser.', isDarkMode())}
            ${toggle('prefMod', 'Mod mode', 'Show moderator actions (remove posts/comments) in communities you moderate.', prefs.modMode)}
            ${toggle('prefMature', 'Show mature (18+) content', 'Include 18+ communities in feeds, search and explore.', prefs.showMature)}
            ${toggle('prefChats', 'Allow chat requests', 'Let other redditors start chats with you.', prefs.allowChats)}
            <label class="rc-pref-row" for="prefView">
                <span><strong>Default feed view</strong><small>How posts are laid out in feeds.</small></span>
                <select class="rc-inline-select" id="prefView">
                    <option value="card" ${prefs.defaultView === 'card' ? 'selected' : ''}>Card</option>
                    <option value="compact" ${prefs.defaultView === 'compact' ? 'selected' : ''}>Compact</option>
                </select>
            </label>
        </div>`;

    content.querySelector('#prefDark').onchange = () => toggleDisplayMode();
    const save = async (patch, input, label) => {
        try {
            const { user } = await api.patch('/users/me', { prefs: patch });
            authState.setUser(user);
            showToast(`${label} saved`);
        } catch (err) {
            if (input.type === 'checkbox') input.checked = !input.checked;
            showToast(err.message);
        }
    };
    content.querySelector('#prefMod').onchange = (e) => save({ modMode: e.target.checked }, e.target, 'Mod mode');
    content.querySelector('#prefMature').onchange = (e) => save({ showMature: e.target.checked }, e.target, 'Mature content preference');
    content.querySelector('#prefChats').onchange = (e) => save({ allowChats: e.target.checked }, e.target, 'Chat preference');
    content.querySelector('#prefView').onchange = (e) => {
        writeLocal('rc_view', e.target.value);
        save({ defaultView: e.target.value }, e.target, 'Default view');
    };
}
