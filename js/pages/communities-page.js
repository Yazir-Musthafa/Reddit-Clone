import { initShell } from '../shell.js';
import { api } from '../api.js';
import { openAuthModal } from '../interactions.js';
import { toggleJoin } from '../ui.js';
import { escapeHtml, communityIcon, formatCount } from '../utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { isLoggedIn } = await initShell();
    const container = document.getElementById('feed-container');
    if (!isLoggedIn) {
        container.innerHTML = '<div class="rc-empty-state"><h3>Log in to manage your communities</h3><button class="ui-btn ui-btn-primary" id="commLoginBtn">Log In</button></div>';
        document.getElementById('commLoginBtn').onclick = () => openAuthModal('Log In');
        return;
    }

    let joined = [];
    let moderated = [];
    try {
        ({ joined, moderated } = await api.get('/users/me/communities'));
    } catch (err) {
        container.innerHTML = `<div class="rc-empty-state"><p>${escapeHtml(err.message)}</p></div>`;
        return;
    }

    const row = (c, showJoin = true) => `
        <div class="rc-search-row">
            <a href="community.html?name=${encodeURIComponent(c.name)}">${communityIcon(c, 40)}</a>
            <a class="rc-search-row-info" href="community.html?name=${encodeURIComponent(c.name)}">
                <strong>r/${escapeHtml(c.name)}</strong>
                <span class="rc-muted-text">${formatCount(c.memberCount)} members • ${escapeHtml(c.topic)}</span>
                <p>${escapeHtml(c.description)}</p>
            </a>
            ${showJoin ? `<button class="btn-community-join ${c.joined ? 'joined' : ''}" data-join-community="${escapeHtml(c.name)}">${c.joined ? 'Joined' : 'Join'}</button>` : ''}
        </div>`;

    container.innerHTML = `
        <div class="rc-settings-page">
            <h1 class="rc-view-title">Manage Communities</h1>
            <div class="ui-dialog-actions" style="justify-content:flex-start;margin-bottom:16px;">
                <button class="ui-btn ui-btn-primary" id="manageStartCommunity">＋ Start a community</button>
                <a class="ui-btn ui-btn-secondary" href="index.html?view=explore">Explore communities</a>
            </div>
            ${moderated.length ? `<h2 class="rc-section-heading">Communities you moderate</h2><div class="rc-search-list">${moderated.map(c => row(c, false)).join('')}</div>` : ''}
            <h2 class="rc-section-heading">Joined (${joined.length})</h2>
            <div class="rc-search-list">${joined.map(c => row(c)).join('') || '<p class="rc-muted-text">You haven\'t joined any communities yet.</p>'}</div>
        </div>`;

    container.querySelectorAll('.btn-community-join').forEach(btn => {
        btn.onclick = () => {
            const community = joined.find(c => c.name === btn.dataset.joinCommunity);
            if (community) toggleJoin(community);
        };
    });
    document.getElementById('manageStartCommunity').onclick = async () => {
        const { openCommunityModal } = await import('../../components/community-modal/community-modal.js');
        openCommunityModal();
    };
});
