import { showToast } from '../../js/interactions.js';

export function initFooter() {
    const footerLinks = document.querySelectorAll('.footer-link');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showToast(`Opening ${link.textContent}`);
        });
    });
}
