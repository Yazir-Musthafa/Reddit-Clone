import { showToast } from '../../js/interactions.js';

export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const askBtn = document.getElementById('askBtn');

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    showToast(`Searching Reddit for: "${query}"`);
                }
            }
        });
    }

    if (askBtn) {
        askBtn.addEventListener('click', () => {
            showToast('Reddit Ask feature coming soon!');
        });
    }
}
