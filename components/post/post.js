import { openAuthModal, showToast } from '../../js/interactions.js';
import { authState } from '../../js/auth-state.js';

const carouselImages = [
    'assets/images/post_barbie_meme.png',
    'assets/images/post_barbie_shocked.png',
    'assets/images/post_barbie_meme.png'
];

let currentImageIndex = 0;
let currentVote = 0; // -1, 0, 1
const initialVotes = 841;

export function initPost() {
    renderUserCreatedPosts();

    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const imgEl = document.getElementById('carouselImg');
    const dots = document.querySelectorAll('#carouselDots .dot');
    
    const voteUpBtn = document.getElementById('voteUpBtn');
    const voteDownBtn = document.getElementById('voteDownBtn');
    const voteCountEl = document.getElementById('voteCount');
    
    const commentBtn = document.getElementById('commentBtn');
    const shareBtn = document.getElementById('shareBtn');
    const joinBtn = document.getElementById('postJoinBtn');

    // Carousel update logic
    function updateCarousel(index) {
        if (!imgEl) return;
        currentImageIndex = (index + carouselImages.length) % carouselImages.length;
        imgEl.src = carouselImages[currentImageIndex];
        
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentImageIndex);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => updateCarousel(currentImageIndex - 1));
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => updateCarousel(currentImageIndex + 1));
    }

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => updateCarousel(idx));
    });

    // Voting logic for static post
    if (voteUpBtn && voteDownBtn && voteCountEl) {
        voteUpBtn.addEventListener('click', () => {
            if (currentVote === 1) {
                currentVote = 0;
                voteUpBtn.style.color = '';
            } else {
                currentVote = 1;
                voteUpBtn.style.color = '#FF4500';
                voteDownBtn.style.color = '';
            }
            voteCountEl.textContent = initialVotes + currentVote;
        });

        voteDownBtn.addEventListener('click', () => {
            if (currentVote === -1) {
                currentVote = 0;
                voteDownBtn.style.color = '';
            } else {
                currentVote = -1;
                voteDownBtn.style.color = '#7193FF';
                voteUpBtn.style.color = '';
            }
            voteCountEl.textContent = initialVotes + currentVote;
        });
    }

    // Join Button
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            if (joinBtn.textContent === 'Join') {
                joinBtn.textContent = 'Joined';
                joinBtn.style.backgroundColor = '#E5E8EA';
                joinBtn.style.color = '#1A1A1B';
                showToast('Joined r/PataHaiAajKyaHua');
            } else {
                joinBtn.textContent = 'Join';
                joinBtn.style.backgroundColor = '#000000';
                joinBtn.style.color = '#FFFFFF';
            }
        });
    }

    // Comment Button
    if (commentBtn) {
        commentBtn.addEventListener('click', () => {
            openAuthModal('Comment on Reddit');
        });
    }

    // Share Button
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard!');
            } else {
                showToast('Link copied!');
            }
        });
    }
}

export function renderUserCreatedPosts() {
    const userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
    if (userPosts.length === 0) return;

    const targetFeed = document.querySelector('.posts-feed') || document.getElementById('posts-list-slot');
    if (!targetFeed) return;

    userPosts.forEach(post => {
        const postId = post.id || ('post_' + Math.random().toString(36).substr(2, 9));
        // Prevent duplicate rendering
        if (targetFeed.querySelector(`[data-user-post-id="${postId}"]`)) return;

        const postCard = document.createElement('article');
        postCard.className = 'post-card user-published-card';
        postCard.setAttribute('data-user-post-id', postId);

        const commColor = post.communityColor || '#FF4500';
        const commAvatar = post.communityAvatar || 'r/';
        const commName = post.community || 'r/general';
        const tags = post.tags || [];
        const media = post.media || [];
        const commentsList = post.comments || [];
        let voteVal = post.userVote !== undefined ? post.userVote : 1;
        let voteCountNum = post.upvotes !== undefined ? post.upvotes : 1;

        // Tags HTML
        const tagsHtml = tags.length > 0 ? `
            <div class="post-tags-row">
                ${tags.map(t => `<span class="post-tag-chip">${t}</span>`).join('')}
            </div>
        ` : '';

        // Media Gallery HTML
        let mediaHtml = '';
        if (media.length > 0) {
            mediaHtml = `<div class="post-media-gallery">
                ${media.map(m => {
                    if (m.type === 'image') return `<img src="${m.url}" alt="Post image attachment">`;
                    if (m.type === 'video') return `<video controls src="${m.url}"></video>`;
                    return '';
                }).join('')}
            </div>`;
        }

        postCard.innerHTML = `
            <header class="post-header">
                <div class="post-meta-left">
                    <div class="community-icon" style="background-color: ${commColor}; color: white;">
                        <span class="community-avatar-text">${commAvatar}</span>
                    </div>
                    <a href="#" class="post-community-name">${commName}</a>
                    <span class="post-dot-separator">•</span>
                    <span class="post-timestamp">${post.time || 'Just now'}</span>
                    <span class="post-dot-separator">•</span>
                    <span class="post-timestamp">u/${post.author || 'Fantastic-Series2270'}</span>
                </div>
                <div class="post-meta-right">
                    <button class="btn-post-join joined">Joined</button>
                    <div class="post-options-wrapper">
                        <button class="btn-post-more" class="btnPostMore_${postId}" aria-label="Options">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg>
                        </button>
                        <div class="post-options-menu hidden" id="optionsMenu_${postId}">
                            <button class="post-option-item delete-option" id="deletePostBtn_${postId}">
                                <span>🗑️</span> Delete Post
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            ${tagsHtml}
            <h2 class="post-title" style="text-transform: none; margin-bottom: 8px;">${post.title}</h2>
            ${post.body ? `<div class="post-body-rich">${post.body}</div>` : ''}
            ${mediaHtml}

            <footer class="post-action-bar">
                <div class="action-pill vote-pill">
                    <button class="vote-btn vote-up" id="upvoteBtn_${postId}" style="color: ${voteVal === 1 ? '#FF4500' : ''};">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    </button>
                    <span class="vote-count" id="voteCount_${postId}">${voteCountNum}</span>
                    <button class="vote-btn vote-down" id="downvoteBtn_${postId}" style="color: ${voteVal === -1 ? '#7193FF' : ''};">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    </button>
                </div>

                <button class="action-pill comment-pill" id="commentBtn_${postId}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span id="commentCountLabel_${postId}">${commentsList.length}</span>
                </button>

                <button class="action-pill share-pill" id="shareBtn_${postId}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                    <span>Share</span>
                </button>
            </footer>

            <!-- Inline Comment Section -->
            <div class="post-comments-container hidden" id="commentSec_${postId}">
                <div class="comment-input-row">
                    <input type="text" class="comment-text-input" id="commentInput_${postId}" placeholder="What are your thoughts?">
                    <button class="btn-submit-comment" id="submitCommentBtn_${postId}">Comment</button>
                </div>
                <div class="comments-list-box" id="commentsListBox_${postId}">
                    ${commentsList.map(c => `
                        <div class="comment-item">
                            <div class="comment-author-line">
                                <span class="comment-author-name">u/${c.author}</span>
                                <span class="comment-time">• ${c.time || 'Just now'}</span>
                            </div>
                            <div class="comment-body-text">${c.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        targetFeed.prepend(postCard);

        // Bind Post Card Events
        const btnMore = postCard.querySelector('.btn-post-more');
        const optionsMenu = postCard.querySelector(`#optionsMenu_${postId}`);
        const deleteBtn = postCard.querySelector(`#deletePostBtn_${postId}`);
        const upvoteBtn = postCard.querySelector(`#upvoteBtn_${postId}`);
        const downvoteBtn = postCard.querySelector(`#downvoteBtn_${postId}`);
        const voteCountEl = postCard.querySelector(`#voteCount_${postId}`);
        const commentPill = postCard.querySelector(`#commentBtn_${postId}`);
        const commentSec = postCard.querySelector(`#commentSec_${postId}`);
        const commentInput = postCard.querySelector(`#commentInput_${postId}`);
        const submitCommentBtn = postCard.querySelector(`#submitCommentBtn_${postId}`);
        const commentsListBox = postCard.querySelector(`#commentsListBox_${postId}`);
        const commentCountLabel = postCard.querySelector(`#commentCountLabel_${postId}`);
        const shareBtn = postCard.querySelector(`#shareBtn_${postId}`);

        // Options dropdown toggle
        if (btnMore && optionsMenu) {
            btnMore.onclick = (e) => {
                e.stopPropagation();
                optionsMenu.classList.toggle('hidden');
            };
            document.addEventListener('click', () => optionsMenu.classList.add('hidden'));
        }

        // Delete post
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                let userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
                userPosts = userPosts.filter(p => p.id !== postId && p.title !== post.title);
                localStorage.setItem('user_created_posts', JSON.stringify(userPosts));
                postCard.remove();
                showToast('Post deleted');
            };
        }

        // Interactive voting
        if (upvoteBtn && downvoteBtn && voteCountEl) {
            upvoteBtn.onclick = () => {
                let userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
                const p = userPosts.find(item => item.id === postId || item.title === post.title);

                if (voteVal === 1) {
                    voteVal = 0;
                    voteCountNum -= 1;
                    upvoteBtn.style.color = '';
                } else {
                    if (voteVal === -1) voteCountNum += 1;
                    voteVal = 1;
                    voteCountNum += 1;
                    upvoteBtn.style.color = '#FF4500';
                    downvoteBtn.style.color = '';
                }
                voteCountEl.textContent = voteCountNum;

                if (p) {
                    p.userVote = voteVal;
                    p.upvotes = voteCountNum;
                    localStorage.setItem('user_created_posts', JSON.stringify(userPosts));
                }
            };

            downvoteBtn.onclick = () => {
                let userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
                const p = userPosts.find(item => item.id === postId || item.title === post.title);

                if (voteVal === -1) {
                    voteVal = 0;
                    voteCountNum += 1;
                    downvoteBtn.style.color = '';
                } else {
                    if (voteVal === 1) voteCountNum -= 1;
                    voteVal = -1;
                    voteCountNum -= 1;
                    downvoteBtn.style.color = '#7193FF';
                    upvoteBtn.style.color = '';
                }
                voteCountEl.textContent = voteCountNum;

                if (p) {
                    p.userVote = voteVal;
                    p.upvotes = voteCountNum;
                    localStorage.setItem('user_created_posts', JSON.stringify(userPosts));
                }
            };
        }

        // Comment toggle & submit
        if (commentPill && commentSec) {
            commentPill.onclick = () => {
                commentSec.classList.toggle('hidden');
                if (!commentSec.classList.contains('hidden')) {
                    commentInput?.focus();
                }
            };
        }

        if (submitCommentBtn && commentInput) {
            submitCommentBtn.onclick = () => {
                const text = commentInput.value.trim();
                if (!text) return;

                const currentUser = authState.getState()?.username || 'Fantastic-Series2270';
                const newComment = {
                    author: currentUser,
                    text: text,
                    time: 'Just now'
                };

                let userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
                const p = userPosts.find(item => item.id === postId || item.title === post.title);
                if (p) {
                    p.comments = p.comments || [];
                    p.comments.push(newComment);
                    localStorage.setItem('user_created_posts', JSON.stringify(userPosts));
                }

                // Render comment
                const commentEl = document.createElement('div');
                commentEl.className = 'comment-item';
                commentEl.innerHTML = `
                    <div class="comment-author-line">
                        <span class="comment-author-name">u/${newComment.author}</span>
                        <span class="comment-time">• ${newComment.time}</span>
                    </div>
                    <div class="comment-body-text">${newComment.text}</div>
                `;
                commentsListBox.appendChild(commentEl);
                commentInput.value = '';

                // Update count label
                const newCount = (p ? p.comments.length : (commentsList.length + 1));
                if (commentCountLabel) commentCountLabel.textContent = newCount;
                showToast('Comment added!');
            };
        }

        // Share Link
        if (shareBtn) {
            shareBtn.onclick = () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                }
                showToast('Link copied to clipboard!');
            };
        }
    });
}
