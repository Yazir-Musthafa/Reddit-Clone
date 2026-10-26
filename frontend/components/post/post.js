import { authState } from '../../js/auth-state.js';
import {
    escapeHtml, timeAgo, formatCount, communityIcon, userAvatar, domainOf
} from '../../js/utils.js';

const ICON = {
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    comment: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    more: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    expand: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    external: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
};

export function postUrl(post) {
    return `post.html?id=${encodeURIComponent(post.id)}`;
}

function communityUrl(name) {
    return `community.html?name=${encodeURIComponent(name)}`;
}

function userUrl(name) {
    return `user.html?u=${encodeURIComponent(name)}`;
}

function voteClass(post) {
    return post.userVote === 1 ? 'voted-up' : post.userVote === -1 ? 'voted-down' : '';
}

function isSensitive(post) {
    return post.tags.includes('NSFW') || post.tags.includes('Spoiler');
}

function joinButtonHtml(post, { showCommunity }) {
    if (!showCommunity || authState.isJoined(post.community.name)) return '';
    return `<button class="btn-post-join" data-action="join" data-join-community="${escapeHtml(post.community.name)}">Join</button>`;
}

function optionsMenuHtml(post, { detail }) {
    const loggedIn = authState.getState().isLoggedIn;
    const modMode = authState.user?.prefs?.modMode !== false;
    const items = [
        `<button class="post-option-item" data-action="save">${post.saved ? 'Unsave' : 'Save'}</button>`,
        `<button class="post-option-item" data-action="hide">${post.hidden ? 'Unhide' : 'Hide'}</button>`,
        `<button class="post-option-item" data-action="copy">Copy link</button>`
    ];
    if (loggedIn && !post.isAuthor) items.push(`<button class="post-option-item" data-action="report">Report</button>`);
    if (post.isAuthor) {
        items.push(detail
            ? `<button class="post-option-item" data-action="edit">Edit post</button>`
            : `<a class="post-option-item" href="${postUrl(post)}&edit=1">Edit post</a>`);
        items.push(`<button class="post-option-item delete-option" data-action="delete">Delete</button>`);
    } else if (post.canModerate && modMode) {
        items.push(`<button class="post-option-item delete-option" data-action="delete">Remove (mod)</button>`);
    }
    return `
        <div class="post-options-wrapper">
            <button class="btn-post-more" data-action="menu" aria-label="Post options" aria-haspopup="true">${ICON.more}</button>
            <div class="post-options-menu hidden" role="menu">${items.join('')}</div>
        </div>`;
}

function mediaHtml(post, detail) {
    if (!post.media.length) return '';
    const blurred = !detail && isSensitive(post);
    const multiple = post.media.length > 1;
    return `
        <div class="post-carousel-container rc-media ${blurred ? 'rc-blurred' : ''}" data-index="0">
            <div class="carousel-track">
                ${post.media.map((m, i) => m.type === 'video'
                    ? `<video class="post-image rc-media-item ${i ? 'hidden' : ''}" src="${escapeHtml(m.url)}" controls preload="metadata"></video>`
                    : `<img class="post-image rc-media-item ${i ? 'hidden' : ''}" src="${escapeHtml(m.url)}" alt="${escapeHtml(post.title)}" loading="lazy">`).join('')}
            </div>
            ${multiple ? `
                <button class="carousel-arrow arrow-left" data-action="prev" aria-label="Previous image">${ICON.left}</button>
                <button class="carousel-arrow arrow-right" data-action="next" aria-label="Next image">${ICON.right}</button>
                <div class="carousel-indicators">${post.media.map((_, i) => `<span class="dot ${i ? '' : 'active'}" data-dot="${i}"></span>`).join('')}</div>` : ''}
            ${blurred ? `<button class="rc-reveal-btn" data-action="reveal">View ${post.tags.includes('NSFW') ? 'NSFW' : 'spoiler'} content</button>` : ''}
        </div>`;
}

function linkHtml(post) {
    if (!post.url) return '';
    return `
        <a class="rc-link-preview" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer nofollow">
            <span class="rc-link-domain">${escapeHtml(domainOf(post.url))} ${ICON.external}</span>
            <span class="rc-link-url">${escapeHtml(post.url)}</span>
        </a>`;
}

function bodyHtml(post, detail) {
    if (!post.body) return '';
    if (detail) return `<div class="post-body-rich rc-post-body">${post.body}</div>`;
    if (post.media.length || post.tags.includes('Spoiler')) return '';
    return `<div class="post-body-rich rc-body-preview">${post.body}</div>`;
}

export function postCardHtml(post, { showCommunity = true, detail = false } = {}) {
    const titleTag = detail ? 'h1' : 'h2';
    const meta = showCommunity
        ? `${communityIcon(post.community, 24)}
           <a href="${communityUrl(post.community.name)}" class="post-community-name">r/${escapeHtml(post.community.name)}</a>
           <span class="post-dot-separator">•</span>
           <span class="post-timestamp" title="${escapeHtml(new Date(post.createdAt).toLocaleString())}">${timeAgo(post.createdAt)}</span>
           ${detail ? `<span class="post-dot-separator">•</span><a class="rc-author-link" href="${userUrl(post.author.username)}">u/${escapeHtml(post.author.username)}</a>` : ''}`
        : `${userAvatar(post.author, 24)}
           <a href="${userUrl(post.author.username)}" class="post-community-name">u/${escapeHtml(post.author.username)}</a>
           <span class="post-dot-separator">•</span>
           <span class="post-timestamp">${timeAgo(post.createdAt)}</span>`;

    return `
        <article class="post-card feed-post ${detail ? 'rc-post-detail' : 'rc-clickable'}" data-post-id="${escapeHtml(post.id)}">
            <header class="post-header">
                <div class="post-meta-left">
                    ${meta}
                    ${post.edited ? '<span class="post-dot-separator">•</span><span class="post-timestamp">edited</span>' : ''}
                </div>
                <div class="post-meta-right">
                    ${joinButtonHtml(post, { showCommunity })}
                    ${optionsMenuHtml(post, { detail })}
                </div>
            </header>
            ${post.tags.length ? `<div class="post-tags-row">${post.tags.map(t => `<span class="post-tag-chip rc-tag-${escapeHtml(t.toLowerCase())}">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <${titleTag} class="post-title rc-post-title">${detail ? escapeHtml(post.title) : `<a href="${postUrl(post)}">${escapeHtml(post.title)}</a>`}</${titleTag}>
            ${linkHtml(post)}
            ${bodyHtml(post, detail)}
            ${mediaHtml(post, detail)}
            <footer class="post-action-bar">
                <div class="action-pill vote-pill ${voteClass(post)}">
                    <button class="vote-btn vote-up" data-action="upvote" aria-label="Upvote" aria-pressed="${post.userVote === 1}">${ICON.up}</button>
                    <span class="vote-count">${formatCount(post.score)}</span>
                    <button class="vote-btn vote-down" data-action="downvote" aria-label="Downvote" aria-pressed="${post.userVote === -1}">${ICON.down}</button>
                </div>
                <a class="action-pill comment-pill" href="${postUrl(post)}#comments" aria-label="Comments">${ICON.comment}<span class="rc-comment-count">${formatCount(post.commentCount)}</span></a>
                <button class="action-pill share-pill" data-action="save" aria-label="Save post">${ICON.save}<span class="rc-save-label">${post.saved ? 'Saved' : 'Save'}</span></button>
                <button class="action-pill share-pill" data-action="share">${ICON.share}<span>Share</span></button>
            </footer>
        </article>`;
}

export function compactPostHtml(post, { showCommunity = true } = {}) {
    const thumb = post.media.find(m => m.type === 'image');
    const video = !thumb && post.media.find(m => m.type === 'video');
    const thumbHtml = thumb
        ? `<img src="${escapeHtml(thumb.url)}" alt="" class="compact-thumb-img ${isSensitive(post) ? 'rc-blur-thumb' : ''}" loading="lazy">`
        : `<span class="rc-compact-placeholder">${video ? '▶' : post.url ? '🔗' : '📝'}</span>`;
    return `
        <article class="compact-post-card feed-post rc-clickable" data-post-id="${escapeHtml(post.id)}">
            <a class="compact-thumb" href="${postUrl(post)}" aria-hidden="true" tabindex="-1">
                ${thumbHtml}
                ${post.media.length > 1 ? `<span class="compact-badge">${post.media.length}</span>` : ''}
            </a>
            <div class="compact-body">
                <div class="compact-header">
                    ${showCommunity
                        ? `${communityIcon(post.community, 20)}<a href="${communityUrl(post.community.name)}" class="compact-community-name">r/${escapeHtml(post.community.name)}</a>
                           ${authState.isJoined(post.community.name) ? '' : `<button class="compact-btn-join" data-action="join" data-join-community="${escapeHtml(post.community.name)}">Join</button>`}`
                        : `<a href="${userUrl(post.author.username)}" class="compact-community-name">u/${escapeHtml(post.author.username)}</a>`}
                    <span>•</span>
                    <span>${timeAgo(post.createdAt)}</span>
                </div>
                <h2 class="compact-title"><a href="${postUrl(post)}">${escapeHtml(post.title)}</a></h2>
                <div class="compact-footer">
                    <button class="compact-pill" data-action="expand" title="Expand post">${ICON.expand}</button>
                    <div class="compact-pill vote-pill ${voteClass(post)}">
                        <button class="vote-btn vote-up" data-action="upvote" aria-label="Upvote">${ICON.up}</button>
                        <span class="vote-count">${formatCount(post.score)}</span>
                        <button class="vote-btn vote-down" data-action="downvote" aria-label="Downvote">${ICON.down}</button>
                    </div>
                    <a class="compact-pill" href="${postUrl(post)}#comments">${ICON.comment}<span>${formatCount(post.commentCount)} comment${post.commentCount === 1 ? '' : 's'}</span></a>
                    <button class="compact-pill" data-action="save"><span class="rc-save-label">${post.saved ? 'Saved' : 'Save'}</span></button>
                    <button class="compact-pill" data-action="share">Share</button>
                    ${optionsMenuHtml(post, { detail: false })}
                </div>
            </div>
        </article>`;
}
