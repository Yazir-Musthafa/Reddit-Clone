import { showToast } from '../../js/interactions.js';
import { authState } from '../../js/auth-state.js';

export function initPostCreate() {
    const titleInput = document.getElementById('createPostTitle');
    const bodyEditor = document.getElementById('createPostBody');
    const submitBtn = document.getElementById('submitPostBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const draftsLink = document.getElementById('draftsLink');
    const draftsDropdownMenu = document.getElementById('draftsDropdownMenu');
    const draftsCountBadge = document.getElementById('draftsCountBadge');
    const draftsListContainer = document.getElementById('draftsListContainer');

    // Community Selector
    const communityBtn = document.getElementById('selectCommunityBtn');
    const communityDropdownMenu = document.getElementById('communityDropdownMenu');
    const selectedCommunityAvatar = document.getElementById('selectedCommunityAvatar');
    const selectedCommunityName = document.getElementById('selectedCommunityName');

    // Tags Selector
    const addTagsBtn = document.getElementById('addTagsBtn');
    const tagsPickerMenu = document.getElementById('tagsPickerMenu');
    const selectedTagsContainer = document.getElementById('selectedTagsContainer');

    // Media Files
    const tbImageBtn = document.getElementById('tbImageBtn');
    const tbVideoBtn = document.getElementById('tbVideoBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    const videoFileInput = document.getElementById('videoFileInput');
    const mediaPreviewGrid = document.getElementById('mediaPreviewGrid');

    // Toolbar Buttons
    const tbLinkBtn = document.getElementById('tbLinkBtn');
    const tbBoldBtn = document.getElementById('tbBoldBtn');
    const tbItalicBtn = document.getElementById('tbItalicBtn');
    const tbStrikeBtn = document.getElementById('tbStrikeBtn');
    const tbSuperBtn = document.getElementById('tbSuperBtn');
    const tbHeadingBtn = document.getElementById('tbHeadingBtn');
    const tbCodeBtn = document.getElementById('tbCodeBtn');
    const tbQuoteBtn = document.getElementById('tbQuoteBtn');
    const tbTableBtn = document.getElementById('tbTableBtn');
    const tbMoreBtn = document.getElementById('tbMoreBtn');
    const moreToolbarMenu = document.getElementById('moreToolbarMenu');
    const tbBulletListBtn = document.getElementById('tbBulletListBtn');
    const tbNumListBtn = document.getElementById('tbNumListBtn');
    const tbClearFormatBtn = document.getElementById('tbClearFormatBtn');

    // State Variables
    let currentCommunity = {
        name: 'r/PataHaiAajKyaHua',
        color: '#FF4500',
        avatar: 'p/'
    };
    let selectedTags = [];
    let attachedMedia = []; // [{ type: 'image'|'video', url: string, name: string }]

    // Update Draft Badge Count
    updateDraftsBadge();

    // Live update function for enabling/disabling Submit Button
    function updateSubmitButtonState() {
        if (!submitBtn) return;
        const hasTitle = titleInput ? titleInput.value.trim().length > 0 : false;
        const bodyText = bodyEditor ? (bodyEditor.innerText || bodyEditor.textContent || '').trim() : '';
        const hasBody = bodyText.length > 0 || (bodyEditor && bodyEditor.querySelectorAll('img, video, table, pre, blockquote').length > 0);
        const hasMedia = attachedMedia && attachedMedia.length > 0;

        if (hasTitle || hasBody || hasMedia) {
            submitBtn.disabled = false;
            submitBtn.classList.add('enabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.style.pointerEvents = 'auto';
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('enabled');
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    }

    // Attach Input Event Listeners
    if (titleInput) {
        ['input', 'keyup', 'change', 'blur', 'paste'].forEach(evt => {
            titleInput.addEventListener(evt, updateSubmitButtonState);
        });
    }

    if (bodyEditor) {
        ['input', 'keyup', 'blur', 'paste', 'DOMSubtreeModified'].forEach(evt => {
            bodyEditor.addEventListener(evt, updateSubmitButtonState);
        });
    }

    // Initial check
    updateSubmitButtonState();

    // 1. Community Selection
    if (communityBtn && communityDropdownMenu) {
        communityBtn.onclick = (e) => {
            e.stopPropagation();
            communityDropdownMenu.classList.toggle('hidden');
            tagsPickerMenu?.classList.add('hidden');
            draftsDropdownMenu?.classList.add('hidden');
            moreToolbarMenu?.classList.add('hidden');
        };

        communityDropdownMenu.querySelectorAll('.community-option-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const name = item.getAttribute('data-name');
                const color = item.getAttribute('data-color');
                const avatar = item.getAttribute('data-avatar');

                currentCommunity = { name, color, avatar };
                if (selectedCommunityName) selectedCommunityName.textContent = name;
                if (selectedCommunityAvatar) {
                    selectedCommunityAvatar.style.backgroundColor = color;
                    selectedCommunityAvatar.textContent = avatar;
                }
                communityDropdownMenu.classList.add('hidden');
            };
        });
    }

    // 2. Tags Picker
    if (addTagsBtn && tagsPickerMenu) {
        addTagsBtn.onclick = (e) => {
            e.stopPropagation();
            tagsPickerMenu.classList.toggle('hidden');
            communityDropdownMenu?.classList.add('hidden');
            draftsDropdownMenu?.classList.add('hidden');
            moreToolbarMenu?.classList.add('hidden');
        };

        tagsPickerMenu.querySelectorAll('.tag-option-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tag = btn.getAttribute('data-tag');
                if (!selectedTags.includes(tag)) {
                    selectedTags.push(tag);
                    renderTags();
                }
                tagsPickerMenu.classList.add('hidden');
            };
        });
    }

    function renderTags() {
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = selectedTags.map((t, idx) => `
            <div class="tag-badge-pill">
                <span>${t}</span>
                <span class="remove-tag-btn" data-index="${idx}">&times;</span>
            </div>
        `).join('');

        selectedTagsContainer.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                selectedTags.splice(index, 1);
                renderTags();
                updateSubmitButtonState();
            };
        });
        updateSubmitButtonState();
    }

    // 3. Media Upload Handlers
    if (tbImageBtn && imageFileInput) {
        tbImageBtn.onclick = () => imageFileInput.click();

        imageFileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    attachedMedia.push({
                        type: 'image',
                        url: evt.target.result,
                        name: file.name
                    });
                    renderMediaPreviews();
                    updateSubmitButtonState();
                };
                reader.readAsDataURL(file);
            });
            imageFileInput.value = '';
        };
    }

    if (tbVideoBtn && videoFileInput) {
        tbVideoBtn.onclick = () => videoFileInput.click();

        videoFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    attachedMedia.push({
                        type: 'video',
                        url: evt.target.result,
                        name: file.name
                    });
                    renderMediaPreviews();
                    updateSubmitButtonState();
                };
                reader.readAsDataURL(file);
            }
            videoFileInput.value = '';
        };
    }

    function renderMediaPreviews() {
        if (!mediaPreviewGrid) return;
        if (attachedMedia.length === 0) {
            mediaPreviewGrid.innerHTML = '';
            updateSubmitButtonState();
            return;
        }

        mediaPreviewGrid.innerHTML = attachedMedia.map((m, idx) => `
            <div class="media-preview-card">
                <button class="btn-remove-media" data-index="${idx}">&times;</button>
                ${m.type === 'image' 
                    ? `<img src="${m.url}" alt="${m.name}">` 
                    : `<video src="${m.url}" muted></video>`}
            </div>
        `).join('');

        mediaPreviewGrid.querySelectorAll('.btn-remove-media').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                attachedMedia.splice(index, 1);
                renderMediaPreviews();
                updateSubmitButtonState();
            };
        });
        updateSubmitButtonState();
    }

    // 4. Rich Text Formatting Actions
    function formatDoc(cmd, value = null) {
        document.execCommand(cmd, false, value);
        bodyEditor?.focus();
        updateSubmitButtonState();
    }

    if (tbBoldBtn) tbBoldBtn.onclick = () => formatDoc('bold');
    if (tbItalicBtn) tbItalicBtn.onclick = () => formatDoc('italic');
    if (tbStrikeBtn) tbStrikeBtn.onclick = () => formatDoc('strikeThrough');
    if (tbSuperBtn) tbSuperBtn.onclick = () => formatDoc('superscript');
    if (tbHeadingBtn) tbHeadingBtn.onclick = () => formatDoc('formatBlock', '<h2>');
    if (tbQuoteBtn) tbQuoteBtn.onclick = () => formatDoc('formatBlock', '<blockquote>');
    if (tbCodeBtn) tbCodeBtn.onclick = () => formatDoc('formatBlock', '<pre>');
    if (tbBulletListBtn) tbBulletListBtn.onclick = () => { formatDoc('insertUnorderedList'); moreToolbarMenu?.classList.add('hidden'); };
    if (tbNumListBtn) tbNumListBtn.onclick = () => { formatDoc('insertOrderedList'); moreToolbarMenu?.classList.add('hidden'); };
    if (tbClearFormatBtn) tbClearFormatBtn.onclick = () => { formatDoc('removeFormat'); moreToolbarMenu?.classList.add('hidden'); };

    if (tbLinkBtn) {
        tbLinkBtn.onclick = () => {
            const url = prompt('Enter link URL:', 'https://');
            if (url) {
                formatDoc('createLink', url);
            }
        };
    }

    if (tbTableBtn) {
        tbTableBtn.onclick = () => {
            const tableHtml = `
                <table>
                    <thead>
                        <tr><th>Header 1</th><th>Header 2</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Cell 1</td><td>Cell 2</td></tr>
                    </tbody>
                </table>
                <p><br></p>
            `;
            formatDoc('insertHTML', tableHtml);
        };
    }

    if (tbMoreBtn && moreToolbarMenu) {
        tbMoreBtn.onclick = (e) => {
            e.stopPropagation();
            moreToolbarMenu.classList.toggle('hidden');
        };
    }

    // Close all popovers when clicking outside
    document.addEventListener('click', (e) => {
        if (!communityBtn?.contains(e.target)) communityDropdownMenu?.classList.add('hidden');
        if (!addTagsBtn?.contains(e.target)) tagsPickerMenu?.classList.add('hidden');
        if (!draftsLink?.contains(e.target)) draftsDropdownMenu?.classList.add('hidden');
        if (!tbMoreBtn?.contains(e.target)) moreToolbarMenu?.classList.add('hidden');
    });

    // 5. Submit Post Handler
    if (submitBtn) {
        submitBtn.onclick = (e) => {
            e.preventDefault();
            let title = titleInput ? titleInput.value.trim() : '';
            const bodyHtml = bodyEditor ? bodyEditor.innerHTML.trim() : '';
            const bodyText = bodyEditor ? (bodyEditor.innerText || bodyEditor.textContent || '').trim() : '';

            // Auto fallback for title if not provided
            if (!title) {
                if (bodyText) {
                    title = bodyText.split('\n')[0].substring(0, 50);
                } else if (attachedMedia.length > 0) {
                    title = 'Media Post';
                } else {
                    title = 'New Post';
                }
            }

            const currentUser = authState.getState()?.username || 'Fantastic-Series2270';
            const newPost = {
                id: 'post_' + Date.now(),
                title: title,
                body: bodyHtml,
                community: currentCommunity.name,
                communityColor: currentCommunity.color,
                communityAvatar: currentCommunity.avatar,
                author: currentUser,
                time: 'Just now',
                createdAt: Date.now(),
                tags: selectedTags,
                media: attachedMedia,
                upvotes: 1,
                comments: [],
                userVote: 1
            };

            const userPosts = JSON.parse(localStorage.getItem('user_created_posts') || '[]');
            userPosts.unshift(newPost);
            localStorage.setItem('user_created_posts', JSON.stringify(userPosts));

            showToast('Post published successfully!');
            setTimeout(() => {
                window.location.href = 'index.html?view=home';
            }, 600);
        };
    }

    // 6. Drafts System Handler
    if (saveDraftBtn) {
        saveDraftBtn.onclick = () => {
            const title = titleInput ? titleInput.value.trim() : '';
            const bodyHtml = bodyEditor ? bodyEditor.innerHTML : '';
            if (!title && !bodyHtml && attachedMedia.length === 0) {
                showToast('Draft is empty');
                return;
            }

            const draft = {
                id: 'draft_' + Date.now(),
                title: title || 'Untitled Draft',
                body: bodyHtml,
                community: currentCommunity,
                tags: selectedTags,
                media: attachedMedia,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            const drafts = JSON.parse(localStorage.getItem('user_saved_drafts') || '[]');
            drafts.unshift(draft);
            localStorage.setItem('user_saved_drafts', JSON.stringify(drafts));

            updateDraftsBadge();
            showToast('Draft saved!');
        };
    }

    if (draftsLink && draftsDropdownMenu) {
        draftsLink.onclick = (e) => {
            e.stopPropagation();
            draftsDropdownMenu.classList.toggle('hidden');
            renderDraftsList();
        };
    }

    function updateDraftsBadge() {
        const drafts = JSON.parse(localStorage.getItem('user_saved_drafts') || '[]');
        if (draftsCountBadge) {
            draftsCountBadge.textContent = drafts.length;
        }
    }

    function renderDraftsList() {
        if (!draftsListContainer) return;
        const drafts = JSON.parse(localStorage.getItem('user_saved_drafts') || '[]');

        if (drafts.length === 0) {
            draftsListContainer.innerHTML = '<p class="empty-drafts-text">No saved drafts</p>';
            return;
        }

        draftsListContainer.innerHTML = drafts.map((d, idx) => `
            <div class="draft-item-card">
                <div style="overflow:hidden;">
                    <div class="draft-item-title">${d.title}</div>
                    <div class="draft-item-time">Saved at ${d.time}</div>
                </div>
                <div class="draft-actions">
                    <button class="btn-load-draft" data-index="${idx}">Load</button>
                    <button class="btn-delete-draft" data-index="${idx}">&times;</button>
                </div>
            </div>
        `).join('');

        draftsListContainer.querySelectorAll('.btn-load-draft').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                const draft = drafts[index];
                if (draft) {
                    if (titleInput) {
                        titleInput.value = draft.title;
                    }
                    if (bodyEditor) bodyEditor.innerHTML = draft.body || '';
                    if (draft.community) {
                        currentCommunity = draft.community;
                        if (selectedCommunityName) selectedCommunityName.textContent = currentCommunity.name;
                        if (selectedCommunityAvatar) {
                            selectedCommunityAvatar.style.backgroundColor = currentCommunity.color;
                            selectedCommunityAvatar.textContent = currentCommunity.avatar;
                        }
                    }
                    selectedTags = draft.tags || [];
                    attachedMedia = draft.media || [];
                    renderTags();
                    renderMediaPreviews();
                    updateSubmitButtonState();
                    draftsDropdownMenu.classList.add('hidden');
                    showToast('Draft loaded into editor');
                }
            };
        });

        draftsListContainer.querySelectorAll('.btn-delete-draft').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                drafts.splice(index, 1);
                localStorage.setItem('user_saved_drafts', JSON.stringify(drafts));
                updateDraftsBadge();
                renderDraftsList();
                showToast('Draft deleted');
            };
        });
    }
}
