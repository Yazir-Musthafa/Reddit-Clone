import { openAuthModal, openProviderNotice, showToast } from '../../js/interactions.js';
import { openCommunityModal } from '../community-modal/community-modal.js';
import { authState } from '../../js/auth-state.js';
import { api } from '../../js/api.js';
import { formDialog } from '../../js/ui.js';
import { escapeHtml, communityIcon, getParam, isIndexPage, readLocal, writeLocal } from '../../js/utils.js';

export function initSidebar() {
    const providers = { btnGoogle: 'google', btnApple: 'apple', btnPhone: 'phone' };
    Object.entries(providers).forEach(([id, provider]) => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = () => openProviderNotice(provider);
    });
    const emailBtn = document.getElementById('btnEmail');
    if (emailBtn) emailBtn.onclick = () => openAuthModal('Sign Up');
}

export function initAuthedSidebar() {
    const mainLayout = document.querySelector('.main-layout');
    const sidebarContainer = document.getElementById('sidebar-container');

    const setCollapsed = (collapsed) => {
        if (!mainLayout || !sidebarContainer) return;
        sidebarContainer.classList.toggle('collapsed', collapsed);
        mainLayout.classList.toggle('sidebar-collapsed', collapsed);
        writeLocal('rc_sidebar_collapsed', collapsed);
    };
    if (readLocal('rc_sidebar_collapsed', false)) setCollapsed(true);

    // On phones the sidebar is hidden by default, so the header button opens it as an overlay drawer.
    const mobile = window.matchMedia('(max-width: 767px)');
    document.querySelectorAll('#drawerToggleBtn, #fixedDrawerToggleBtn, #headerDrawerToggleBtn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (mobile.matches) sidebarContainer.classList.toggle('mobile-open');
            else setCollapsed(!sidebarContainer.classList.contains('collapsed'));
        };
    });
    document.addEventListener('click', (e) => {
        if (sidebarContainer.classList.contains('mobile-open') && !sidebarContainer.contains(e.target)) {
            sidebarContainer.classList.remove('mobile-open');
        }
    });

    const startCommBtn = document.getElementById('btnStartCommunity');
    if (startCommBtn) {
        startCommBtn.onclick = (e) => {
            e.preventDefault();
            openCommunityModal();
        };
    }

    // Collapsible sections, remembered per browser.
    const collapsedSections = readLocal('rc_sidebar_sections', {});
    document.querySelectorAll('#sidebarAuthedDrawer .drawer-accordion').forEach(section => {
        const header = section.querySelector('.accordion-header');
        const key = header.textContent.trim();
        const apply = () => {
            section.classList.toggle('collapsed', !!collapsedSections[key]);
            header.setAttribute('aria-expanded', String(!collapsedSections[key]));
        };
        apply();
        header.onclick = () => {
            collapsedSections[key] = !collapsedSections[key];
            writeLocal('rc_sidebar_sections', collapsedSections);
            apply();
        };
    });

    const createFeedBtn = document.getElementById('btnCreateCustomFeed');
    if (createFeedBtn) {
        createFeedBtn.onclick = (e) => {
            e.preventDefault();
            openCustomFeedDialog();
        };
    }

    renderUserLists();
    authState.subscribe(renderUserLists);
    bindNavigationItems();
}

function renderUserLists() {
    const user = authState.user;
    if (!user) return;
    const commList = document.getElementById('sidebarCommunityList');
    const feedList = document.getElementById('sidebarCustomFeeds');
    const activeCommunity = window.location.pathname.endsWith('community.html') ? (getParam('name') || '').toLowerCase() : '';
    const activeFeed = getParam('view') === 'custom' ? getParam('feed') : '';

    if (commList) {
        commList.innerHTML = user.joinedCommunities.length
            ? user.joinedCommunities.map(c => `
                <a href="community.html?name=${encodeURIComponent(c.name)}" class="drawer-nav-item sub-item ${c.name.toLowerCase() === activeCommunity ? 'active' : ''}">
                    ${communityIcon(c, 24)}<span>r/${escapeHtml(c.name)}</span>
                </a>`).join('')
            : '<p class="rc-sidebar-hint">Join communities to see them here.</p>';
    }

    if (feedList) {
        feedList.innerHTML = user.customFeeds.map(f => `
            <a href="index.html?view=custom&feed=${encodeURIComponent(f.id)}" class="drawer-nav-item sub-item ${f.id === activeFeed ? 'active' : ''}" data-custom-feed="${escapeHtml(f.id)}">
                <span class="game-avatar">✨</span><span>${escapeHtml(f.name)}</span>
            </a>`).join('');
        bindNavigationItems();
    }
}

export async function openCustomFeedDialog(existing = null) {
    const user = authState.user;
    const selected = new Set((existing?.communities || []).map(c => c.name.toLowerCase()));
    const options = [...user.joinedCommunities, ...(existing?.communities || [])]
        .filter((c, i, arr) => arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i)
        .map(c => ({ value: c.name, html: `${communityIcon(c, 20)} r/${escapeHtml(c.name)}`, checked: selected.has(c.name.toLowerCase()) }));

    const result = await formDialog({
        title: existing ? 'Edit custom feed' : 'Create custom feed',
        subtitle: 'Combine communities you like into one feed.',
        submitLabel: existing ? 'Save' : 'Create',
        fields: [
            { name: 'name', label: 'Name', value: existing?.name || '', maxlength: 50, placeholder: 'e.g. Weekend reads' },
            { name: 'description', label: 'Description (optional)', type: 'textarea', rows: 2, value: existing?.description || '', maxlength: 300 },
            { name: 'communities', label: 'Communities', type: 'checkboxes', options, hint: options.length ? '' : 'Join some communities first, then add them here.' }
        ],
        onSubmit: async (values) => {
            if (!values.name.trim()) throw new Error('Give your custom feed a name');
            if (existing) {
                const { user: updated } = await api.patch(`/users/me/feeds/${existing.id}`, values);
                authState.setUser(updated);
                return existing.id;
            }
            const { user: updated, feedId } = await api.post('/users/me/feeds', values);
            authState.setUser(updated);
            return feedId;
        }
    });

    if (result) {
        showToast(existing ? 'Custom feed updated' : 'Custom feed created');
        window.location.href = `index.html?view=custom&feed=${encodeURIComponent(result)}`;
    }
}

/** On the home page, nav links switch views in place; elsewhere they are plain links. */
function bindNavigationItems() {
    if (!isIndexPage()) return;
    document.querySelectorAll('#sidebarAuthedDrawer .drawer-nav-item[data-nav], #sidebarAuthedDrawer [data-custom-feed]').forEach(item => {
        item.onclick = async (e) => {
            e.preventDefault();
            const { switchView } = await import('../../js/router.js');
            if (item.dataset.customFeed) switchView('custom', { feed: item.dataset.customFeed });
            else switchView(item.dataset.nav);
        };
    });
}

export function setActiveNav(view, feedId = '') {
    document.querySelectorAll('#sidebarAuthedDrawer .drawer-nav-item[data-nav]').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === view);
    });
    document.querySelectorAll('#sidebarAuthedDrawer [data-custom-feed]').forEach(item => {
        item.classList.toggle('active', view === 'custom' && item.dataset.customFeed === feedId);
    });
}
