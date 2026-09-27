import { loadComponent } from './component-loader.js';
import { initShell, renderRightColumn } from './shell.js';
import { initPostCreate } from '../components/post-create/post-create.js';
import { openAuthModal } from './interactions.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { isLoggedIn } = await initShell();
    renderRightColumn('footer');

    if (!isLoggedIn) {
        document.getElementById('feed-container').innerHTML = `
            <div class="rc-empty-state">
                <h3>Log in to create a post</h3>
                <p>You need a Reddit account to post to communities.</p>
                <button class="ui-btn ui-btn-primary" id="submitLoginBtn">Log In</button>
            </div>`;
        document.getElementById('submitLoginBtn').onclick = () => openAuthModal('Log In');
        openAuthModal('Log In');
        return;
    }

    await loadComponent('#feed-container', './components/post-create/post-create.html');
    initPostCreate();
});
