import { showToast } from '../../js/interactions.js';
import { authState } from '../../js/auth-state.js';
import { api, uploadFile } from '../../js/api.js';
import { formDialog, confirmDialog } from '../../js/ui.js';
import { escapeHtml, formatCount, getParam, debounce, timeAgo } from '../../js/utils.js';

export function initPostCreate() {
    const byId = (id) => document.getElementById(id);
    const titleInput = byId('createPostTitle');
    const urlInput = byId('createPostUrl');
    const bodyEditor = byId('createPostBody');
    const submitBtn = byId('submitPostBtn');
    const errorEl = byId('createPostError');
    const draftsLink = byId('draftsLink');
    const draftsMenu = byId('draftsDropdownMenu');
    const communityBtn = byId('selectCommunityBtn');
    const communityMenu = byId('communityDropdownMenu');
    const communitySearch = byId('communitySearchInput');
    const communityList = byId('communityOptionsList');
    const addTagsBtn = byId('addTagsBtn');
    const tagsMenu = byId('tagsPickerMenu');
    const moreBtn = byId('tbMoreBtn');
    const moreMenu = byId('moreToolbarMenu');
    const mediaGrid = byId('mediaPreviewGrid');

    const state = {
        community: null,
        tags: [],
        media: [],
        uploading: 0,
        draftId: null,
        dirty: false,
        submitting: false
    };

    // ---- helpers ------------------------------------------------------------------
    const showError = (message) => {
        errorEl.textContent = message || '';
        errorEl.classList.toggle('hidden', !message);
    };

    const markDirty = () => {
        state.dirty = true;
        refreshSubmit();
    };

    function refreshSubmit() {
        byId('titleCharCount').textContent = `${titleInput.value.length}/300`;
        const ready = titleInput.value.trim().length > 0 && state.uploading === 0;
        submitBtn.disabled = !ready;
        submitBtn.classList.toggle('enabled', ready);
        submitBtn.style.opacity = ready ? '1' : '0.5';
        submitBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
    }

    function closePopovers(except) {
        [communityMenu, tagsMenu, draftsMenu, moreMenu].forEach(m => m !== except && m?.classList.add('hidden'));
    }

    // ---- community picker ---------------------------------------------------------------
    function setCommunity(c) {
        state.community = c;
        byId('selectedCommunityName').textContent = c ? `r/${c.name}` : 'Select Community';
        const avatar = byId('selectedCommunityAvatar');
        avatar.style.backgroundColor = c?.color || 'var(--reddit-orange)';
        avatar.textContent = c ? (c.icon || c.name.charAt(0).toUpperCase()) : 'r/';
        communityMenu.classList.add('hidden');
    }

    function renderCommunityOptions(list, emptyText) {
        communityList.innerHTML = list.length ? list.map(c => `
            <button class="community-option-item" data-name="${escapeHtml(c.name)}">
                <span class="community-icon-circle no-invert" style="background:${escapeHtml(c.color)};">${escapeHtml(c.icon || c.name.charAt(0).toUpperCase())}</span>
                <div class="community-option-info">
                    <span class="comm-title">r/${escapeHtml(c.name)}</span>
                    <span class="comm-subs">${c.memberCount !== undefined ? `${formatCount(c.memberCount)} members` : ''}</span>
                </div>
            </button>`).join('') : `<p class="empty-drafts-text">${emptyText}</p>`;
        communityList.querySelectorAll('.community-option-item').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const c = list.find(x => x.name === btn.dataset.name);
                setCommunity(c);
                markDirty();
            };
        });
    }

    const showJoined = () => renderCommunityOptions(authState.user.joinedCommunities, 'Join a community, or search for one above.');

    communityBtn.onclick = (e) => {
        e.stopPropagation();
        closePopovers(communityMenu);
        communityMenu.classList.toggle('hidden');
        if (!communityMenu.classList.contains('hidden')) {
            communitySearch.value = '';
            showJoined();
            communitySearch.focus();
        }
    };
    communityMenu.onclick = (e) => e.stopPropagation();
    communitySearch.oninput = debounce(async () => {
        const q = communitySearch.value.trim();
        if (!q) return showJoined();
        try {
            const { communities } = await api.get(`/search/suggest?q=${encodeURIComponent(q)}`);
            renderCommunityOptions(communities, 'No communities match that search.');
        } catch (err) {
            renderCommunityOptions([], escapeHtml(err.message));
        }
    }, 200);

    // ---- tags --------------------------------------------------------------------------
    function renderTags() {
        const container = byId('selectedTagsContainer');
        container.innerHTML = state.tags.map((t, idx) => `
            <div class="tag-badge-pill"><span>${escapeHtml(t)}</span><button class="remove-tag-btn" data-index="${idx}" aria-label="Remove tag ${escapeHtml(t)}">&times;</button></div>`).join('');
        container.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.tags.splice(Number(btn.dataset.index), 1);
                renderTags();
                markDirty();
            };
        });
    }

    addTagsBtn.onclick = (e) => {
        e.stopPropagation();
        closePopovers(tagsMenu);
        tagsMenu.classList.toggle('hidden');
    };
    tagsMenu.querySelectorAll('.tag-option-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!state.tags.includes(btn.dataset.tag)) {
                state.tags.push(btn.dataset.tag);
                renderTags();
                markDirty();
            }
            tagsMenu.classList.add('hidden');
        };
    });

    // ---- media uploads --------------------------------------------------------------------
    function renderMedia() {
        mediaGrid.innerHTML = state.media.map((m, idx) => `
            <div class="media-preview-card">
                <button class="btn-remove-media" data-index="${idx}" aria-label="Remove attachment">&times;</button>
                ${m.type === 'image' ? `<img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.name || '')}">` : `<video src="${escapeHtml(m.url)}" muted></video>`}
            </div>`).join('') + Array.from({ length: state.uploading }, () => '<div class="media-preview-card rc-uploading"><div class="rc-spinner"></div></div>').join('');
        mediaGrid.querySelectorAll('.btn-remove-media').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.media.splice(Number(btn.dataset.index), 1);
                renderMedia();
                markDirty();
            };
        });
    }

    async function handleFiles(files) {
        for (const file of files) {
            if (state.media.length + state.uploading >= 20) {
                showToast('You can attach up to 20 files');
                break;
            }
            state.uploading += 1;
            renderMedia();
            refreshSubmit();
            try {
                const uploaded = await uploadFile(file);
                state.media.push(uploaded);
                markDirty();
            } catch (err) {
                showToast(`${file.name}: ${err.message}`);
            } finally {
                state.uploading -= 1;
                renderMedia();
                refreshSubmit();
            }
        }
    }

    byId('tbImageBtn').onclick = () => byId('imageFileInput').click();
    byId('tbVideoBtn').onclick = () => byId('videoFileInput').click();
    byId('imageFileInput').onchange = (e) => { handleFiles([...e.target.files]); e.target.value = ''; };
    byId('videoFileInput').onchange = (e) => { handleFiles([...e.target.files]); e.target.value = ''; };

    // Drag & drop / paste images straight into the editor area.
    const canvas = document.querySelector('.create-form-card');
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('rc-drop-target'); });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('rc-drop-target'));
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('rc-drop-target');
        const files = [...e.dataTransfer.files].filter(f => /^(image|video)\//.test(f.type));
        if (files.length) handleFiles(files);
    });
    bodyEditor.addEventListener('paste', (e) => {
        const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
        if (files.length) {
            e.preventDefault();
            handleFiles(files);
        }
    });

    // ---- rich text toolbar --------------------------------------------------------------------
    let savedRange = null;
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount && bodyEditor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
    };
    const restoreSelection = () => {
        bodyEditor.focus();
        if (savedRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    };
    bodyEditor.addEventListener('keyup', saveSelection);
    bodyEditor.addEventListener('mouseup', saveSelection);
    bodyEditor.addEventListener('input', () => { saveSelection(); markDirty(); });

    function formatDoc(cmd, value = null) {
        restoreSelection();
        document.execCommand(cmd, false, value);
        saveSelection();
        markDirty();
    }

    const toolbar = {
        tbBoldBtn: () => formatDoc('bold'),
        tbItalicBtn: () => formatDoc('italic'),
        tbStrikeBtn: () => formatDoc('strikeThrough'),
        tbSuperBtn: () => formatDoc('superscript'),
        tbHeadingBtn: () => formatDoc('formatBlock', '<h2>'),
        tbQuoteBtn: () => formatDoc('formatBlock', '<blockquote>'),
        tbCodeBtn: () => formatDoc('formatBlock', '<pre>'),
        tbTableBtn: () => formatDoc('insertHTML', '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table><p><br></p>'),
        tbBulletListBtn: () => { formatDoc('insertUnorderedList'); moreMenu.classList.add('hidden'); },
        tbNumListBtn: () => { formatDoc('insertOrderedList'); moreMenu.classList.add('hidden'); },
        tbClearFormatBtn: () => { formatDoc('removeFormat'); formatDoc('formatBlock', '<p>'); moreMenu.classList.add('hidden'); }
    };
    Object.entries(toolbar).forEach(([id, fn]) => {
        const btn = byId(id);
        if (!btn) return;
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep the editor selection
        btn.onclick = fn;
    });

    byId('tbLinkBtn').addEventListener('mousedown', (e) => e.preventDefault());
    byId('tbLinkBtn').onclick = async () => {
        saveSelection();
        const selectedText = savedRange ? savedRange.toString() : '';
        const result = await formDialog({
            title: 'Add link',
            submitLabel: 'Insert',
            fields: [
                { name: 'text', label: 'Text', value: selectedText, placeholder: 'Link text' },
                { name: 'url', label: 'URL', value: 'https://', type: 'url' }
            ],
            onSubmit: async ({ text, url }) => {
                if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) throw new Error('Enter a full URL starting with http:// or https://');
                return { text: text.trim(), url: url.trim() };
            }
        });
        if (!result) return;
        if (selectedText) {
            formatDoc('createLink', result.url);
        } else {
            const label = escapeHtml(result.text || result.url);
            formatDoc('insertHTML', `<a href="${escapeHtml(result.url)}">${label}</a>&nbsp;`);
        }
    };

    moreBtn.onclick = (e) => {
        e.stopPropagation();
        closePopovers(moreMenu);
        moreMenu.classList.toggle('hidden');
    };

    document.addEventListener('click', () => closePopovers(null));

    titleInput.addEventListener('input', markDirty);
    urlInput.addEventListener('input', markDirty);

    // ---- drafts ----------------------------------------------------------------------------
    let drafts = [];

    async function loadDrafts() {
        try {
            ({ drafts } = await api.get('/drafts'));
        } catch {
            drafts = [];
        }
        byId('draftsCountBadge').textContent = drafts.length;
        renderDrafts();
    }

    function renderDrafts() {
        const container = byId('draftsListContainer');
        if (!drafts.length) {
            container.innerHTML = '<p class="empty-drafts-text">No saved drafts</p>';
            return;
        }
        container.innerHTML = drafts.map(d => `
            <div class="draft-item-card">
                <div style="overflow:hidden;">
                    <div class="draft-item-title">${escapeHtml(d.title || 'Untitled draft')}</div>
                    <div class="draft-item-time">${d.community ? `r/${escapeHtml(d.community.name)} • ` : ''}Saved ${timeAgo(d.updatedAt)}</div>
                </div>
                <div class="draft-actions">
                    <button class="btn-load-draft" data-id="${d.id}">Load</button>
                    <button class="btn-delete-draft" data-id="${d.id}" aria-label="Delete draft">&times;</button>
                </div>
            </div>`).join('');

        container.querySelectorAll('.btn-load-draft').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (state.dirty && !(await confirmDialog('Loading a draft replaces what you have in the editor.', { title: 'Replace current post?', confirmLabel: 'Load draft' }))) return;
                applyDraft(drafts.find(d => d.id === btn.dataset.id));
                draftsMenu.classList.add('hidden');
                showToast('Draft loaded into editor');
            };
        });
        container.querySelectorAll('.btn-delete-draft').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await api.del(`/drafts/${btn.dataset.id}`);
                    if (state.draftId === btn.dataset.id) state.draftId = null;
                    showToast('Draft deleted');
                    loadDrafts();
                } catch (err) {
                    showToast(err.message);
                }
            };
        });
    }

    function applyDraft(draft) {
        if (!draft) return;
        state.draftId = draft.id;
        titleInput.value = draft.title || '';
        urlInput.value = draft.url || '';
        bodyEditor.innerHTML = draft.body || '';
        state.tags = [...(draft.tags || [])];
        state.media = [...(draft.media || [])];
        setCommunity(draft.community);
        renderTags();
        renderMedia();
        state.dirty = false;
        refreshSubmit();
    }

    draftsLink.onclick = (e) => {
        e.stopPropagation();
        closePopovers(draftsMenu);
        draftsMenu.classList.toggle('hidden');
    };
    draftsMenu.onclick = (e) => e.stopPropagation();

    byId('saveDraftBtn').onclick = async () => {
        try {
            const { draft } = await api.post('/drafts', {
                id: state.draftId,
                title: titleInput.value.trim(),
                url: urlInput.value.trim(),
                body: bodyEditor.innerHTML,
                tags: state.tags,
                media: state.media,
                community: state.community?.name || ''
            });
            state.draftId = draft.id;
            state.dirty = false;
            showToast('Draft saved!');
            loadDrafts();
        } catch (err) {
            showToast(err.message);
        }
    };

    // ---- publish ---------------------------------------------------------------------------
    submitBtn.onclick = async (e) => {
        e.preventDefault();
        showError('');
        if (!state.community) {
            showError('Please choose a community to post in.');
            communityBtn.click();
            return;
        }
        if (!titleInput.value.trim()) return showError('Please add a title.');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting…';
        try {
            const bodyText = (bodyEditor.innerText || '').trim();
            const { post } = await api.post('/posts', {
                title: titleInput.value.trim(),
                url: urlInput.value.trim(),
                body: (bodyText || bodyEditor.querySelector('img, table, pre, blockquote')) ? bodyEditor.innerHTML : '',
                tags: state.tags,
                media: state.media.map(m => ({ type: m.type, url: m.url })),
                community: state.community.name
            });
            if (state.draftId) await api.del(`/drafts/${state.draftId}`).catch(() => {});
            state.submitting = true;
            showToast('Post published successfully!');
            window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
        } catch (err) {
            showError(err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    };

    window.addEventListener('beforeunload', (e) => {
        if (state.dirty && !state.submitting) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // ---- initial state from the URL -----------------------------------------------------------
    (async () => {
        const preset = getParam('community');
        if (preset) {
            try {
                const { community } = await api.get(`/communities/${encodeURIComponent(preset)}`);
                setCommunity(community);
                if (!community.canPost) showError(`Only approved users can post in r/${community.name}.`);
            } catch (err) {
                showError(err.message);
            }
        }
        await loadDrafts();
        const draftId = getParam('draft');
        if (draftId) applyDraft(drafts.find(d => d.id === draftId));
        if (getParam('drafts')) draftsMenu.classList.remove('hidden');
    })();

    refreshSubmit();
    titleInput.focus();
}
