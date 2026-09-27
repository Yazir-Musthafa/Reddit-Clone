import { initShell, renderRightColumn } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { toggleJoin } from '../ui.js';
import { mountFeed } from '../../components/feed/feed.js';
import {
    escapeHtml, getParam, communityIcon, userAvatar, formatCount, timeAgo, formatCommentBody
} from '../utils.js';

const TABS = { posts: 'Posts', communities: 'Communities', comments: 'Comments', people: 'People' };

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    renderRightColumn('communities');
    const container = document.getElementById('feed-container');
    const q = (getParam('q') || '').trim();
    const initial = TABS[getParam('type')] ? getParam('type') : 'posts';

    if (!q) {
        container.innerHTML = '<div class="rc-empty-state"><h3>Search Reddit</h3><p>Type something in the search bar above and press Enter.</p></div>';
        return;
    }
    document.title = `${q} - Reddit Search`;

    container.innerHTML = `
        <div class="rc-search-page">
            <h1 class="rc-view-title">Results for “${escapeHtml(q)}”</h1>
            <nav class="rc-tabs" role="tablist">
                ${Object.entries(TABS).map(([k, v]) => `<button class="rc-tab ${k === initial ? 'active' : ''}" data-tab="${k}" role="tab">${v}</button>`).join('')}
            </nav>
            <div id="searchResults"></div>
        </div>`;

    container.querySelectorAll('.rc-tab').forEach(tab => {
        tab.onclick = () => {
            container.querySelectorAll('.rc-tab').forEach(t => t.classList.toggle('active', t === tab));
            const url = new URL(window.location.href);
            url.searchParams.set('type', tab.dataset.tab);
            url.searchParams.delete('sort');
            url.searchParams.delete('t');
            window.history.replaceState({}, '', url);
            showTab(tab.dataset.tab, q);
        };
    });
    showTab(initial, q);
});

function showTab(type, q) {
    const results = document.getElementById('searchResults');
    const noResults = `<div class="rc-empty-state"><h3>Hm... we couldn't find any results for “${escapeHtml(q)}”</h3><p>Double-check your spelling or try different keywords.</p></div>`;

    if (type === 'posts') {
        mountFeed(results, {
            endpoint: ({ sort, t, page }) => `/search?q=${encodeURIComponent(q)}&type=posts&sort=${sort}&t=${t}&page=${page}`,
            resultsKey: 'results',
            sorts: ['top', 'new', 'hot'],
            defaultSort: 'top',
            emptyHtml: noResults
        });
        return;
    }

    let page = 0;
    const loaded = [];
    results.innerHTML = '<div class="rc-search-list" id="searchList"></div><div class="rc-feed-status" id="searchStatus"></div>';
    const list = results.querySelector('#searchList');
    const status = results.querySelector('#searchStatus');

    const render = (items) => items.map(item => {
        if (type === 'communities') {
            const joined = authState.isJoined(item.name);
            return `
                <a class="rc-search-row" href="community.html?name=${encodeURIComponent(item.name)}">
                    ${communityIcon(item, 40)}
                    <div class="rc-search-row-info">
                        <strong>r/${escapeHtml(item.name)}</strong>
                        <span class="rc-muted-text">${formatCount(item.memberCount)} members • ${escapeHtml(item.topic)}</span>
                        <p>${escapeHtml(item.description)}</p>
                    </div>
                    <button class="btn-community-join ${joined ? 'joined' : ''}" data-join-community="${escapeHtml(item.name)}">${joined ? 'Joined' : 'Join'}</button>
                </a>`;
        }
        if (type === 'people') {
            return `
                <a class="rc-search-row" href="user.html?u=${encodeURIComponent(item.username)}">
                    ${userAvatar(item, 40)}
                    <div class="rc-search-row-info">
                        <strong>u/${escapeHtml(item.username)}</strong>
                        <span class="rc-muted-text">${formatCount(item.karma)} karma • joined ${timeAgo(item.createdAt)}</span>
                        ${item.bio ? `<p>${escapeHtml(item.bio)}</p>` : ''}
                    </div>
                </a>`;
        }
        return `
            <a class="rc-profile-comment" href="post.html?id=${encodeURIComponent(item.post.id)}#comment-${item.id}">
                <div class="rc-profile-comment-meta">
                    ${communityIcon(item.community, 20)}<strong>r/${escapeHtml(item.community.name)}</strong>
                    <span class="rc-muted-text">• ${escapeHtml(item.post.title)}</span>
                </div>
                <div class="rc-muted-text rc-small">${userAvatar(item.author, 16)} ${escapeHtml(item.author.username)} • ${timeAgo(item.createdAt)}</div>
                <div class="rc-comment-body">${formatCommentBody(item.body)}</div>
                <div class="rc-muted-text rc-small">⬆ ${formatCount(item.score)} points</div>
            </a>`;
    }).join('');

    const load = async () => {
        status.innerHTML = '<div class="rc-spinner"></div>';
        try {
            const { results: items, hasMore } = await api.get(`/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}`);
            page += 1;
            loaded.push(...items);
            list.insertAdjacentHTML('beforeend', render(items));
            list.querySelectorAll('.btn-community-join').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const community = loaded.find(c => c.name === btn.dataset.joinCommunity);
                    if (community) toggleJoin(community);
                };
            });
            if (!loaded.length) status.innerHTML = noResults;
            else if (hasMore) {
                status.innerHTML = '<button class="ui-btn ui-btn-secondary" id="searchMoreBtn">Load more</button>';
                status.querySelector('#searchMoreBtn').onclick = load;
            } else status.innerHTML = '';
        } catch (err) {
            status.innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
        }
    };
    load();
}
