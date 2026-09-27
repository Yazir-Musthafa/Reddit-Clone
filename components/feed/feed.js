import { api } from '../../js/api.js';
import { authState } from '../../js/auth-state.js';
import { escapeHtml, readLocal, writeLocal } from '../../js/utils.js';
import { appendPosts } from '../post/post.js';

const SORT_LABELS = { best: 'Best', hot: 'Hot', new: 'New', top: 'Top', rising: 'Rising' };
const TIME_LABELS = { hour: 'Now', day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' };

const CARD_ICON = '<rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="3" y1="9" x2="21" y2="9"/>';
const COMPACT_ICON = '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>';
const CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';

let activeObserver = null;
let closeMenusHandler = null;

function currentViewMode() {
    return readLocal('rc_view', null) || authState.user?.prefs?.defaultView || 'card';
}

function dropdown(id, buttonHtml, buttonClass, header, items) {
    return `
        <div class="sort-dropdown-wrapper">
            <button class="${buttonClass}" id="${id}Btn" aria-expanded="false" aria-haspopup="true">${buttonHtml}</button>
            <div class="sort-popup-menu hidden" id="${id}Menu" role="menu">
                <div class="dropdown-section-header">${header}</div>
                ${items}
            </div>
        </div>`;
}

/**
 * Mounts a sortable, infinitely-scrolling post feed into `container`.
 *  - endpoint({ sort, t, page }) -> API path returning { posts, hasMore }
 *  - resultsKey: property holding the posts (default "posts")
 */
export function mountFeed(container, {
    endpoint,
    resultsKey = 'posts',
    sorts = ['best', 'hot', 'new', 'top', 'rising'],
    defaultSort = 'best',
    showCommunity = true,
    showSort = true,
    emptyHtml = '<div class="rc-empty-state"><h3>No posts yet</h3><p>Check back later.</p></div>',
    headerHtml = '',
    className = ''
}) {
    const params = new URLSearchParams(window.location.search);
    const state = {
        sort: sorts.includes(params.get('sort')) ? params.get('sort') : defaultSort,
        t: TIME_LABELS[params.get('t')] ? params.get('t') : 'day',
        view: currentViewMode(),
        page: 0,
        hasMore: true,
        loading: false,
        generation: 0
    };

    const sortItems = sorts.map(s => `<button class="sort-menu-item ${s === state.sort ? 'active' : ''}" data-sort="${s}"><span class="sort-menu-text">${SORT_LABELS[s]}</span></button>`).join('');
    const timeItems = Object.entries(TIME_LABELS).map(([k, v]) => `<button class="sort-menu-item ${k === state.t ? 'active' : ''}" data-time="${k}"><span class="sort-menu-text">${v}</span></button>`).join('');
    const viewItems = ['card', 'compact'].map(v => `
        <button class="sort-menu-item ${v === state.view ? 'active' : ''}" data-view="${v}">
            <span class="sort-menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${v === 'card' ? CARD_ICON : COMPACT_ICON}</svg></span>
            <span class="sort-menu-text">${v === 'card' ? 'Card' : 'Compact'}</span>
        </button>`).join('');

    container.innerHTML = `
        <div class="feed-container ${className}">
            ${headerHtml}
            <div class="feed-sort-row">
                <div class="sort-left-controls">
                    ${showSort ? dropdown('feedSort', `<span id="currentSortLabel">${SORT_LABELS[state.sort]}</span>${CHEVRON}`, 'btn-feed-sort', 'Sort by', sortItems) : ''}
                    ${showSort ? `<div class="${state.sort === 'top' ? '' : 'hidden'}" id="feedTimeWrapper">${dropdown('feedTime', `<span id="currentTimeLabel">${TIME_LABELS[state.t]}</span>${CHEVRON}`, 'btn-feed-sort', 'Top posts from', timeItems)}</div>` : ''}
                    ${dropdown('feedView', `<svg class="view-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${state.view === 'card' ? CARD_ICON : COMPACT_ICON}</svg><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-down"><polyline points="6 9 12 15 18 9"/></svg>`, 'btn-view-mode', 'View', viewItems)}
                </div>
            </div>
            <div class="posts-feed ${state.view === 'compact' ? 'compact-view-active' : ''}" id="postsFeedList"></div>
            <div class="rc-feed-status" id="feedStatus"></div>
            <div class="rc-feed-sentinel" id="feedSentinel"></div>
        </div>`;

    const list = container.querySelector('#postsFeedList');
    const status = container.querySelector('#feedStatus');
    const loadedPosts = [];

    async function loadMore() {
        if (state.loading || !state.hasMore) return;
        state.loading = true;
        const generation = state.generation;
        status.innerHTML = '<div class="rc-spinner" aria-label="Loading"></div>';
        try {
            const data = await api.get(endpoint({ sort: state.sort, t: state.t, page: state.page }));
            if (generation !== state.generation) return;
            const posts = data[resultsKey] || [];
            loadedPosts.push(...posts);
            appendPosts(list, posts, { view: state.view, showCommunity });
            state.page += 1;
            state.hasMore = !!data.hasMore;
            if (loadedPosts.length === 0) status.innerHTML = emptyHtml;
            else status.innerHTML = state.hasMore ? '' : '<p class="rc-feed-end">You\'ve reached the end</p>';
        } catch (err) {
            if (generation !== state.generation) return;
            status.innerHTML = `<div class="rc-empty-state"><p>${escapeHtml(err.message)}</p><button class="ui-btn ui-btn-secondary" id="feedRetryBtn">Try again</button></div>`;
            status.querySelector('#feedRetryBtn').onclick = () => loadMore();
            state.hasMore = err.status !== 403 && err.status !== 404;
        } finally {
            if (generation === state.generation) state.loading = false;
        }
    }

    function reload() {
        state.generation += 1;
        state.page = 0;
        state.hasMore = true;
        state.loading = false;
        loadedPosts.length = 0;
        list.innerHTML = '';
        loadMore();
    }

    function updateUrl() {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', state.sort);
        if (state.sort === 'top') url.searchParams.set('t', state.t);
        else url.searchParams.delete('t');
        window.history.replaceState({}, '', url);
    }

    // Dropdown wiring
    const menus = [...container.querySelectorAll('.sort-popup-menu')];
    container.querySelectorAll('.sort-dropdown-wrapper > button').forEach(btn => {
        const menu = btn.nextElementSibling;
        btn.onclick = (e) => {
            e.stopPropagation();
            menus.forEach(m => m !== menu && m.classList.add('hidden'));
            menu.classList.toggle('hidden');
            btn.setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
        };
    });
    if (closeMenusHandler) document.removeEventListener('click', closeMenusHandler);
    closeMenusHandler = () => menus.forEach(m => m.classList.add('hidden'));
    document.addEventListener('click', closeMenusHandler);

    container.querySelectorAll('[data-sort]').forEach(item => {
        item.onclick = () => {
            state.sort = item.dataset.sort;
            container.querySelectorAll('[data-sort]').forEach(i => i.classList.toggle('active', i === item));
            container.querySelector('#currentSortLabel').textContent = SORT_LABELS[state.sort];
            container.querySelector('#feedTimeWrapper').classList.toggle('hidden', state.sort !== 'top');
            updateUrl();
            reload();
        };
    });

    container.querySelectorAll('[data-time]').forEach(item => {
        item.onclick = () => {
            state.t = item.dataset.time;
            container.querySelectorAll('[data-time]').forEach(i => i.classList.toggle('active', i === item));
            container.querySelector('#currentTimeLabel').textContent = TIME_LABELS[state.t];
            updateUrl();
            reload();
        };
    });

    container.querySelectorAll('[data-view]').forEach(item => {
        item.onclick = () => {
            state.view = item.dataset.view;
            writeLocal('rc_view', state.view);
            container.querySelectorAll('[data-view]').forEach(i => i.classList.toggle('active', i === item));
            container.querySelector('.view-icon-svg').innerHTML = state.view === 'card' ? CARD_ICON : COMPACT_ICON;
            list.classList.toggle('compact-view-active', state.view === 'compact');
            list.innerHTML = '';
            appendPosts(list, loadedPosts, { view: state.view, showCommunity });
        };
    });

    // Infinite scroll inside the scrolling feed column.
    activeObserver?.disconnect();
    const scrollRoot = container.closest('#feed-container') || null;
    activeObserver = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) loadMore();
    }, { root: scrollRoot, rootMargin: '600px 0px' });
    activeObserver.observe(container.querySelector('#feedSentinel'));

    loadMore();
    return { reload };
}
