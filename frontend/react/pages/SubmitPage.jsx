import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api, uploadFile } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';
import { formatCount, timeAgo } from '../../js/utils.js';

const AVAILABLE_TAGS = [
    { tag: 'OC', label: '+ OC', sub: 'Original Content' },
    { tag: 'Spoiler', label: '+ Spoiler', sub: 'Contains spoilers' },
    { tag: 'NSFW', label: '+ NSFW', sub: 'Not safe for work' },
    { tag: 'Discussion', label: '+ Discussion', sub: 'Community discussion' },
    { tag: 'Advice', label: '+ Advice', sub: 'Seeking advice' },
    { tag: 'Showcase', label: '+ Showcase', sub: 'Project showcase' },
    { tag: 'Question', label: '+ Question', sub: 'Asking the community' },
    { tag: 'News', label: '+ News', sub: 'Shows up in the News feed' },
    { tag: 'Meme', label: '+ Meme', sub: 'Just for laughs' }
];

export default function SubmitPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, loaded, openAuthModal, confirmDialog, formDialog } = useAuth();

    const [community, setCommunity] = useState(null);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [tags, setTags] = useState([]);
    const [media, setMedia] = useState([]);
    const [uploading, setUploading] = useState(0);
    const [draftId, setDraftId] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Popover states
    const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
    const [communitySearch, setCommunitySearch] = useState('');
    const [communityResults, setCommunityResults] = useState([]);
    const [draftsMenuOpen, setDraftsMenuOpen] = useState(false);
    const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    const bodyEditorRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const savedRangeRef = useRef(null);

    // Close menus on document click
    useEffect(() => {
        const handleDocClick = (e) => {
            if (!e.target.closest('.community-select-wrapper')) setCommunityMenuOpen(false);
            if (!e.target.closest('.drafts-wrapper')) setDraftsMenuOpen(false);
            if (!e.target.closest('.create-tags-wrapper')) setTagsMenuOpen(false);
            if (!e.target.closest('.more-menu-wrapper')) setMoreMenuOpen(false);
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    // Load drafts
    const loadDrafts = async () => {
        try {
            const data = await api.get('/drafts');
            setDrafts(data.drafts || []);
            return data.drafts || [];
        } catch {
            setDrafts([]);
            return [];
        }
    };

    // Initial query params
    useEffect(() => {
        if (!isLoggedIn) return;

        loadDrafts().then(allDrafts => {
            const dId = searchParams.get('draft');
            if (dId) {
                const found = allDrafts.find(d => d.id === dId);
                if (found) applyDraft(found);
            }
            if (searchParams.get('drafts')) {
                setDraftsMenuOpen(true);
            }
        });

        const presetComm = searchParams.get('community');
        if (presetComm) {
            api.get(`/communities/${encodeURIComponent(presetComm)}`)
                .then(({ community: c }) => {
                    setCommunity(c);
                    if (!c.canPost) setError(`Only approved users can post in r/${c.name}.`);
                })
                .catch(err => setError(err.message));
        }
    }, [isLoggedIn, searchParams]);

    // Search communities
    useEffect(() => {
        if (!communityMenuOpen) return;
        const q = communitySearch.trim();
        if (!q) {
            setCommunityResults(user?.joinedCommunities || []);
            return;
        }

        const timer = setTimeout(() => {
            api.get(`/search/suggest?q=${encodeURIComponent(q)}`)
                .then(data => setCommunityResults(data.communities || []))
                .catch(() => setCommunityResults([]));
        }, 200);

        return () => clearTimeout(timer);
    }, [communitySearch, communityMenuOpen, user]);

    // Warn on unload
    useEffect(() => {
        const handleUnload = (e) => {
            if (dirty && !submitting) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [dirty, submitting]);

    const markDirty = () => setDirty(true);

    const applyDraft = (draft) => {
        if (!draft) return;
        setDraftId(draft.id);
        setTitle(draft.title || '');
        setUrl(draft.url || '');
        if (bodyEditorRef.current) {
            bodyEditorRef.current.innerHTML = draft.body || '';
        }
        setTags([...(draft.tags || [])]);
        setMedia([...(draft.media || [])]);
        setCommunity(draft.community || null);
        setDirty(false);
    };

    // Selection management for rich text editor
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount && bodyEditorRef.current?.contains(sel.anchorNode)) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        if (bodyEditorRef.current) bodyEditorRef.current.focus();
        if (savedRangeRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }
    };

    const formatDoc = (cmd, val = null) => {
        restoreSelection();
        document.execCommand(cmd, false, val);
        saveSelection();
        markDirty();
    };

    // Media file upload
    const handleFiles = async (files) => {
        for (const file of files) {
            if (media.length + uploading >= 20) {
                showToast('You can attach up to 20 files');
                break;
            }
            setUploading(prev => prev + 1);
            try {
                const uploaded = await uploadFile(file);
                setMedia(prev => [...prev, uploaded]);
                markDirty();
            } catch (err) {
                showToast(`${file.name}: ${err.message}`);
            } finally {
                setUploading(prev => prev - 1);
            }
        }
    };

    const handleSaveDraft = async () => {
        const bodyHtml = bodyEditorRef.current ? bodyEditorRef.current.innerHTML : '';
        try {
            const { draft } = await api.post('/drafts', {
                id: draftId,
                title: title.trim(),
                url: url.trim(),
                body: bodyHtml,
                tags,
                media,
                community: community?.name || ''
            });
            setDraftId(draft.id);
            setDirty(false);
            showToast('Draft saved!');
            loadDrafts();
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleSubmitPost = async (e) => {
        e.preventDefault();
        setError('');
        if (!community) {
            setError('Please choose a community to post in.');
            setCommunityMenuOpen(true);
            return;
        }
        if (!title.trim()) {
            setError('Please add a title.');
            return;
        }

        setSubmitting(true);
        try {
            const bodyHtml = bodyEditorRef.current ? bodyEditorRef.current.innerHTML : '';
            const bodyText = bodyEditorRef.current ? (bodyEditorRef.current.innerText || '').trim() : '';
            const hasHtmlContent = bodyEditorRef.current?.querySelector('img, table, pre, blockquote');

            const { post } = await api.post('/posts', {
                title: title.trim(),
                url: url.trim(),
                body: (bodyText || hasHtmlContent) ? bodyHtml : '',
                tags,
                media: media.map(m => ({ type: m.type, url: m.url })),
                community: community.name
            });

            if (draftId) await api.del(`/drafts/${draftId}`).catch(() => {});
            showToast('Post published successfully!');
            navigate(`/post.html?id=${encodeURIComponent(post.id)}`);
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (loaded && !isLoggedIn) {
            openAuthModal('Log In');
        }
    }, [loaded, isLoggedIn, openAuthModal]);

    if (!loaded) {
        return (
            <AppLayout
                rightColumn={true}
                rightColumnContent={
                    <div id="footer-container">
                        <Footer />
                    </div>
                }
            >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                    <div className="rc-spinner" />
                </div>
            </AppLayout>
        );
    }

    if (!isLoggedIn) {
        return (
            <AppLayout
                rightColumn={true}
                rightColumnContent={
                    <div id="footer-container">
                        <Footer />
                    </div>
                }
            >
                <div className="rc-empty-state">
                    <h3>Log in to create a post</h3>
                    <p>You need a Reddit account to post to communities.</p>
                    <button
                        type="button"
                        className="ui-btn ui-btn-primary"
                        id="submitLoginBtn"
                        onClick={() => openAuthModal('Log In')}
                    >
                        Log In
                    </button>
                </div>
            </AppLayout>
        );
    }

    const ready = title.trim().length > 0 && uploading === 0 && !submitting;

    return (
        <AppLayout
            rightColumn={true}
            rightColumnContent={
                <div id="footer-container">
                    <Footer />
                </div>
            }
        >
            <div className="post-create-canvas">
                <div className="create-top-bar">
                    <div className="community-select-wrapper">
                        <button
                            type="button"
                            className="btn-select-community"
                            id="selectCommunityBtn"
                            onClick={() => {
                                setCommunityMenuOpen(prev => !prev);
                                setCommunitySearch('');
                            }}
                        >
                            <span
                                id="selectedCommunityAvatar"
                                className="community-icon-sm"
                                style={{
                                    backgroundColor: community?.color || 'var(--reddit-orange)',
                                    color: 'white'
                                }}
                            >
                                {community ? (community.icon || community.name.charAt(0).toUpperCase()) : 'r/'}
                            </span>
                            <span id="selectedCommunityName">
                                {community ? `r/${community.name}` : 'Select Community'}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                        </button>

                        <div className={`create-popover-menu ${communityMenuOpen ? '' : 'hidden'}`} id="communityDropdownMenu">
                            <div className="popover-header">Select a community</div>
                            <input
                                type="text"
                                className="rc-popover-search"
                                id="communitySearchInput"
                                placeholder="Search communities"
                                autoComplete="off"
                                value={communitySearch}
                                onChange={e => setCommunitySearch(e.target.value)}
                            />
                            <div className="community-list-scroll" id="communityOptionsList">
                                {communityResults.length > 0 ? (
                                    communityResults.map(c => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            className="community-option-item"
                                            data-name={c.name}
                                            onClick={() => {
                                                setCommunity(c);
                                                setCommunityMenuOpen(false);
                                                markDirty();
                                            }}
                                        >
                                            <span className="community-icon-circle no-invert" style={{ background: c.color }}>
                                                {c.icon || c.name.charAt(0).toUpperCase()}
                                            </span>
                                            <div className="community-option-info">
                                                <span className="comm-title">r/{c.name}</span>
                                                <span className="comm-subs">
                                                    {c.memberCount !== undefined ? `${formatCount(c.memberCount)} members` : ''}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="empty-drafts-text">
                                        {communitySearch ? 'No communities match that search.' : 'Join a community, or search for one above.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="drafts-wrapper">
                        <button
                            type="button"
                            className="btn-drafts-link"
                            id="draftsLink"
                            onClick={() => setDraftsMenuOpen(prev => !prev)}
                        >
                            Drafts <span id="draftsCountBadge" className="drafts-badge">{drafts.length}</span>
                        </button>

                        <div className={`create-popover-menu ${draftsMenuOpen ? '' : 'hidden'}`} id="draftsDropdownMenu">
                            <div className="popover-header">Saved Drafts</div>
                            <div id="draftsListContainer" className="drafts-list-container">
                                {drafts.length > 0 ? (
                                    drafts.map(d => (
                                        <div key={d.id} className="draft-item-card">
                                            <div style={{ overflow: 'hidden' }}>
                                                <div className="draft-item-title">{d.title || 'Untitled draft'}</div>
                                                <div className="draft-item-time">
                                                    {d.community ? `r/${d.community.name} • ` : ''}Saved {timeAgo(d.updatedAt)}
                                                </div>
                                            </div>
                                            <div className="draft-actions">
                                                <button
                                                    type="button"
                                                    className="btn-load-draft"
                                                    data-id={d.id}
                                                    onClick={async () => {
                                                        if (dirty && !(await confirmDialog('Loading a draft replaces what you have in the editor.', { title: 'Replace current post?', confirmLabel: 'Load draft' }))) return;
                                                        applyDraft(d);
                                                        setDraftsMenuOpen(false);
                                                        showToast('Draft loaded into editor');
                                                    }}
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-delete-draft"
                                                    data-id={d.id}
                                                    aria-label="Delete draft"
                                                    onClick={async () => {
                                                        try {
                                                            await api.del(`/drafts/${d.id}`);
                                                            if (draftId === d.id) setDraftId(null);
                                                            showToast('Draft deleted');
                                                            loadDrafts();
                                                        } catch (err) {
                                                            showToast(err.message);
                                                        }
                                                    }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-drafts-text">No saved drafts</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="create-form-card">
                    <div className="create-title-wrapper">
                        <input
                            type="text"
                            id="createPostTitle"
                            className="create-title-input"
                            placeholder="Title*"
                            maxLength={300}
                            required
                            value={title}
                            onChange={e => {
                                setTitle(e.target.value);
                                markDirty();
                            }}
                        />
                        <span className="rc-char-count" id="titleCharCount">
                            {title.length}/300
                        </span>
                    </div>

                    <div className="create-tags-wrapper">
                        <button
                            type="button"
                            className="btn-add-tags"
                            id="addTagsBtn"
                            onClick={() => setTagsMenuOpen(prev => !prev)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                                <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                            <span>Add tags</span>
                        </button>
                        <div id="selectedTagsContainer" className="selected-tags-container">
                            {tags.map((t, idx) => (
                                <div key={t} className="tag-badge-pill">
                                    <span>{t}</span>
                                    <button
                                        type="button"
                                        className="remove-tag-btn"
                                        data-index={idx}
                                        aria-label={`Remove tag ${t}`}
                                        onClick={() => {
                                            setTags(prev => prev.filter((_, i) => i !== idx));
                                            markDirty();
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className={`create-popover-menu ${tagsMenuOpen ? '' : 'hidden'}`} id="tagsPickerMenu">
                            <div className="popover-header">Add Post Tags</div>
                            <div className="tags-options-list">
                                {AVAILABLE_TAGS.map(({ tag, label, sub }) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        className="tag-option-btn"
                                        data-tag={tag}
                                        onClick={() => {
                                            if (!tags.includes(tag)) {
                                                setTags(prev => [...prev, tag]);
                                                markDirty();
                                            }
                                            setTagsMenuOpen(false);
                                        }}
                                    >
                                        <span>{label}</span>
                                        <small>{sub}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rc-create-link-wrapper">
                        <input
                            type="url"
                            id="createPostUrl"
                            className="rc-create-link-input"
                            placeholder="Link URL (optional), e.g. https://example.com/article"
                            maxLength={2000}
                            value={url}
                            onChange={e => {
                                setUrl(e.target.value);
                                markDirty();
                            }}
                        />
                    </div>

                    <div className="create-body-wrapper">
                        <div
                            ref={bodyEditorRef}
                            id="createPostBody"
                            className="post-body-editor"
                            contentEditable={true}
                            data-placeholder="Body text (optional)"
                            suppressContentEditableWarning={true}
                            onKeyUp={saveSelection}
                            onMouseUp={saveSelection}
                            onInput={() => {
                                saveSelection();
                                markDirty();
                            }}
                            onPaste={(e) => {
                                const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
                                if (files.length) {
                                    e.preventDefault();
                                    handleFiles(files);
                                }
                            }}
                        />
                    </div>

                    <div id="mediaPreviewGrid" className="media-preview-grid">
                        {media.map((m, idx) => (
                            <div key={m.url || idx} className="media-preview-card">
                                <button
                                    type="button"
                                    className="btn-remove-media"
                                    data-index={idx}
                                    aria-label="Remove attachment"
                                    onClick={() => {
                                        setMedia(prev => prev.filter((_, i) => i !== idx));
                                        markDirty();
                                    }}
                                >
                                    &times;
                                </button>
                                {m.type === 'image' ? (
                                    <img src={m.url} alt={m.name || ''} />
                                ) : (
                                    <video src={m.url} muted controls />
                                )}
                            </div>
                        ))}
                        {Array.from({ length: uploading }).map((_, i) => (
                            <div key={i} className="media-preview-card rc-uploading">
                                <div className="rc-spinner" />
                            </div>
                        ))}
                    </div>

                    <input
                        ref={imageInputRef}
                        type="file"
                        id="imageFileInput"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => {
                            handleFiles([...e.target.files]);
                            e.target.value = '';
                        }}
                    />
                    <input
                        ref={videoInputRef}
                        type="file"
                        id="videoFileInput"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                            handleFiles([...e.target.files]);
                            e.target.value = '';
                        }}
                    />

                    <p className={`ui-error ${error ? '' : 'hidden'}`} id="createPostError">
                        {error}
                    </p>

                    <div className="rich-toolbar">
                        <div className="toolbar-left">
                            <button
                                type="button"
                                className="toolbar-btn"
                                id="tbLinkBtn"
                                title="Add Link"
                                onMouseDown={e => e.preventDefault()}
                                onClick={async () => {
                                    saveSelection();
                                    const selectedText = savedRangeRef.current ? savedRangeRef.current.toString() : '';
                                    const result = await formDialog({
                                        title: 'Add link',
                                        submitLabel: 'Insert',
                                        fields: [
                                            { name: 'text', label: 'Text', value: selectedText, placeholder: 'Link text' },
                                            { name: 'url', label: 'URL', value: 'https://', type: 'url' }
                                        ],
                                        onSubmit: async ({ text, url: linkUrl }) => {
                                            if (!/^https?:\/\/\S+\.\S+/.test(linkUrl.trim())) throw new Error('Enter a full URL starting with http:// or https://');
                                            return { text: text.trim(), url: linkUrl.trim() };
                                        }
                                    });
                                    if (!result) return;
                                    if (selectedText) {
                                        formatDoc('createLink', result.url);
                                    } else {
                                        formatDoc('insertHTML', `<a href="${result.url}">${result.text || result.url}</a>&nbsp;`);
                                    }
                                }}
                            >
                                🔗
                            </button>
                            <button
                                type="button"
                                className="toolbar-btn"
                                id="tbImageBtn"
                                title="Upload Image"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => imageInputRef.current?.click()}
                            >
                                🖼️
                            </button>
                            <button
                                type="button"
                                className="toolbar-btn"
                                id="tbVideoBtn"
                                title="Upload Video"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => videoInputRef.current?.click()}
                            >
                                🎥
                            </button>

                            <div className="toolbar-divider" />

                            <button type="button" className="toolbar-btn bold-btn" id="tbBoldBtn" title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('bold')}>B</button>
                            <button type="button" className="toolbar-btn italic-btn" id="tbItalicBtn" title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('italic')}>i</button>
                            <button type="button" className="toolbar-btn" id="tbStrikeBtn" title="Strikethrough" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('strikeThrough')}>S̶</button>
                            <button type="button" className="toolbar-btn" id="tbSuperBtn" title="Superscript" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('superscript')}>X²</button>
                            <button type="button" className="toolbar-btn" id="tbHeadingBtn" title="Heading" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('formatBlock', '<h2>')}>T</button>

                            <div className="toolbar-divider" />

                            <button type="button" className="toolbar-btn" id="tbCodeBtn" title="Code Block" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('formatBlock', '<pre>')}>&lt;/&gt;</button>
                            <button type="button" className="toolbar-btn" id="tbQuoteBtn" title="Quote" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('formatBlock', '<blockquote>')}>“</button>
                            <button type="button" className="toolbar-btn" id="tbTableBtn" title="Table" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('insertHTML', '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table><p><br></p>')}>🪟</button>

                            <div className="more-menu-wrapper" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className="toolbar-btn"
                                    id="tbMoreBtn"
                                    title="More options"
                                    onClick={() => setMoreMenuOpen(prev => !prev)}
                                >
                                    ...
                                </button>
                                <div className={`create-popover-menu ${moreMenuOpen ? '' : 'hidden'}`} id="moreToolbarMenu">
                                    <button
                                        type="button"
                                        className="more-menu-item"
                                        id="tbBulletListBtn"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                            formatDoc('insertUnorderedList');
                                            setMoreMenuOpen(false);
                                        }}
                                    >
                                        <span>•</span> Bulleted List
                                    </button>
                                    <button
                                        type="button"
                                        className="more-menu-item"
                                        id="tbNumListBtn"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                            formatDoc('insertOrderedList');
                                            setMoreMenuOpen(false);
                                        }}
                                    >
                                        <span>1.</span> Numbered List
                                    </button>
                                    <button
                                        type="button"
                                        className="more-menu-item"
                                        id="tbClearFormatBtn"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                            formatDoc('removeFormat');
                                            formatDoc('formatBlock', '<p>');
                                            setMoreMenuOpen(false);
                                        }}
                                    >
                                        <span>🧹</span> Clear Formatting
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="toolbar-right">
                            <button
                                type="button"
                                className="btn-save-draft"
                                id="saveDraftBtn"
                                onClick={handleSaveDraft}
                            >
                                Save Draft
                            </button>
                            <button
                                type="submit"
                                className={`btn-post-submit ${ready ? 'enabled' : ''}`}
                                id="submitPostBtn"
                                disabled={!ready}
                                style={{
                                    opacity: ready ? '1' : '0.5',
                                    cursor: ready ? 'pointer' : 'not-allowed'
                                }}
                                onClick={handleSubmitPost}
                            >
                                {submitting ? 'Posting…' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
