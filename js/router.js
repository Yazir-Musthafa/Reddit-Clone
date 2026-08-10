import { loadComponent } from './component-loader.js';
import { initFeed } from '../components/feed/feed.js';
import { initPost } from '../components/post/post.js';
import { initExplore } from '../components/explore/explore.js';
import { initCommunities } from '../components/popular-communities/communities.js';
import { initFooter } from '../components/footer/footer.js';
import { authState } from './auth-state.js';

let currentView = 'home';

export async function switchView(viewName) {
    currentView = viewName;
    const mainLayout = document.querySelector('.main-layout');
    const feedContainer = document.getElementById('feed-container');
    const rightCol = document.querySelector('.right-column-container');
    const navItems = document.querySelectorAll('.drawer-nav-item[data-nav]');
    const isLoggedIn = authState.getState()?.isLoggedIn;

    // Update active nav styling
    navItems.forEach(item => {
        if (item.getAttribute('data-nav') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (viewName === 'home') {
        mainLayout?.classList.remove('no-right-col');
        if (rightCol) rightCol.style.display = 'flex';

        if (feedContainer) {
            const feedTemplate = isLoggedIn ? './components/feed/feed-authed.html' : './components/feed/feed.html';
            await loadComponent('#feed-container', feedTemplate);
            initFeed();
            
            const postsSlot = document.getElementById('posts-list-slot');
            if (postsSlot) {
                await loadComponent('#posts-list-slot', './components/post/post.html');
            }
            initPost();
        }

        // Home Page Right Column: POPULAR COMMUNITIES + FOOTER (NO Recent Posts widget!)
        if (rightCol) {
            rightCol.innerHTML = '<div id="communities-container"></div><div id="footer-container"></div>';
            await loadComponent('#communities-container', './components/popular-communities/communities-home.html');
            initCommunities();
            await loadComponent('#footer-container', './components/footer/footer.html');
            initFooter();
        }
    } else if (viewName === 'popular') {
        mainLayout?.classList.remove('no-right-col');
        if (rightCol) rightCol.style.display = 'flex';

        if (feedContainer) {
            await loadComponent('#feed-container', './components/feed/popular-feed.html');
        }

        // Popular Page Right Column: RECENT POSTS + POPULAR COMMUNITIES + FOOTER
        if (rightCol) {
            rightCol.innerHTML = '<div id="communities-container"></div><div id="footer-container"></div>';
            await loadComponent('#communities-container', './components/popular-communities/communities.html');
            initCommunities();
            await loadComponent('#footer-container', './components/footer/footer.html');
            initFooter();
        }
    } else if (viewName === 'news') {
        // News view occupies center AND right side completely without right sidebar widget column!
        mainLayout?.classList.add('no-right-col');
        if (rightCol) rightCol.style.display = 'none';

        if (feedContainer) {
            await loadComponent('#feed-container', './components/feed/news-feed.html');
        }
    } else if (viewName === 'explore') {
        // Explore view occupies center AND right side completely without right sidebar widget column!
        mainLayout?.classList.add('no-right-col');
        if (rightCol) rightCol.style.display = 'none';

        if (feedContainer) {
            await loadComponent('#feed-container', './components/explore/explore.html');
            initExplore();
        }
    }
}
