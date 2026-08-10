import { showToast } from '../../js/interactions.js';

const popularCommunities = [
    {
        name: 'r/DestinyTheGame',
        members: '3,373,255 members',
        bgColor: '#0F172A',
        symbol: '❖',
        symbolColor: '#CBD5E1'
    },
    {
        name: 'r/anime',
        members: '14,376,252 members',
        bgColor: '#FCE7F3',
        symbol: '⛩️',
        symbolColor: '#DB2777'
    },
    {
        name: 'r/destiny2',
        members: '954,236 members',
        bgColor: '#334155',
        symbol: '🛡️',
        symbolColor: '#E2E8F0'
    },
    {
        name: 'r/FortniteBR',
        members: '5,695,682 members',
        bgColor: '#7E22CE',
        symbol: '⚡',
        symbolColor: '#FDE047'
    },
    {
        name: 'r/dndnext',
        members: '825,214 members',
        bgColor: '#0F172A',
        symbol: '&',
        symbolColor: '#EF4444'
    }
];

export function initCommunities() {
    const listContainer = document.getElementById('communitiesList');
    const seeMoreBtn = document.getElementById('seeMoreCommunitiesBtn');
    const clearRecentBtn = document.getElementById('btnClearRecent');
    const recentPostsWidget = document.getElementById('recentPostsWidget');

    if (listContainer) {
        listContainer.innerHTML = popularCommunities.map(item => `
            <div class="community-item" data-community="${item.name}">
                <div class="community-avatar-img" style="background-color: ${item.bgColor}; display: flex; align-items: center; justify-content: center; color: ${item.symbolColor}; font-weight: 700; font-size: 14px;">
                    ${item.symbol}
                </div>
                <div class="community-info">
                    <span class="community-name">${item.name}</span>
                    <span class="community-members">${item.members}</span>
                </div>
            </div>
        `).join('');

        listContainer.querySelectorAll('.community-item').forEach(el => {
            el.addEventListener('click', () => {
                const name = el.getAttribute('data-community');
                showToast(`Navigating to ${name}`);
            });
        });
    }

    if (seeMoreBtn) {
        seeMoreBtn.addEventListener('click', () => {
            showToast('Loading more popular communities...');
        });
    }

    if (clearRecentBtn && recentPostsWidget) {
        clearRecentBtn.addEventListener('click', () => {
            recentPostsWidget.style.display = 'none';
            showToast('Cleared recent posts');
        });
    }
}
