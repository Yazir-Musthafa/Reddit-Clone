import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { useAuth } from './AuthContext.jsx';
import { usePage } from './usePage.js';
import { Markup, renderMarkup } from './render.jsx';
import FormSection, { FormField } from './forms/FormSection.jsx';
import { validateAccount, validateProfile } from './forms/validation.mjs';
import { initShell } from '../js/shell.js';
import { api } from '../js/api.js';
import { authState } from '../js/auth-state.js';
import { showToast, openAuthModal } from '../js/interactions.js';
import { confirmDialog } from '../js/ui.js';
import { isDarkMode, toggleDisplayMode } from '../js/display-mode.js';
import { userAvatar, writeLocal } from '../js/utils.js';

const TABS = { account: 'Account', profile: 'Profile', preferences: 'Preferences' };
const SWATCHES = ['#FF87A2', '#FF4500', '#FFB000', '#46D160', '#0DD3BB', '#0079D3', '#7193FF', '#9B59B6', '#1A1A1B'];

export function AccountSettings() {
    const { user } = useAuth();
    return <>
        <FormSection id="emailForm" title="Email address" description={<>Currently <strong>{user.email}</strong></>} submitLabel="Change email"
            initialValues={{ email: '', password: '' }} validate={values => validateAccount('email', values)} resetOnSuccess
            onSubmit={async ({ email, password }) => {
                const { user: updated } = await api.post('/users/me/email', { email: email.trim(), password });
                authState.setUser(updated); showToast('Email updated');
            }}>
            {form => <>
                <FormField form={form} id="newEmail" name="email" label="New email" type="email" autoComplete="email" required />
                <FormField form={form} id="emailPassword" name="password" label="Current password" type="password" autoComplete="current-password" required />
            </>}
        </FormSection>
        <FormSection id="passwordForm" title="Password" description="Use at least 8 characters." submitLabel="Change password"
            initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }} validate={values => validateAccount('password', values)} resetOnSuccess
            onSubmit={async ({ currentPassword, newPassword }) => {
                await api.post('/users/me/password', { currentPassword, newPassword }); showToast('Password changed');
            }}>
            {form => <>
                <FormField form={form} id="currentPassword" name="currentPassword" label="Current password" type="password" autoComplete="current-password" required />
                <FormField form={form} id="newPassword" name="newPassword" label="New password" type="password" autoComplete="new-password" minLength={8} required />
                <FormField form={form} id="confirmPassword" name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" minLength={8} required />
            </>}
        </FormSection>
        <FormSection id="deleteForm" title="Delete account" danger description="Deleting your account is permanent. Your posts and comments stay up but show as [deleted]." submitLabel="Delete account"
            initialValues={{ password: '' }} validate={values => validateAccount('delete', values)}
            onSubmit={async ({ password }) => {
                if (!await confirmDialog('This permanently deletes your account. Are you absolutely sure?', { title: 'Delete account?', confirmLabel: 'Delete forever', danger: true })) return false;
                await api.del('/users/me', { password }); showToast('Your account was deleted'); window.location.href = 'index.html';
            }}>
            {form => <FormField form={form} id="deletePassword" name="password" label="Password" type="password" autoComplete="current-password" required />}
        </FormSection>
    </>;
}

export function ProfileSettings() {
    const { user } = useAuth();
    return <FormSection id="profileForm" title="Profile" description="This is how others see you on Reddit." submitLabel="Save profile"
        initialValues={{ displayName: user.displayName, bio: user.bio, avatarColor: user.avatarColor, bannerColor: user.bannerColor }} validate={validateProfile}
        onSubmit={async values => {
            const { user: updated } = await api.patch('/users/me', values);
            authState.setUser(updated);
            renderMarkup(document.getElementById('headerAvatar'), userAvatar(updated, 32));
            renderMarkup(document.getElementById('dropdownAvatar'), userAvatar(updated, 36));
            showToast('Profile saved');
        }}>
        {form => <>
            <div className="rc-avatar-editor">
                <div className="rc-avatar-preview" id="avatarPreview">
                    <div className="rc-avatar-preview-banner no-invert" id="bannerPreview" style={{ backgroundColor: form.values.bannerColor }} />
                    <div className="rc-avatar-preview-img" id="avatarPreviewImg"><Markup html={userAvatar({ avatarColor: form.values.avatarColor }, 72)} /></div>
                </div>
                <div>
                    <span className="ui-field-label">Avatar color</span>
                    <div className="rc-swatches" id="avatarSwatches">
                        {SWATCHES.map(color => <button key={color} type="button" className={`rc-swatch no-invert ${color === form.values.avatarColor ? 'selected' : ''}`} style={{ background: color }} data-color={color} aria-label={`Avatar color ${color}`} aria-pressed={color === form.values.avatarColor} onClick={() => form.change('avatarColor', color)} />)}
                        <input type="color" className="ui-color" id="avatarColorInput" value={form.values.avatarColor} aria-label="Custom avatar color" onChange={e => form.change('avatarColor', e.target.value.toUpperCase())} />
                    </div>
                    <label className="ui-field-label" htmlFor="bannerColorInput">Banner color</label>
                    <input type="color" className="ui-color" id="bannerColorInput" value={form.values.bannerColor} onChange={e => form.change('bannerColor', e.target.value.toUpperCase())} />
                </div>
            </div>
            <FormField form={form} id="displayName" name="displayName" label="Display name" maxLength={30} placeholder={user.username} />
            <FormField form={form} id="bio" name="bio" label="About (bio)" maxLength={200} rows={3} placeholder="A little about yourself" multiline />
        </>}
    </FormSection>;
}

export function PreferenceToggle({ id, label, description, checked, onChange, disabled = false }) {
    return <label className="rc-pref-row" htmlFor={id}>
        <span><strong>{label}</strong><small>{description}</small></span>
        <span className="toggle-switch"><input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} /><span className="toggle-slider" /></span>
    </label>;
}

export function PreferencesSettings() {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState(user.prefs);
    const [dark, setDark] = useState(isDarkMode);
    const [pending, setPending] = useState(false);
    async function save(patch, label) {
        const previous = prefs;
        setPrefs(current => ({ ...current, ...patch })); setPending(true);
        try {
            const { user: updated } = await api.patch('/users/me', { prefs: patch });
            authState.setUser(updated); setPrefs(updated.prefs);
            if (patch.defaultView) writeLocal('rc_view', patch.defaultView);
            showToast(`${label} saved`);
        } catch (error) { setPrefs(previous); showToast(error.message); }
        finally { setPending(false); }
    }
    return <div className="rc-settings-section">
        <h2>Preferences</h2>
        <PreferenceToggle id="prefDark" label="Dark mode" description="Saved in this browser." checked={dark} onChange={() => setDark(toggleDisplayMode())} />
        <PreferenceToggle id="prefMod" label="Mod mode" description="Show moderator actions (remove posts/comments) in communities you moderate." checked={prefs.modMode} disabled={pending} onChange={value => save({ modMode: value }, 'Mod mode')} />
        <PreferenceToggle id="prefMature" label="Show mature (18+) content" description="Include 18+ communities in feeds, search and explore." checked={prefs.showMature} disabled={pending} onChange={value => save({ showMature: value }, 'Mature content preference')} />
        <PreferenceToggle id="prefChats" label="Allow chat requests" description="Let other redditors start chats with you." checked={prefs.allowChats} disabled={pending} onChange={value => save({ allowChats: value }, 'Chat preference')} />
        <label className="rc-pref-row" htmlFor="prefView">
            <span><strong>Default feed view</strong><small>How posts are laid out in feeds.</small></span>
            <select className="rc-inline-select" id="prefView" value={prefs.defaultView} disabled={pending} onChange={e => save({ defaultView: e.target.value }, 'Default view')}>
                <option value="card">Card</option><option value="compact">Compact</option>
            </select>
        </label>
    </div>;
}

function Settings() {
    const { isLoggedIn } = useAuth();
    const [params, setParams] = useSearchParams();
    const tab = Object.hasOwn(TABS, params.get('tab')) ? params.get('tab') : 'account';
    if (!isLoggedIn) return <div className="rc-empty-state"><h3>Log in to manage your settings</h3><button className="ui-btn ui-btn-primary" id="settingsLoginBtn" onClick={() => openAuthModal('Log In')}>Log In</button></div>;
    return <div className="rc-settings-page">
        <h1 className="rc-view-title">Settings</h1>
        <nav className="rc-tabs" role="tablist" aria-label="Settings">
            {Object.entries(TABS).map(([key, label]) => <button key={key} className={`rc-tab ${key === tab ? 'active' : ''}`} data-tab={key} role="tab" aria-selected={key === tab} onClick={() => setParams({ tab: key })}>{label}</button>)}
        </nav>
        <div id="settingsContent">{tab === 'profile' ? <ProfileSettings /> : tab === 'preferences' ? <PreferencesSettings /> : <AccountSettings />}</div>
    </div>;
}

export default function SettingsPage() {
    const [ready, setReady] = useState(false);
    const initialize = useCallback(async () => { await initShell(); setReady(true); }, []);
    usePage(initialize);
    // A portal preserves the document root's Router and Auth Context ancestry.
    return ready ? createPortal(<Settings />, document.getElementById('feed-container')) : null;
}
