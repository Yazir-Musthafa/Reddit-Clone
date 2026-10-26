import { initShell, renderRightColumn } from '../shell.js';
import { api } from '../api.js';
import { authState } from '../auth-state.js';
import { showToast, openAuthModal } from '../interactions.js';
import { requireLogin, confirmDialog, reportDialog } from '../ui.js';
import { createPostElement } from '../../components/post/post.js';
import { aboutCardHtml, rulesCardHtml, moderatorsCardHtml, bindSideCards } from '../community-widgets.js';
import {
    escapeHtml, getParam, timeAgo, formatCount, userAvatar, formatCommentBody, copyToClipboard, absoluteUrl, rememberRecentPost
} from '../utils.js';

const MAX_INDENT = 8;
const ICON = {
    up: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    reply: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
};

const page = { post: null, comments: [], sort: 'best' };

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    const container = document.getElementById('feed-container');
    const id = getParam('id');
    if (!id) {
        container.innerHTML = '<div class="rc-empty-state"><h3>Post not found</h3><a class="ui-btn ui-btn-primary" href="index.html">Go home</a></div>';
        renderRightColumn('communities');
        return;
    }

    try {
        const { post } = await api.get(`/posts/${encodeURIComponent(id)}`);
        page.post = post;
    } catch (err) {
        container.innerHTML = `<div class="rc-empty-state"><h3>${err.status === 410 ? 'This post was deleted' : err.status === 403 ? 'This community is private' : 'Post not found'}</h3>
            <p>${escapeHtml(err.message)}</p><a class="ui-btn ui-btn-primary" href="index.html">Go home</a></div>`;
        renderRightColumn('communities');
        return;
    }

    const post = page.post;
    document.title = `${post.title} : r/${post.community.name}`;
    rememberRecentPost(post);
    renderRightSidebar(post.community.name);

    container.innerHTML = `
        <div class="rc-post-page">
            <button class="rc-back-btn" id="postBackBtn" aria-label="Go back">${ICON.back}</button>
            <div id="postSlot"></div>
            <section class="rc-comments-section" id="comments">
                <div id="commentComposerSlot"></div>
                <div class="rc-comments-toolbar">
                    <label for="commentSortSelect">Sort by:</label>
                    <select id="commentSortSelect" class="rc-inline-select">
                        <option value="best">Best</option>
                        <option value="top">Top</option>
                        <option value="new">New</option>
                        <option value="old">Old</option>
                    </select>
                    <span class="rc-muted-text" id="commentCountLabel"></span>
                </div>
                <div id="commentTree"><div class="rc-spinner"></div></div>
            </section>
        </div>`;

    document.getElementById('postBackBtn').onclick = () => {
        if (document.referrer && new URL(document.referrer).origin === window.location.origin) window.history.back();
        else window.location.href = 'index.html';
    };

    renderPost();
    renderComposer();
    document.getElementById('commentSortSelect').onchange = (e) => {
        page.sort = e.target.value;
        loadComments();
    };
    await loadComments();

    if (getParam('edit') && post.isAuthor) startEditing();
    scrollToHash();
});

function renderPost() {
    const slot = document.getElementById('postSlot');
    slot.innerHTML = '';
    slot.appendChild(createPostElement(page.post, {
        detail: true,
        onEdit: startEditing,
        onDeleted: () => {
            showToast('Post deleted');
            window.location.href = `community.html?name=${encodeURIComponent(page.post.community.name)}`;
        }
    }));
}

async function renderRightSidebar(name) {
    try {
        const { community } = await api.get(`/communities/${encodeURIComponent(name)}`);
        await renderRightColumn('footer', { topHtml: aboutCardHtml(community) + rulesCardHtml(community) + moderatorsCardHtml(community) });
        bindSideCards(document.querySelector('.right-column-container'), community);
    } catch {
        renderRightColumn('communities');
    }
}

// ---- Editing the post body ------------------------------------------------------------

function startEditing() {
    const card = document.querySelector('#postSlot .post-card');
    if (!card || card.querySelector('.rc-edit-box')) return;
    const bodyEl = card.querySelector('.rc-post-body');
    const box = document.createElement('div');
    box.className = 'rc-edit-box';
    box.innerHTML = `
        <div class="post-body-editor rc-edit-editor" contenteditable="true" data-placeholder="Body text (optional)">${page.post.body}</div>
        <div class="ui-dialog-actions">
            <button class="ui-btn ui-btn-secondary" data-cancel>Cancel</button>
            <button class="ui-btn ui-btn-primary" data-save>Save</button>
        </div>`;
    if (bodyEl) bodyEl.replaceWith(box);
    else card.querySelector('.rc-post-title').after(box);
    const editor = box.querySelector('.rc-edit-editor');
    editor.focus();

    box.querySelector('[data-cancel]').onclick = () => renderPost();
    box.querySelector('[data-save]').onclick = async () => {
        try {
            const { post } = await api.patch(`/posts/${page.post.id}`, { body: editor.innerHTML });
            Object.assign(page.post, { body: post.body, edited: post.edited });
            renderPost();
            showToast('Post updated');
        } catch (err) {
            showToast(err.message);
        }
    };
}

// ---- Comments -----------------------------------------------------------------------------

function composerHtml({ placeholder = 'Join the conversation', submitLabel = 'Comment', value = '', cancel = false } = {}) {
    return `
        <form class="rc-comment-composer">
            <textarea class="rc-comment-textarea" placeholder="${escapeHtml(placeholder)}" maxlength="10000" rows="3">${escapeHtml(value)}</textarea>
            <div class="rc-composer-actions">
                <span class="rc-muted-text rc-composer-hint">Ctrl + Enter to submit</span>
                ${cancel ? '<button type="button" class="ui-btn ui-btn-secondary" data-cancel>Cancel</button>' : ''}
                <button type="submit" class="ui-btn ui-btn-primary" disabled>${submitLabel}</button>
            </div>
        </form>`;
}

function bindComposer(form, onSubmit, onCancel) {
    const textarea = form.querySelector('textarea');
    const submit = form.querySelector('[type=submit]');
    textarea.addEventListener('input', () => { submit.disabled = !textarea.value.trim(); });
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
    });
    form.querySelector('[data-cancel]')?.addEventListener('click', onCancel);
    form.onsubmit = async (e) => {
        e.preventDefault();
        const body = textarea.value.trim();
        if (!body) return;
        submit.disabled = true;
        try {
            await onSubmit(body);
        } catch (err) {
            showToast(err.message);
            submit.disabled = false;
        }
    };
    return textarea;
}

function renderComposer() {
    const slot = document.getElementById('commentComposerSlot');
    if (!authState.getState().isLoggedIn) {
        slot.innerHTML = `<button class="rc-comment-login" id="commentLoginBtn">Log in to join the conversation</button>`;
        slot.querySelector('#commentLoginBtn').onclick = () => openAuthModal('Log In');
        return;
    }
    slot.innerHTML = composerHtml();
    const form = slot.querySelector('form');
    const textarea = bindComposer(form, async (body) => {
        const { comment } = await api.post(`/posts/${page.post.id}/comments`, { body });
        textarea.value = '';
        form.querySelector('[type=submit]').disabled = true;
        page.comments.unshift(comment);
        page.post.commentCount += 1;
        renderTree();
        showToast('Comment posted');
    });
}

async function loadComments() {
    const tree = document.getElementById('commentTree');
    try {
        const { comments } = await api.get(`/posts/${page.post.id}/comments?sort=${page.sort}`);
        page.comments = comments;
        renderTree();
    } catch (err) {
        tree.innerHTML = `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`;
    }
}

function buildTree() {
    const byParent = new Map();
    page.comments.forEach(c => {
        const key = c.parent || 'root';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(c);
    });
    return byParent;
}

function countDescendants(byParent, id) {
    const kids = byParent.get(id) || [];
    return kids.reduce((n, k) => n + 1 + countDescendants(byParent, k.id), 0);
}

function commentHtml(c, byParent, depth) {
    const children = byParent.get(c.id) || [];
    const isOp = !c.deleted && c.author.username === page.post.author.username;
    const modMode = authState.user?.prefs?.modMode !== false;
    const canDelete = c.isAuthor || (c.canModerate && modMode && !c.deleted);
    const voteCls = c.userVote === 1 ? 'voted-up' : c.userVote === -1 ? 'voted-down' : '';
    return `
        <div class="rc-comment ${depth >= MAX_INDENT ? 'rc-comment-flat' : ''}" id="comment-${c.id}" data-id="${c.id}">
            <button class="rc-comment-rail" data-action="collapse" aria-label="Collapse thread"></button>
            <div class="rc-comment-main">
                <div class="rc-comment-meta">
                    <button class="rc-collapse-toggle" data-action="collapse" aria-label="Toggle thread">⊖</button>
                    ${c.deleted ? '<span class="rc-muted-text">[deleted]</span>' : `
                        ${userAvatar(c.author, 22)}
                        <a class="rc-comment-author" href="user.html?u=${encodeURIComponent(c.author.username)}">${escapeHtml(c.author.username)}</a>
                        ${isOp ? '<span class="rc-op-badge">OP</span>' : ''}`}
                    <span class="post-dot-separator">•</span>
                    <span class="rc-muted-text" title="${escapeHtml(new Date(c.createdAt).toLocaleString())}">${timeAgo(c.createdAt)}</span>
                    ${c.edited ? '<span class="rc-muted-text">• edited</span>' : ''}
                    <span class="rc-collapsed-count">${countDescendants(byParent, c.id) ? `(${countDescendants(byParent, c.id)} more)` : ''}</span>
                </div>
                <div class="rc-comment-content">
                    <div class="rc-comment-body">${c.deleted ? '<em class="rc-muted-text">This comment was deleted.</em>' : formatCommentBody(c.body)}</div>
                    ${c.deleted ? '' : `
                    <div class="rc-comment-actions">
                        <div class="rc-comment-vote vote-pill ${voteCls}">
                            <button class="vote-btn vote-up" data-action="upvote" aria-label="Upvote">${ICON.up}</button>
                            <span class="vote-count">${formatCount(c.score)}</span>
                            <button class="vote-btn vote-down" data-action="downvote" aria-label="Downvote">${ICON.down}</button>
                        </div>
                        <button class="rc-comment-action" data-action="reply">${ICON.reply}<span>Reply</span></button>
                        <button class="rc-comment-action" data-action="share">Share</button>
                        ${c.isAuthor ? '<button class="rc-comment-action" data-action="edit">Edit</button>' : ''}
                        ${canDelete ? `<button class="rc-comment-action rc-danger" data-action="delete">${c.isAuthor ? 'Delete' : 'Remove'}</button>` : ''}
                        ${!c.isAuthor && authState.getState().isLoggedIn ? '<button class="rc-comment-action" data-action="report">Report</button>' : ''}
                    </div>`}
                    <div class="rc-reply-slot"></div>
                    <div class="rc-comment-children">
                        ${children.map(child => commentHtml(child, byParent, depth + 1)).join('')}
                    </div>
                </div>
            </div>
        </div>`;
}

function renderTree() {
    const tree = document.getElementById('commentTree');
    const byParent = buildTree();
    const roots = byParent.get('root') || [];
    const visible = page.comments.filter(c => !c.deleted).length;
    document.getElementById('commentCountLabel').textContent = `${visible} comment${visible === 1 ? '' : 's'}`;
    tree.innerHTML = roots.length
        ? roots.map(c => commentHtml(c, byParent, 0)).join('')
        : '<div class="rc-empty-state rc-empty-small"><h3>Be the first to comment</h3><p>Nobody has responded to this post yet. Add your thoughts and get the conversation going.</p></div>';

    const commentCountEl = document.querySelector('#postSlot .rc-comment-count');
    if (commentCountEl) commentCountEl.textContent = formatCount(page.post.commentCount);
    tree.onclick = onTreeClick;
}

async function onTreeClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const el = actionEl.closest('.rc-comment');
    const comment = page.comments.find(c => c.id === el.dataset.id);
    if (!comment) return;
    const action = actionEl.dataset.action;

    if (action === 'collapse') {
        el.classList.toggle('collapsed');
        el.querySelector('.rc-collapse-toggle').textContent = el.classList.contains('collapsed') ? '⊕' : '⊖';
        return;
    }
    if (action === 'upvote' || action === 'downvote') return voteComment(el, comment, action === 'upvote' ? 1 : -1);
    if (action === 'share') {
        const ok = await copyToClipboard(absoluteUrl(`post.html?id=${page.post.id}#comment-${comment.id}`));
        return showToast(ok ? 'Link copied to clipboard!' : "Couldn't copy the link");
    }
    if (action === 'report') return reportDialog('Comment', comment.id);
    if (action === 'reply') return openReply(el, comment);
    if (action === 'edit') return openEdit(el, comment);
    if (action === 'delete') {
        const asMod = !comment.isAuthor;
        if (!(await confirmDialog(asMod ? 'Remove this comment?' : 'Delete your comment? This can’t be undone.', { title: asMod ? 'Remove comment?' : 'Delete comment?', confirmLabel: asMod ? 'Remove' : 'Delete', danger: true }))) return;
        try {
            await api.del(`/comments/${comment.id}`);
            Object.assign(comment, { deleted: true, body: '', isAuthor: false, author: { username: '[deleted]', avatarColor: '#828F9A' } });
            page.post.commentCount = Math.max(0, page.post.commentCount - 1);
            renderTree();
            showToast(asMod ? 'Comment removed' : 'Comment deleted');
        } catch (err) {
            showToast(err.message);
        }
    }
}

async function voteComment(el, comment, dir) {
    if (!requireLogin()) return;
    const next = comment.userVote === dir ? 0 : dir;
    const pill = el.querySelector(':scope > .rc-comment-main > .rc-comment-content > .rc-comment-actions .vote-pill');
    const paint = () => {
        pill.classList.toggle('voted-up', comment.userVote === 1);
        pill.classList.toggle('voted-down', comment.userVote === -1);
        pill.querySelector('.vote-count').textContent = formatCount(comment.score);
    };
    const previous = { score: comment.score, userVote: comment.userVote };
    comment.score += next - comment.userVote;
    comment.userVote = next;
    paint();
    try {
        const result = await api.post(`/comments/${comment.id}/vote`, { dir: next });
        Object.assign(comment, result);
        paint();
    } catch (err) {
        Object.assign(comment, previous);
        paint();
        showToast(err.message);
    }
}

function openReply(el, comment) {
    if (!requireLogin()) return;
    const slot = el.querySelector(':scope > .rc-comment-main > .rc-comment-content > .rc-reply-slot');
    if (slot.innerHTML) {
        slot.querySelector('textarea')?.focus();
        return;
    }
    slot.innerHTML = composerHtml({ placeholder: `Reply to ${comment.author.username}`, submitLabel: 'Reply', cancel: true });
    const form = slot.querySelector('form');
    const textarea = bindComposer(form, async (body) => {
        const { comment: created } = await api.post(`/posts/${page.post.id}/comments`, { body, parentId: comment.id });
        page.comments.push(created);
        page.post.commentCount += 1;
        renderTree();
        showToast('Reply posted');
    }, () => { slot.innerHTML = ''; });
    textarea.focus();
}

function openEdit(el, comment) {
    const body = el.querySelector(':scope > .rc-comment-main > .rc-comment-content > .rc-comment-body');
    const actions = el.querySelector(':scope > .rc-comment-main > .rc-comment-content > .rc-comment-actions');
    body.classList.add('hidden');
    actions.classList.add('hidden');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = composerHtml({ value: comment.body, submitLabel: 'Save', cancel: true });
    body.after(wrapper);
    const form = wrapper.querySelector('form');
    const close = () => {
        wrapper.remove();
        body.classList.remove('hidden');
        actions.classList.remove('hidden');
    };
    const textarea = bindComposer(form, async (value) => {
        const { comment: updated } = await api.patch(`/comments/${comment.id}`, { body: value });
        Object.assign(comment, { body: updated.body, edited: updated.edited });
        renderTree();
        showToast('Comment updated');
    }, close);
    form.querySelector('[type=submit]').disabled = false;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function scrollToHash() {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    if (hash.startsWith('#comment-')) target.classList.add('rc-highlight');
    if (hash === '#comments') document.querySelector('.rc-comment-textarea')?.focus();
}
