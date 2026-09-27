/**
 * Home page views: Home, Popular, News, All, Explore and custom feeds, switched in place.
 */
import { loadComponent } from './component-loader.js';
import { mountFeed } from '../components/feed/feed.js';
import { initExplore } from '../components/explore/explore.js';
import { setActiveNav, openCustomFeedDialog } from '../components/sidebar/sidebar.js';
import { authState } from './auth-state.js';
import { api } from './api.js';
import { renderRightColumn, setLayout } from './shell.js';
import { confirmDialog } from './ui.js';
import { showToast } from './interactions.js';
import { escapeHtml, communityIcon } from './utils.js';

const VIEWS = ['home', 'popular', 'news', 'all', 'explore', 'custom'];
const TITLES = {
    home: 'Reddit - The heart of the internet',
    popular: 'Popular - Reddit',
    news: 'News - Reddit',
    all: 'All - Reddit',
    explore: 'Explore Communities - Reddit'
};

function emptyState(title, body, cta = '') {
    return `<div class="rc-empty-state"><h3>${title}</h3><p>${body}</p>${cta}</div>`;
}

function customFeedHeader(feed) {
    return `
        <div class="rc-feed-header">
            <div class="rc-feed-header-icon">✨</div>
            <div class="rc-feed-header-info">
                <h1>${escapeHtml(feed.name)}</h1>
                ${feed.description ? `<p>${escapeHtml(feed.description)}</p>` : ''}
                <div class="rc-feed-communities">
                    ${feed.communities.map(c => `<a href="community.html?name=${encodeURIComponent(c.name)}">${communityIcon(c, 18)} r/${escapeHtml(c.name)}</a>`).join('') || '<span class="rc-muted-text">No communities yet</span>'}
                </div>
            </div>
            <div class="rc-feed-header-actions">
                <button class="ui-btn ui-btn-secondary" id="editCustomFeedBtn">Edit</button>
                <button class="ui-btn ui-btn-danger-outline" id="deleteCustomFeedBtn">Delete</button>
            </div>
        </div>`;
}

export async function switchView(viewName, extra = {}, { replace = false } = {}) {
    const view = VIEWS.includes(viewName) ? viewName : 'home';
    const feedContainer = document.getElementById('feed-container');
    const { isLoggedIn, user } = authState.getState();

    // Keep the URL shareable; sort params only carry over when explicitly provided.
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('view', view);
    if (view === 'custom' && extra.feed) url.searchParams.set('feed', extra.feed);
    if (extra.sort) url.searchParams.set('sort', extra.sort);
    if (extra.t) url.searchParams.set('t', extra.t);
    if (url.toString() !== window.location.href) {
        window.history[replace ? 'replaceState' : 'pushState']({ view }, '', url);
    }

    setActiveNav(view, extra.feed || '');
    document.title = TITLES[view] || 'Reddit';
    feedContainer.scrollTop = 0;

    if (view === 'explore') {
        setLayout({ rightColumn: false });
        await loadComponent('#feed-container', './components/explore/explore.html');
        initExplore();
        return;
    }

    if (view === 'news') {
        setLayout({ rightColumn: false });
        mountFeed(feedContainer, {
            endpoint: ({ sort, t, page }) => `/posts?feed=news&sort=${sort}&t=${t}&page=${page}`,
            className: 'news-feed-view',
            headerHtml: '<h1 class="rc-view-title">News</h1>',
            emptyHtml: emptyState('No news yet', 'Posts from news communities, and posts tagged News, show up here.')
        });
        return;
    }

    setLayout({ rightColumn: true });
    renderRightColumn(view === 'popular' ? 'communities-recent' : 'communities');

    if (view === 'custom') {
        const feed = user?.customFeeds.find(f => f.id === extra.feed);
        if (!feed) {
            feedContainer.innerHTML = emptyState('Custom feed not found', 'It may have been deleted.', '<a class="ui-btn ui-btn-primary" href="index.html">Go home</a>');
            return;
        }
        document.title = `${feed.name} - Reddit`;
        mountFeed(feedContainer, {
            endpoint: ({ sort, t, page }) => `/posts?feed=custom&feedId=${encodeURIComponent(feed.id)}&sort=${sort}&t=${t}&page=${page}`,
            headerHtml: customFeedHeader(feed),
            emptyHtml: emptyState('This feed is empty', 'Add communities to it with the Edit button.')
        });
        document.getElementById('editCustomFeedBtn').onclick = () => openCustomFeedDialog(feed);
        document.getElementById('deleteCustomFeedBtn').onclick = async () => {
            if (!(await confirmDialog(`Delete the custom feed "${feed.name}"?`, { title: 'Delete custom feed?', confirmLabel: 'Delete', danger: true }))) return;
            try {
                const { user: updated } = await api.del(`/users/me/feeds/${feed.id}`);
                authState.setUser(updated);
                showToast('Custom feed deleted');
                switchView('home');
            } catch (err) {
                showToast(err.message);
            }
        };
        return;
    }

    const feedParam = view === 'home' && isLoggedIn ? 'home' : view === 'popular' ? 'popular' : 'all';
    const headers = { popular: '<h1 class="rc-view-title">Popular</h1>', all: '<h1 class="rc-view-title">All</h1>' };
    mountFeed(feedContainer, {
        endpoint: ({ sort, t, page }) => `/posts?feed=${feedParam}&sort=${sort}&t=${t}&page=${page}`,
        defaultSort: view === 'popular' ? 'hot' : 'best',
        headerHtml: headers[view] || '',
        emptyHtml: view === 'home' && isLoggedIn
            ? emptyState('Your home feed is empty', 'Join some communities to fill it up.', '<a class="ui-btn ui-btn-primary" href="index.html?view=explore">Explore communities</a>')
            : emptyState('No posts yet', 'Be the first to post something.', isLoggedIn ? '<a class="ui-btn ui-btn-primary" href="submit.html">Create a post</a>' : '')
    });
}

window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    switchView(params.get('view') || 'home', { feed: params.get('feed') }, { replace: true });
});
