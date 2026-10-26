import { escapeHtml, formatNumber, formatDate, communityIcon, userAvatar } from './utils.js';
import { authState } from './auth-state.js';
import { toggleJoin, requireLogin } from './ui.js';
import { showToast } from './interactions.js';
import { openChatWith } from '../components/chats/chats.js';

const TYPE_ICONS = { Public: '🌐', Restricted: '👁️', Private: '🔒' };

export function aboutCardHtml(c, { showHeader = true } = {}) {
    const joined = authState.isJoined(c.name);
    return `
        <div class="rc-side-card">
            ${showHeader ? `<div class="rc-side-card-banner no-invert" style="background-color:${escapeHtml(c.bannerColor)}"></div>` : ''}
            <div class="rc-side-card-body">
                ${showHeader ? `<a class="rc-side-title" href="community.html?name=${encodeURIComponent(c.name)}">${communityIcon(c, 36)}<span>r/${escapeHtml(c.name)}</span></a>` : '<h3 class="rc-side-heading">About community</h3>'}
                <p class="rc-side-desc">${escapeHtml(c.description)}</p>
                <div class="rc-side-meta">
                    <span>🎂 Created ${formatDate(c.createdAt)}</span>
                    <span>${TYPE_ICONS[c.type]} ${escapeHtml(c.type)}${c.mature ? ' • 18+' : ''}</span>
                    <span>🏷️ ${escapeHtml(c.topic)}</span>
                </div>
                <div class="rc-side-stats">
                    <div><strong>${formatNumber(c.memberCount)}</strong><span>Members</span></div>
                    ${c.postCount !== undefined ? `<div><strong>${formatNumber(c.weeklyPosts)}</strong><span>Posts this week</span></div>` : ''}
                </div>
                <div class="rc-side-actions">
                    ${showHeader ? `<button class="ui-btn ${joined ? 'ui-btn-secondary joined' : 'ui-btn-primary'}" data-join-community="${escapeHtml(c.name)}" data-side-join>${joined ? 'Joined' : 'Join'}</button>` : ''}
                    ${c.canPost !== false ? `<a class="ui-btn ui-btn-secondary" href="submit.html?community=${encodeURIComponent(c.name)}">Create Post</a>` : ''}
                </div>
            </div>
        </div>`;
}

export function rulesCardHtml(c) {
    if (!c.rules?.length) return '';
    return `
        <div class="rc-side-card">
            <div class="rc-side-card-body">
                <h3 class="rc-side-heading">r/${escapeHtml(c.name)} Rules</h3>
                <ol class="rc-rules-list">
                    ${c.rules.map((r, i) => `
                        <li>
                            <details>
                                <summary><span class="rc-rule-num">${i + 1}</span>${escapeHtml(r.title)}</summary>
                                ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}
                            </details>
                        </li>`).join('')}
                </ol>
            </div>
        </div>`;
}

export function moderatorsCardHtml(c) {
    if (!c.moderators?.length) return '';
    return `
        <div class="rc-side-card">
            <div class="rc-side-card-body">
                <h3 class="rc-side-heading">Moderators</h3>
                <div class="rc-mod-list">
                    ${c.moderators.map(m => `<a class="rc-mod-item" href="user.html?u=${encodeURIComponent(m.username)}">${userAvatar(m, 24)}<span>u/${escapeHtml(m.username)}</span></a>`).join('')}
                </div>
                <button class="ui-btn ui-btn-secondary rc-full-width" data-message-mods>Message the mods</button>
            </div>
        </div>`;
}

export function messageMods(community) {
    if (!requireLogin()) return;
    const mod = community.moderators.find(m => m.username !== authState.user.username);
    if (!mod) return showToast("You're the only moderator here");
    openChatWith(mod.username);
}

/** Wires join buttons and the "message the mods" button inside a rendered sidebar. */
export function bindSideCards(root, community) {
    root.querySelectorAll('[data-side-join]').forEach(btn => {
        btn.onclick = async () => {
            const result = await toggleJoin(community);
            if (!result) return;
            btn.classList.toggle('ui-btn-primary', !result.joined);
            btn.classList.toggle('ui-btn-secondary', result.joined);
        };
    });
    root.querySelectorAll('[data-message-mods]').forEach(btn => {
        btn.onclick = () => messageMods(community);
    });
}
