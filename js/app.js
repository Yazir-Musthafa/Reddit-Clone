import { loadComponent } from './component-loader.js';
import { initHeader } from '../components/header/header.js';
import { initSearch } from '../components/search/search.js';
import { initSidebar, initAuthedSidebar } from '../components/sidebar/sidebar.js';
import { initFeed } from '../components/feed/feed.js';
import { initPost } from '../components/post/post.js';
import { initCommunities } from '../components/popular-communities/communities.js';
import { initFooter } from '../components/footer/footer.js';
import { initChats } from '../components/chats/chats.js';
import { initCommunityModal } from '../components/community-modal/community-modal.js';
import { switchView } from './router.js';
import { authState } from './auth-state.js';

async function renderApp(state) {
    const { isLoggedIn } = state;

    if (!isLoggedIn) {
        // --- PRE-LOGIN UNAUTHENTICATED LANDING VIEW ---
        await loadComponent('#header-container', './components/header/header.html');
        initHeader();

        await loadComponent('#search-slot', './components/search/search.html');
        initSearch();

        await loadComponent('#sidebar-container', './components/sidebar/sidebar.html');
        initSidebar();

        await loadComponent('#feed-container', './components/feed/feed.html');
        await loadComponent('#posts-list-slot', './components/post/post.html');
        initFeed();
        initPost();

        await loadComponent('#communities-container', './components/popular-communities/communities-home.html');
        initCommunities();

        await loadComponent('#footer-container', './components/footer/footer.html');
        initFooter();
    } else {
        // --- LOGGED-IN AUTHENTICATED FEED VIEW ---
        await loadComponent('#header-container', './components/header/header-authed.html');
        initHeader();

        await loadComponent('#search-slot', './components/search/search.html');
        initSearch();

        await loadComponent('#sidebar-container', './components/sidebar/sidebar-authed.html');
        initAuthedSidebar();

        await loadComponent('#feed-container', './components/feed/feed-authed.html');
        initFeed();
        initPost();

        const rightCol = document.querySelector('.right-column-container');
        if (rightCol) {
            rightCol.style.justifyContent = 'space-between';
            rightCol.innerHTML = '<div id="communities-container"></div><div id="footer-container"></div>';
            await loadComponent('#communities-container', './components/popular-communities/communities-home.html');
            initCommunities();
            await loadComponent('#footer-container', './components/footer/footer.html');
            initFooter();
        }
    }

    // Load Chats Component
    await loadComponent('#chats-slot', './components/chats/chats.html');
    initChats();

    // Load Community Modal Component
    await loadComponent('#community-modal-slot', './components/community-modal/community-modal.html');
    initCommunityModal();

    // Check if redirect query param exists (e.g., from submit page)
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
        await switchView(viewParam);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial Render
    renderApp(authState.getState());

    // Subscribe to state changes (Log In / Log Out)
    authState.subscribe((newState) => {
        renderApp(newState);
    });
});
