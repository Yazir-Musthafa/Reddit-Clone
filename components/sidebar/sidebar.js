import { openAuthModal } from '../../js/interactions.js';
import { switchView } from '../../js/router.js';
import { openCommunityModal } from '../community-modal/community-modal.js';

export function initSidebar() {
    const authButtons = ['btnGoogle', 'btnApple', 'btnPhone', 'btnEmail'];

    authButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = () => {
                const provider = btn.querySelector('.auth-btn-text')?.textContent || 'Authentication';
                openAuthModal(provider);
            };
        }
    });

    bindNavigationItems();
}

export function initAuthedSidebar() {
    const mainLayout = document.querySelector('.main-layout');
    const sidebarContainer = document.getElementById('sidebar-container');
    const toggleBtns = document.querySelectorAll('.btn-drawer-toggle, #drawerToggleBtn, #fixedDrawerToggleBtn, #headerDrawerToggleBtn');
    const startCommBtn = document.getElementById('btnStartCommunity');

    const toggleSidebar = () => {
        if (!mainLayout || !sidebarContainer) return;
        const isCollapsed = sidebarContainer.classList.contains('collapsed');

        if (isCollapsed) {
            sidebarContainer.classList.remove('collapsed');
            mainLayout.classList.remove('sidebar-collapsed');
        } else {
            sidebarContainer.classList.add('collapsed');
            mainLayout.classList.add('sidebar-collapsed');
        }
    };

    toggleBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            toggleSidebar();
        };
    });

    if (startCommBtn) {
        startCommBtn.onclick = (e) => {
            e.preventDefault();
            openCommunityModal();
        };
    }

    bindNavigationItems();
}

function bindNavigationItems() {
    const navItems = document.querySelectorAll('.drawer-nav-item[data-nav]');
    navItems.forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const targetNav = item.getAttribute('data-nav');
            if (targetNav) {
                if (window.location.pathname.includes('submit')) {
                    window.location.href = `./index.html?view=${targetNav}`;
                } else {
                    switchView(targetNav);
                }
            }
        };
    });
}
