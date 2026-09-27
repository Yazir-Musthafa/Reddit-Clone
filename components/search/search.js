import { api } from '../../js/api.js';
import { escapeHtml, debounce, communityIcon, userAvatar, formatCount, getParam } from '../../js/utils.js';

function goToSearch(query, type) {
    const params = new URLSearchParams({ q: query });
    if (type) params.set('type', type);
    window.location.href = `search.html?${params}`;
}

export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const askBtn = document.getElementById('askBtn');
    const suggest = document.getElementById('searchSuggest');
    if (!searchInput) return;

    // Keep the query visible on the results page.
    if (window.location.pathname.endsWith('search.html')) searchInput.value = getParam('q') || '';

    const hide = () => {
        suggest.classList.add('hidden');
        searchInput.setAttribute('aria-expanded', 'false');
    };

    const render = debounce(async () => {
        const q = searchInput.value.trim();
        if (!q) return hide();
        try {
            const { communities, users } = await api.get(`/search/suggest?q=${encodeURIComponent(q)}`);
            if (searchInput.value.trim() !== q) return;
            suggest.innerHTML = `
                ${communities.length ? '<div class="rc-suggest-label">Communities</div>' : ''}
                ${communities.map(c => `
                    <a class="rc-suggest-item" href="community.html?name=${encodeURIComponent(c.name)}" role="option">
                        ${communityIcon(c, 28)}
                        <span><strong>r/${escapeHtml(c.name)}</strong><small>${formatCount(c.memberCount)} members</small></span>
                    </a>`).join('')}
                ${users.length ? '<div class="rc-suggest-label">People</div>' : ''}
                ${users.map(u => `
                    <a class="rc-suggest-item" href="user.html?u=${encodeURIComponent(u.username)}" role="option">
                        ${userAvatar(u, 28)}
                        <span><strong>u/${escapeHtml(u.username)}</strong></span>
                    </a>`).join('')}
                <a class="rc-suggest-item rc-suggest-all" href="search.html?q=${encodeURIComponent(q)}" role="option">
                    <span class="rc-suggest-search-icon">🔍</span>
                    <span>Search for “${escapeHtml(q)}”</span>
                </a>`;
            suggest.classList.remove('hidden');
            searchInput.setAttribute('aria-expanded', 'true');
        } catch {
            hide();
        }
    }, 200);

    searchInput.addEventListener('input', render);
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) render(); });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) goToSearch(query);
        } else if (e.key === 'Escape') {
            hide();
            searchInput.blur();
        }
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchContainer')) hide();
    });

    if (askBtn) {
        askBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                goToSearch(query, 'posts');
            } else {
                searchInput.placeholder = 'Ask a question, then press Enter';
                searchInput.focus();
            }
        });
    }
}
