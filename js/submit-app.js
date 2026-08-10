import { loadComponent } from './component-loader.js';
import { initHeader } from '../components/header/header.js';
import { initSearch } from '../components/search/search.js';
import { initAuthedSidebar } from '../components/sidebar/sidebar.js';
import { initPostCreate } from '../components/post-create/post-create.js';
import { initFooter } from '../components/footer/footer.js';
import { initChats } from '../components/chats/chats.js';
import { initCommunityModal } from '../components/community-modal/community-modal.js';
import { authState } from './auth-state.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure logged-in state for submit page
    authState.login('Fantastic-Series2270');

    // 1. Load Authenticated Header
    await loadComponent('#header-container', './components/header/header-authed.html');
    initHeader();

    // 2. Load Search component in search slot
    await loadComponent('#search-slot', './components/search/search.html');
    initSearch();

    // 3. Load Authenticated Navigation Drawer in left sidebar
    await loadComponent('#sidebar-container', './components/sidebar/sidebar-authed.html');
    initAuthedSidebar();

    // 4. Load Create Post Canvas in central section
    await loadComponent('#feed-container', './components/post-create/post-create.html');
    initPostCreate();

    // 5. Load Footer
    await loadComponent('#footer-container', './components/footer/footer.html');
    initFooter();

    // 6. Load Chats Pop-up
    await loadComponent('#chats-slot', './components/chats/chats.html');
    initChats();

    // 7. Load Start Community Modal Wizard
    await loadComponent('#community-modal-slot', './components/community-modal/community-modal.html');
    initCommunityModal();
});
