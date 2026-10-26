import { initShell } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { showToast } from '../interactions.js';
import { toggleJoin, formDialog, openDialog } from '../ui.js';
import { mountFeed } from '../../components/feed/feed.js';
import { aboutCardHtml, rulesCardHtml, moderatorsCardHtml, bindSideCards } from '../community-widgets.js';
import { escapeHtml, getParam, communityIcon, formatNumber } from '../utils.js';

let community = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    const container = document.getElementById('feed-container');
    const name = getParam('name');

    try {
        ({ community } = await api.get(`/communities/${encodeURIComponent(name || '')}`));
    } catch (err) {
        container.innerHTML = `
            <div class="rc-empty-state">
                <h3>Sorry, there aren't any communities on Reddit with that name.</h3>
                <p>${escapeHtml(err.message)}</p>
                <div class="ui-dialog-actions" style="justify-content:center">
                    <a class="ui-btn ui-btn-secondary" href="index.html?view=explore">Explore communities</a>
                    ${authState.getState().isLoggedIn ? '<button class="ui-btn ui-btn-primary" id="createMissingCommunity">Create community</button>' : ''}
                </div>
            </div>`;
        document.getElementById('createMissingCommunity')?.addEventListener('click', async () => {
            const { openCommunityModal } = await import('../../components/community-modal/community-modal.js');
            openCommunityModal();
        });
        return;
    }

    document.title = `r/${community.name}`;
    render();
    if (getParam('modtools') && community.isMod) openSettingsDialog();
});

function render() {
    const container = document.getElementById('feed-container');
    const joined = authState.isJoined(community.name);
    container.innerHTML = `
        <div class="rc-community-page">
            <div class="rc-community-banner no-invert" style="background-color:${escapeHtml(community.bannerColor)}"></div>
            <div class="rc-community-header">
                <div class="rc-community-avatar">${communityIcon(community, 88)}</div>
                <div class="rc-community-title">
                    <h1>r/${escapeHtml(community.name)}</h1>
                    <span class="rc-muted-text">${formatNumber(community.memberCount)} members • ${escapeHtml(community.type)}${community.mature ? ' • 18+' : ''}</span>
                </div>
                <div class="rc-community-actions">
                    ${community.canPost ? `<a class="ui-btn ui-btn-secondary" href="submit.html?community=${encodeURIComponent(community.name)}">＋ Create Post</a>` : ''}
                    ${community.isMod ? '<button class="ui-btn ui-btn-secondary" id="modToolsBtn">🛡️ Mod Tools</button>' : ''}
                    <button class="ui-btn ${joined ? 'ui-btn-secondary joined' : 'ui-btn-primary'}" id="communityJoinBtn" data-join-community="${escapeHtml(community.name)}">${joined ? 'Joined' : 'Join'}</button>
                </div>
            </div>
            <div class="rc-page-grid">
                <div class="rc-page-main" id="communityFeed"></div>
                <aside class="rc-page-aside" id="communityAside">
                    ${aboutCardHtml(community, { showHeader: false })}
                    ${rulesCardHtml(community)}
                    ${moderatorsCardHtml(community)}
                </aside>
            </div>
        </div>`;

    const joinBtn = document.getElementById('communityJoinBtn');
    joinBtn.onclick = async () => {
        const result = await toggleJoin(community);
        if (!result) return;
        community.memberCount = result.memberCount;
        joinBtn.classList.toggle('ui-btn-primary', !result.joined);
        joinBtn.classList.toggle('ui-btn-secondary', result.joined);
        container.querySelector('.rc-community-title .rc-muted-text').textContent =
            `${formatNumber(community.memberCount)} members • ${community.type}${community.mature ? ' • 18+' : ''}`;
    };
    document.getElementById('modToolsBtn')?.addEventListener('click', openModMenu);
    bindSideCards(document.getElementById('communityAside'), community);

    const feedEl = document.getElementById('communityFeed');
    if (!community.canView) {
        feedEl.innerHTML = `<div class="rc-empty-state"><h3>🔒 r/${escapeHtml(community.name)} is private</h3>
            <p>Only approved members can view and contribute. Message the moderators to ask for access.</p></div>`;
        return;
    }
    if (community.mature && !authState.user?.prefs?.showMature && !sessionStorage.getItem(`rc_mature_ok_${community.name}`)) {
        feedEl.innerHTML = `<div class="rc-empty-state"><h3>r/${escapeHtml(community.name)} is an 18+ community</h3>
            <p>You must be at least 18 to view this community.</p>
            <button class="ui-btn ui-btn-primary" id="matureContinueBtn">I'm over 18, continue</button></div>`;
        document.getElementById('matureContinueBtn').onclick = () => {
            try { sessionStorage.setItem(`rc_mature_ok_${community.name}`, '1'); } catch { /* ignore */ }
            mountCommunityFeed(feedEl);
        };
        return;
    }
    mountCommunityFeed(feedEl);
}

function mountCommunityFeed(feedEl) {
    mountFeed(feedEl, {
        endpoint: ({ sort, t, page }) => `/posts?community=${encodeURIComponent(community.name)}&sort=${sort}&t=${t}&page=${page}`,
        sorts: ['best', 'hot', 'new', 'top', 'rising'],
        defaultSort: 'hot',
        showCommunity: false,
        emptyHtml: `<div class="rc-empty-state"><h3>This community doesn't have any posts yet</h3><p>Make one and get this feed started.</p>
            ${community.canPost ? `<a class="ui-btn ui-btn-primary" href="submit.html?community=${encodeURIComponent(community.name)}">Create Post</a>` : ''}</div>`
    });
}

// ---- Mod tools ------------------------------------------------------------------------------

function openModMenu() {
    openDialog({
        title: 'Mod Tools',
        subtitle: `Manage r/${community.name}`,
        bodyHtml: `
            <div class="rc-mod-menu">
                <button class="reddit-auth-pill-btn" data-tool="settings">⚙️ Community settings &amp; rules</button>
                <button class="reddit-auth-pill-btn" data-tool="users">👥 Approved users &amp; moderators</button>
            </div>`,
        onMount: (card, close) => {
            card.querySelector('[data-tool="settings"]').onclick = () => { close(); openSettingsDialog(); };
            card.querySelector('[data-tool="users"]').onclick = () => { close(); openUsersDialog(); };
        }
    });
}

async function openSettingsDialog() {
    let topics = [];
    try {
        ({ topics } = await api.get('/communities/topics'));
    } catch {
        topics = [community.topic];
    }
    const rulesText = community.rules.map(r => (r.description ? `${r.title} | ${r.description}` : r.title)).join('\n');
    const updated = await formDialog({
        title: 'Community settings',
        wide: true,
        submitLabel: 'Save changes',
        fields: [
            { name: 'description', label: 'Description', type: 'textarea', rows: 3, value: community.description, maxlength: 500 },
            { name: 'icon', label: 'Icon (emoji or up to 4 letters)', value: community.icon, maxlength: 4 },
            { name: 'color', label: 'Icon color', type: 'color', value: community.color },
            { name: 'bannerColor', label: 'Banner color', type: 'color', value: community.bannerColor },
            { name: 'topic', label: 'Topic', type: 'select', value: community.topic, options: topics.map(t => ({ value: t, label: t })) },
            {
                name: 'type', label: 'Community type', type: 'select', value: community.type,
                options: [
                    { value: 'Public', label: 'Public: anyone can view, post and comment' },
                    { value: 'Restricted', label: 'Restricted: anyone can view, only approved users post' },
                    { value: 'Private', label: 'Private: only approved users can view and post' }
                ]
            },
            { name: 'mature', label: 'Mature (18+)', type: 'select', value: community.mature ? 'yes' : 'no', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
            { name: 'rules', label: 'Rules (one per line, optionally "Title | description")', type: 'textarea', rows: 5, value: rulesText }
        ],
        onSubmit: async (values) => {
            const rules = values.rules.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                const [title, ...rest] = line.split('|');
                return { title: title.trim(), description: rest.join('|').trim() };
            });
            const { community: saved } = await api.patch(`/communities/${encodeURIComponent(community.name)}`, {
                description: values.description,
                icon: values.icon,
                color: values.color.toUpperCase(),
                bannerColor: values.bannerColor.toUpperCase(),
                topic: values.topic,
                type: values.type,
                mature: values.mature === 'yes',
                rules
            });
            return saved;
        }
    });
    if (updated) {
        community = updated;
        showToast('Community settings saved');
        render();
    }
}

function openUsersDialog() {
    const listHtml = () => `
        <h3 class="ui-field-label">Moderators</h3>
        <ul class="rc-user-chip-list">${community.moderators.map(m => `<li><a href="user.html?u=${encodeURIComponent(m.username)}">u/${escapeHtml(m.username)}</a></li>`).join('')}</ul>
        <h3 class="ui-field-label">Approved users</h3>
        <p class="ui-muted">Approved users can post in restricted communities and view private ones.</p>
        <ul class="rc-user-chip-list">${community.approvedUsers.map(u => `<li>u/${escapeHtml(u)} <button class="rc-link-btn" data-remove="${escapeHtml(u)}">Remove</button></li>`).join('') || '<li class="ui-muted">None yet</li>'}</ul>`;

    openDialog({
        title: 'Approved users & moderators',
        wide: true,
        bodyHtml: `
            <div id="modUsersList">${listHtml()}</div>
            <form class="ui-form" id="modUsersForm">
                <label class="ui-field-label" for="modUsername">Add a user</label>
                <input class="ui-input" id="modUsername" placeholder="username" autocomplete="off">
                <p class="ui-error hidden" data-error></p>
                <div class="ui-dialog-actions">
                    <button type="button" class="ui-btn ui-btn-secondary" data-role="moderators">Add as moderator</button>
                    <button type="submit" class="ui-btn ui-btn-primary">Approve user</button>
                </div>
            </form>`,
        onMount: (card) => {
            const input = card.querySelector('#modUsername');
            const error = card.querySelector('[data-error]');
            const refresh = () => {
                card.querySelector('#modUsersList').innerHTML = listHtml();
                bindRemove();
            };
            const act = async (role) => {
                const username = input.value.trim().replace(/^u\//, '');
                if (!username) return;
                error.classList.add('hidden');
                try {
                    ({ community } = await api.post(`/communities/${encodeURIComponent(community.name)}/${role}`, { username }));
                    input.value = '';
                    showToast(role === 'moderators' ? `u/${username} is now a moderator` : `Approved u/${username}`);
                    refresh();
                } catch (err) {
                    error.textContent = err.message;
                    error.classList.remove('hidden');
                }
            };
            const bindRemove = () => {
                card.querySelectorAll('[data-remove]').forEach(btn => {
                    btn.onclick = async () => {
                        try {
                            ({ community } = await api.del(`/communities/${encodeURIComponent(community.name)}/approved/${encodeURIComponent(btn.dataset.remove)}`));
                            refresh();
                        } catch (err) {
                            showToast(err.message);
                        }
                    };
                });
            };
            bindRemove();
            card.querySelector('#modUsersForm').onsubmit = (e) => { e.preventDefault(); act('approved'); };
            card.querySelector('[data-role="moderators"]').onclick = () => act('moderators');
        }
    }).then(() => render());
}
