import { isIndexPage } from '../../js/utils.js';

export function initFooter() {
    // On the home page, feed links switch views in place instead of reloading.
    if (!isIndexPage()) return;
    document.querySelectorAll('.footer-link[data-nav]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const { switchView } = await import('../../js/router.js');
            switchView(link.dataset.nav);
        });
    });
}
