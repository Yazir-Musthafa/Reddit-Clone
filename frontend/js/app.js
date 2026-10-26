import { usePage } from '../react/usePage.js';
import { initShell } from './shell.js';
import { switchView } from './router.js';
import { getParam } from './utils.js';

async function initializePage() {
    await initShell();
    await switchView(getParam('view') || 'home', {
        feed: getParam('feed'),
        sort: getParam('sort'),
        t: getParam('t')
    }, { replace: true });
};


export default function Page() {
    usePage(initializePage);
    return null;
}
