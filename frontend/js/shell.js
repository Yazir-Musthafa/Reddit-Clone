/**
 * Loads the parts every page shares: header, search, left sidebar, chats and the
 * "start a community" wizard. Pages then render their own centre and right columns.
 */
import { loadComponent } from './component-loader.js';
import { authState } from './auth-state.js';
import { initHeader } from '../components/header/header.js';
import { initSearch } from '../components/search/search.js';
import { initSidebar, initAuthedSidebar } from '../components/sidebar/sidebar.js';
import { initChats } from '../components/chats/chats.js';
import { initCommunityModal } from '../components/community-modal/community-modal.js';
import { initCommunities } from '../components/popular-communities/communities.js';
import { initFooter } from '../components/footer/footer.js';

export async function initShell() {
    await authState.load();
    const { isLoggedIn } = authState.getState();

    const jobs = [
        loadComponent('#header-container', isLoggedIn ? './components/header/header-authed.html' : './components/header/header.html')
    ];
    if (document.getElementById('sidebar-container')) {
        jobs.push(loadComponent('#sidebar-container', isLoggedIn ? './components/sidebar/sidebar-authed.html' : './components/sidebar/sidebar.html'));
    }
    if (isLoggedIn && document.getElementById('chats-slot')) {
        jobs.push(loadComponent('#chats-slot', './components/chats/chats.html'));
    }
    if (isLoggedIn && document.getElementById('community-modal-slot')) {
        jobs.push(loadComponent('#community-modal-slot', './components/community-modal/community-modal.html'));
    }
    await Promise.all(jobs);
    await loadComponent('#search-slot', './components/search/search.html');

    initHeader();
    initSearch();
    if (document.getElementById('sidebar-container')) {
        if (isLoggedIn) initAuthedSidebar();
        else initSidebar();
    }
    if (isLoggedIn) {
        initChats();
        initCommunityModal();
    }
    return authState.getState();
}

/**
 * Fills the right column. `widgets` is 'communities', 'communities-recent' or 'footer'.
 * Pages that need custom widgets can pass extra HTML to render above them.
 */
export async function renderRightColumn(widgets = 'communities', { topHtml = '' } = {}) {
    const rightCol = document.querySelector('.right-column-container');
    if (!rightCol) return;
    rightCol.innerHTML = `<div class="rc-right-scroll">${topHtml}<div id="communities-container"></div></div><div id="footer-container"></div>`;
    if (widgets !== 'footer') {
        const template = widgets === 'communities-recent'
            ? './components/popular-communities/communities.html'
            : './components/popular-communities/communities-home.html';
        await loadComponent('#communities-container', template);
        initCommunities();
    }
    await loadComponent('#footer-container', './components/footer/footer.html');
    initFooter();
}

export function setLayout({ rightColumn = true } = {}) {
    const mainLayout = document.querySelector('.main-layout');
    const rightCol = document.querySelector('.right-column-container');
    mainLayout?.classList.toggle('no-right-col', !rightColumn);
    if (rightCol) rightCol.style.display = rightColumn ? '' : 'none';
}
