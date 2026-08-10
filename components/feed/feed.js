import { showToast } from '../../js/interactions.js';

const sampleCompactPosts = [
    {
        community: 'r/goattravel',
        avatarBg: '#0284C7',
        time: '5h ago',
        title: "Spotted a rare Malabar Hornbill on my Airbnb's balcony.",
        thumb: 'assets/images/post_jeanne_darc.png',
        badge: '0:23',
        votes: '659',
        comments: '32'
    },
    {
        community: 'r/kollywood',
        avatarBg: '#DC2626',
        time: '23h ago',
        title: "Ava peru Chandra da ❤️",
        thumb: 'assets/images/post_barbie_shocked.png',
        badge: '',
        votes: '1.2K',
        comments: '27'
    },
    {
        community: 'r/VillagePorn',
        avatarBg: '#059669',
        time: '2d ago',
        title: "The medieval town of Vianden and its castle overlooking the Our River, Luxembourg [OC]",
        thumb: 'assets/images/post_fashion_party.png',
        badge: '',
        votes: '926',
        comments: '11'
    },
    {
        community: 'r/IndianBeautyTalks',
        avatarBg: '#EC4899',
        time: '1d ago',
        title: "HOWS THE BOLD EYE MAKEUP? :33",
        thumb: 'assets/images/post_ice_cream.png',
        badge: '0:07',
        votes: '889',
        comments: '218'
    },
    {
        community: 'r/IndianCooking',
        avatarBg: '#D97706',
        time: '2d ago',
        title: "Lunch",
        thumb: 'assets/images/post_barbie_meme.png',
        badge: '3',
        votes: '160',
        comments: '28'
    },
    {
        community: 'r/acrylicpainting',
        avatarBg: '#7C3AED',
        time: '4d ago',
        title: "Some Acrylic GLASS PAINTINGS I made recently! Which one do you like best ?",
        thumb: 'assets/images/post_jeanne_darc.png',
        badge: '8',
        votes: '3.5K',
        comments: '142'
    }
];

let originalPostsHTML = '';
let currentViewMode = 'card'; // 'card' or 'compact'

export function initFeed() {
    const sortBtn = document.getElementById('feedSortDropdownBtn') || document.getElementById('popularSortDropdownBtn');
    const sortMenu = document.getElementById('feedSortDropdownMenu') || document.getElementById('popularSortDropdownMenu');
    const currentSortLabel = document.getElementById('currentSortLabel') || document.getElementById('popularCurrentSortLabel');

    const viewBtn = document.getElementById('feedViewDropdownBtn') || document.getElementById('popularViewDropdownBtn');
    const viewMenu = document.getElementById('feedViewDropdownMenu') || document.getElementById('popularViewDropdownMenu');

    const postsFeed = document.querySelector('.posts-feed') || document.getElementById('posts-list-slot');

    if (postsFeed && !originalPostsHTML) {
        originalPostsHTML = postsFeed.innerHTML;
    }

    // Check initial URL parameters for feedViewType
    const urlParams = new URLSearchParams(window.location.search);
    const urlViewType = urlParams.get('feedViewType');
    if (urlViewType === 'compactView') {
        setFeedViewMode('compact', postsFeed, viewMenu);
    } else if (urlViewType === 'cardView') {
        setFeedViewMode('card', postsFeed, viewMenu);
    }

    // --- SORT DROPDOWN INTERACTION ---
    if (sortBtn && sortMenu) {
        sortBtn.onclick = (e) => {
            e.stopPropagation();
            if (viewMenu) viewMenu.classList.add('hidden');
            sortMenu.classList.toggle('hidden');
            sortBtn.setAttribute('aria-expanded', !sortMenu.classList.contains('hidden'));
        };

        sortMenu.onclick = (e) => {
            e.stopPropagation();
        };

        const sortItems = sortMenu.querySelectorAll('[data-sort]');
        sortItems.forEach(item => {
            item.onclick = () => {
                const selectedSort = item.getAttribute('data-sort');
                if (currentSortLabel) {
                    currentSortLabel.textContent = selectedSort;
                }
                sortItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                sortMenu.classList.add('hidden');
                sortBtn.setAttribute('aria-expanded', 'false');

                showToast(`Sorted feed by ${selectedSort}`);
            };
        });
    }

    // --- VIEW DROPDOWN INTERACTION ---
    if (viewBtn && viewMenu) {
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            if (sortMenu) sortMenu.classList.add('hidden');
            viewMenu.classList.toggle('hidden');
            viewBtn.setAttribute('aria-expanded', !viewMenu.classList.contains('hidden'));
        };

        viewMenu.onclick = (e) => {
            e.stopPropagation();
        };

        const viewItems = viewMenu.querySelectorAll('[data-view]');
        viewItems.forEach(item => {
            item.onclick = () => {
                const selectedView = item.getAttribute('data-view');
                setFeedViewMode(selectedView, postsFeed, viewMenu);
                viewMenu.classList.add('hidden');
                viewBtn.setAttribute('aria-expanded', 'false');

                // Update URL parameter without reload
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('feedViewType', selectedView === 'compact' ? 'compactView' : 'cardView');
                window.history.replaceState({}, '', newUrl.toString());

                showToast(`Switched view to ${selectedView === 'compact' ? 'Compact' : 'Card'} mode`);
            };
        });
    }

    // --- GLOBAL OUTSIDE CLICK HANDLER ---
    document.addEventListener('click', (e) => {
        if (sortBtn && sortMenu && !sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.classList.add('hidden');
            sortBtn.setAttribute('aria-expanded', 'false');
        }
        if (viewBtn && viewMenu && !viewBtn.contains(e.target) && !viewMenu.contains(e.target)) {
            viewMenu.classList.add('hidden');
            viewBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

function setFeedViewMode(viewMode, postsContainer, viewMenu) {
    currentViewMode = viewMode;
    const viewBtn = document.getElementById('feedViewDropdownBtn') || document.getElementById('popularViewDropdownBtn');

    if (viewBtn) {
        const iconSvg = viewBtn.querySelector('.view-icon-svg');
        if (iconSvg) {
            if (viewMode === 'compact') {
                iconSvg.innerHTML = `
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                `;
            } else {
                iconSvg.innerHTML = `
                    <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                `;
            }
        }
    }

    if (!postsContainer) return;

    if (viewMenu) {
        const viewItems = viewMenu.querySelectorAll('[data-view]');
        viewItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewMode);
        });
    }

    if (viewMode === 'compact') {
        // Save current card view HTML BEFORE switching to compact
        if (!postsContainer.classList.contains('compact-view-active') && postsContainer.innerHTML.trim() !== '') {
            originalPostsHTML = postsContainer.innerHTML;
        }
        postsContainer.classList.add('compact-view-active');
        renderCompactPosts(postsContainer);
    } else {
        postsContainer.classList.remove('compact-view-active');
        if (originalPostsHTML && originalPostsHTML.trim() !== '') {
            postsContainer.innerHTML = originalPostsHTML;
        } else {
            renderCardPostsFallback(postsContainer);
        }
    }
}

function renderCardPostsFallback(container) {
    container.innerHTML = `
        <article class="post-card">
            <header class="post-header">
                <div class="post-meta-left">
                    <div class="community-icon avatar-orange-circle">
                        <span>🎮</span>
                    </div>
                    <a href="#" class="post-community-name">r/IndianGaming</a>
                    <span class="post-dot-separator">•</span>
                    <span class="post-timestamp">1 day ago</span>
                    <span class="post-dot-separator">•</span>
                    <span class="post-meta-tag">Popular near you</span>
                </div>
                <div class="post-meta-right">
                    <button class="btn-post-join">Join</button>
                    <button class="btn-post-more"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg></button>
                </div>
            </header>

            <h2 class="post-title">Those Were Golden Days</h2>

            <div class="post-carousel-container">
                <img src="assets/images/post_barbie_meme.png" alt="Meme hero" class="post-image">
            </div>

            <footer class="post-action-bar">
                <div class="action-pill vote-pill">
                    <button class="vote-btn vote-up"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                    <span class="vote-count">3.5K</span>
                    <button class="vote-btn vote-down"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></button>
                </div>
                <button class="action-pill comment-pill">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>66</span>
                </button>
                <button class="action-pill share-pill">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                    <span>Share</span>
                </button>
            </footer>
        </article>

        <article class="post-card">
            <header class="post-header">
                <div class="post-meta-left">
                    <div class="community-icon avatar-pink-circle">
                        <span>🏖️</span>
                    </div>
                    <a href="#" class="post-community-name">r/Visakhapatnam</a>
                    <span class="post-dot-separator">•</span>
                    <span class="post-timestamp">2 days ago</span>
                    <span class="post-dot-separator">•</span>
                    <span class="post-meta-tag">Suggested for you</span>
                </div>
                <div class="post-meta-right">
                    <button class="btn-post-join">Join</button>
                    <button class="btn-post-more"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg></button>
                </div>
            </header>

            <h2 class="post-title">I got bored at the beach and apparently became a sand artist</h2>

            <div class="post-carousel-container">
                <img src="assets/images/post_ice_cream.png" alt="Beach art" class="post-image">
            </div>

            <footer class="post-action-bar">
                <div class="action-pill vote-pill">
                    <button class="vote-btn vote-up"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                    <span class="vote-count">1.2K</span>
                    <button class="vote-btn vote-down"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></button>
                </div>
                <button class="action-pill comment-pill">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>94</span>
                </button>
                <button class="action-pill share-pill">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                    <span>Share</span>
                </button>
            </footer>
        </article>
    `;
}

function renderCompactPosts(container) {
    container.innerHTML = sampleCompactPosts.map(post => `
        <article class="compact-post-card">
            <div class="compact-thumb">
                <img src="${post.thumb}" alt="${post.title}" class="compact-thumb-img">
                ${post.badge ? `<span class="compact-badge">${post.badge}</span>` : ''}
            </div>
            <div class="compact-body">
                <div class="compact-header">
                    <div class="compact-community-avatar" style="background-color: ${post.avatarBg}">
                        ${post.community.charAt(2).toUpperCase()}
                    </div>
                    <a href="#" class="compact-community-name">${post.community}</a>
                    <button class="compact-btn-join">Join</button>
                    <span>•</span>
                    <span>${post.time}</span>
                </div>
                <h2 class="compact-title">${post.title}</h2>
                <div class="compact-footer">
                    <button class="compact-pill" title="Expand media">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                    <button class="compact-pill" title="Vote">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                        <span>${post.votes}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    </button>
                    <button class="compact-pill" title="Comments">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span>${post.comments} comments</span>
                    </button>
                    <button class="compact-pill">Repost</button>
                    <button class="compact-pill">Award</button>
                    <button class="compact-pill">Share</button>
                    <button class="compact-pill" title="Options">• • •</button>
                </div>
            </div>
        </article>
    `).join('');
}
