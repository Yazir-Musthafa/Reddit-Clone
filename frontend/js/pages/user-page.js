import { initShell } from '../shell.js';
import { api } from '../api.js';
import { mountFeed } from '../../components/feed/feed.js';
import { openChatWith } from '../../components/chats/chats.js';
import {
    escapeHtml, getParam, userAvatar, formatNumber, formatDate, formatCount, timeAgo, communityIcon, formatCommentBody
} from '../utils.js';

let profile = null;

const PUBLIC_TABS = ['posts', 'comments', 'achievements'];
const PRIVATE_TABS = ['saved', 'hidden', 'upvoted', 'downvoted'];
const TAB_LABELS = {
    posts: 'Posts', comments: 'Comments', achievements: 'Achievements',
    saved: 'Saved', hidden: 'Hidden', upvoted: 'Upvoted', downvoted: 'Downvoted'
};

document.addEventListener('DOMContentLoaded', async () => {
    const { user: me } = await initShell();
    const container = document.getElementById('feed-container');
    const username = getParam('u') || me?.username;

    if (!username) {
        container.innerHTML = '<div class="rc-empty-state"><h3>Log in to see your profile</h3></div>';
        return;
    }

    try {
        ({ user: profile } = await api.get(`/users/${encodeURIComponent(username)}`));
    } catch (err) {
        container.innerHTML = `<div class="rc-empty-state"><h3>Sorry, nobody on Reddit goes by that name.</h3><p>${escapeHtml(err.message)}</p>
            <a class="ui-btn ui-btn-primary" href="index.html">Go home</a></div>`;
        return;
    }

    document.title = `${profile.displayName || profile.username} (u/${profile.username}) - Reddit`;
    const tabs = profile.isMe ? [...PUBLIC_TABS.slice(0, 2), ...PRIVATE_TABS, 'achievements'] : PUBLIC_TABS;
    const requested = getParam('tab');
    const initialTab = tabs.includes(requested) ? requested : 'posts';

    container.innerHTML = `
        <div class="rc-profile-page">
            <div class="rc-page-grid">
                <div class="rc-page-main">
                    <div class="rc-profile-header">
                        <div class="rc-profile-avatar">${userAvatar(profile, 72)}</div>
                        <div>
                            <h1>${escapeHtml(profile.displayName || profile.username)}</h1>
                            <span class="rc-muted-text">u/${escapeHtml(profile.username)}</span>
                        </div>
                        <div class="rc-community-actions">
                            ${profile.isMe
                                ? '<a class="ui-btn ui-btn-secondary" href="settings.html?tab=profile">Edit profile</a><a class="ui-btn ui-btn-primary" href="submit.html">＋ Create Post</a>'
                                : '<button class="ui-btn ui-btn-primary" id="profileChatBtn">💬 Chat</button>'}
                        </div>
                    </div>
                    <nav class="rc-tabs" role="tablist">
                        ${tabs.map(t => `<button class="rc-tab ${t === initialTab ? 'active' : ''}" data-tab="${t}" role="tab">${TAB_LABELS[t]}</button>`).join('')}
                    </nav>
                    <div id="profileTabContent"></div>
                </div>
                <aside class="rc-page-aside">${profileCardHtml()}</aside>
            </div>
        </div>`;

    document.getElementById('profileChatBtn')?.addEventListener('click', () => openChatWith(profile.username));
    container.querySelectorAll('.rc-tab').forEach(tab => {
        tab.onclick = () => {
            container.querySelectorAll('.rc-tab').forEach(t => t.classList.toggle('active', t === tab));
            const url = new URL(window.location.href);
            url.searchParams.set('u', profile.username);
            url.searchParams.set('tab', tab.dataset.tab);
            url.searchParams.delete('sort');
            url.searchParams.delete('t');
            window.history.replaceState({}, '', url);
            showTab(tab.dataset.tab);
        };
    });
    container.querySelector('[data-view-achievements]')?.addEventListener('click', () => {
        container.querySelector('.rc-tab[data-tab="achievements"]').click();
    });
    showTab(initialTab);
});

function profileCardHtml() {
    const unlocked = profile.achievements.filter(a => a.unlocked);
    return `
        <div class="rc-side-card">
            <div class="rc-side-card-banner no-invert" style="background-color:${escapeHtml(profile.bannerColor)}"></div>
            <div class="rc-side-card-body">
                <h3 class="rc-side-heading">${escapeHtml(profile.displayName || profile.username)}</h3>
                ${profile.bio ? `<p class="rc-side-desc">${escapeHtml(profile.bio)}</p>` : ''}
                <div class="rc-side-stats rc-side-stats-3">
                    <div><strong>${formatNumber(profile.postKarma)}</strong><span>Post karma</span></div>
                    <div><strong>${formatNumber(profile.commentKarma)}</strong><span>Comment karma</span></div>
                    <div><strong>${formatDate(profile.createdAt)}</strong><span>Cake day</span></div>
                </div>
                <div class="rc-side-meta">
                    <span>📝 ${formatNumber(profile.stats.posts)} posts • 💬 ${formatNumber(profile.stats.comments)} comments</span>
                </div>
                <button class="rc-achievement-preview" data-view-achievements>
                    ${unlocked.slice(0, 5).map(a => `<span title="${escapeHtml(a.name)}">${a.icon}</span>`).join('')}
                    <small>${unlocked.length} achievements unlocked</small>
                </button>
            </div>
        </div>
        ${profile.moderated.length ? `
        <div class="rc-side-card">
            <div class="rc-side-card-body">
                <h3 class="rc-side-heading">Moderator of these communities</h3>
                <div class="rc-mod-list">
                    ${profile.moderated.map(c => `<a class="rc-mod-item" href="community.html?name=${encodeURIComponent(c.name)}">${communityIcon(c, 24)}<span>r/${escapeHtml(c.name)}<small class="rc-muted-text"> • ${formatCount(c.memberCount)} members</small></span></a>`).join('')}
                </div>
            </div>
        </div>` : ''}`;
}

function showTab(tab) {
    const content = document.getElementById('profileTabContent');
    const name = encodeURIComponent(profile.username);
    const empty = (title, body) => `<div class="rc-empty-state"><h3>${title}</h3><p>${body}</p></div>`;

    if (tab === 'comments') return renderComments(content);
    if (tab === 'achievements') return renderAchievements(content);

    const who = profile.isMe ? 'You haven\'t' : `u/${escapeHtml(profile.username)} hasn't`;
    const config = {
        posts: { sorts: ['new', 'hot', 'top'], empty: empty(`${who} posted yet`, profile.isMe ? 'Share something with a community.' : 'Check back later.') },
        saved: { sorts: [], empty: empty('No saved posts yet', 'Save posts from their ••• menu or the Save button to find them here.') },
        hidden: { sorts: [], empty: empty('No hidden posts', 'Posts you hide are listed here so you can unhide them.') },
        upvoted: { sorts: [], empty: empty('No upvoted posts yet', 'Posts you upvote show up here.') },
        downvoted: { sorts: [], empty: empty('No downvoted posts yet', 'Posts you downvote show up here.') }
    }[tab];

    mountFeed(content, {
        endpoint: ({ sort, t, page }) => `/users/${name}/${tab}?sort=${sort}&t=${t}&page=${page}`,
        sorts: config.sorts.length ? config.sorts : ['new'],
        defaultSort: 'new',
        showSort: config.sorts.length > 0,
        showCommunity: true,
        emptyHtml: config.empty
    });
}

function renderComments(content) {
    let page = 0;
    let sort = 'new';
    content.innerHTML = `
        <div class="feed-sort-row">
            <select class="rc-inline-select" id="profileCommentSort" aria-label="Sort comments">
                <option value="new">New</option>
                <option value="top">Top</option>
            </select>
        </div>
        <div class="rc-profile-comments" id="profileComments"></div>
        <div class="rc-feed-status" id="profileCommentsStatus"></div>`;
    const list = content.querySelector('#profileComments');
    const status = content.querySelector('#profileCommentsStatus');

    const load = async () => {
        status.innerHTML = '<div class="rc-spinner"></div>';
        try {
            const { comments, hasMore } = await api.get(`/users/${encodeURIComponent(profile.username)}/comments?sort=${sort}&page=${page}`);
            page += 1;
            list.insertAdjacentHTML('beforeend', comments.map(c => `
                <a class="rc-profile-comment" href="post.html?id=${encodeURIComponent(c.post.id)}#comment-${c.id}">
                    <div class="rc-profile-comment-meta">
                        ${communityIcon(c.community, 20)}
                        <strong>r/${escapeHtml(c.community.name)}</strong>
                        <span class="rc-muted-text">• ${escapeHtml(c.post.title)}</span>
                    </div>
                    <div class="rc-muted-text rc-small">${escapeHtml(profile.username)} commented ${timeAgo(c.createdAt)}${c.edited ? ' • edited' : ''}</div>
                    <div class="rc-comment-body">${formatCommentBody(c.body)}</div>
                    <div class="rc-muted-text rc-small">⬆ ${formatCount(c.score)} points</div>
                </a>`).join(''));
            if (!list.children.length) {
                status.innerHTML = `<div class="rc-empty-state"><h3>${profile.isMe ? "You haven't" : `u/${escapeHtml(profile.username)} hasn't`} commented yet</h3></div>`;
            } else {
                status.innerHTML = hasMore ? '<button class="ui-btn ui-btn-secondary" id="moreCommentsBtn">Load more</button>' : '<p class="rc-feed-end">That\'s all the comments</p>';
                status.querySelector('#moreCommentsBtn')?.addEventListener('click', load);
            }
        } catch (err) {
            status.innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
        }
    };

    content.querySelector('#profileCommentSort').onchange = (e) => {
        sort = e.target.value;
        page = 0;
        list.innerHTML = '';
        load();
    };
    load();
}

function renderAchievements(content) {
    const unlocked = profile.achievements.filter(a => a.unlocked).length;
    content.innerHTML = `
        <p class="rc-muted-text" style="margin:12px 0;">${unlocked} of ${profile.achievements.length} unlocked</p>
        <div class="rc-achievement-grid">
            ${profile.achievements.map(a => `
                <div class="rc-achievement ${a.unlocked ? 'unlocked' : 'locked'}">
                    <span class="rc-achievement-icon">${a.unlocked ? a.icon : '🔒'}</span>
                    <strong>${escapeHtml(a.name)}</strong>
                    <small>${escapeHtml(a.description)}</small>
                </div>`).join('')}
        </div>`;
}

