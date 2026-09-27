import { api } from '../../js/api.js';
import { escapeHtml, formatNumber, formatCount, communityIcon, readLocal, writeLocal, homeViewUrl, isIndexPage } from '../../js/utils.js';

export async function initCommunities() {
    const listContainer = document.getElementById('communitiesList');
    const seeMoreBtn = document.getElementById('seeMoreCommunitiesBtn');

    renderRecentPosts();

    if (!listContainer) return;
    let expanded = false;
    let communities = [];

    const render = () => {
        const shown = communities.slice(0, expanded ? 10 : 5);
        listContainer.innerHTML = shown.map(item => `
            <a class="community-item" href="community.html?name=${encodeURIComponent(item.name)}" data-community="${escapeHtml(item.name)}">
                ${communityIcon(item, 32)}
                <div class="community-info">
                    <span class="community-name">r/${escapeHtml(item.name)}</span>
                    <span class="community-members">${formatNumber(item.memberCount)} members</span>
                </div>
            </a>`).join('');
        if (seeMoreBtn) seeMoreBtn.textContent = expanded ? 'Explore all communities' : 'See more';
    };

    try {
        ({ communities } = await api.get('/communities?limit=10'));
        render();
    } catch (err) {
        listContainer.innerHTML = `<p class="rc-widget-error">${escapeHtml(err.message)}</p>`;
    }

    if (seeMoreBtn) {
        seeMoreBtn.onclick = async () => {
            if (!expanded) {
                expanded = true;
                render();
            } else if (isIndexPage()) {
                const { switchView } = await import('../../js/router.js');
                switchView('explore');
            } else {
                window.location.href = homeViewUrl('explore');
            }
        };
    }
}

function renderRecentPosts() {
    const widget = document.getElementById('recentPostsWidget');
    const list = document.getElementById('recentPostsList');
    if (!widget || !list) return;

    const recent = readLocal('rc_recent_posts', []).slice(0, 5);
    widget.classList.toggle('hidden', recent.length === 0);
    list.innerHTML = recent.map(p => `
        <a class="recent-post-item" href="post.html?id=${encodeURIComponent(p.id)}">
            <div class="recent-post-info">
                <div class="recent-post-meta">
                    ${communityIcon(p.community, 18)}
                    <span class="recent-sub-name">r/${escapeHtml(p.community.name)}</span>
                </div>
                <h4 class="recent-post-title">${escapeHtml(p.title)}</h4>
                <span class="recent-post-stats">${formatCount(p.score)} upvotes • ${formatCount(p.commentCount)} comments</span>
            </div>
            ${p.thumb ? `<div class="recent-post-thumb"><img src="${escapeHtml(p.thumb)}" alt=""></div>` : ''}
        </a>`).join('');

    const clearBtn = document.getElementById('btnClearRecent');
    if (clearBtn) {
        clearBtn.onclick = () => {
            writeLocal('rc_recent_posts', []);
            widget.classList.add('hidden');
        };
    }
}
