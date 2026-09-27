import { initShell } from './shell.js';
import { switchView } from './router.js';
import { getParam } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    await switchView(getParam('view') || 'home', {
        feed: getParam('feed'),
        sort: getParam('sort'),
        t: getParam('t')
    }, { replace: true });
});
