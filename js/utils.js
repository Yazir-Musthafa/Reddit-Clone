export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function timeAgo(date) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const units = [
        ['yr.', 31536000], ['mo.', 2592000], ['d', 86400], ['hr.', 3600], ['min.', 60]
    ];
    for (const [label, size] of units) {
        const n = Math.floor(seconds / size);
        if (n >= 1) return label === 'd' ? `${n} ${n === 1 ? 'day' : 'days'} ago` : `${n} ${label} ago`;
    }
    return 'just now';
}

export function formatCount(n) {
    const num = Number(n) || 0;
    const abs = Math.abs(num);
    if (abs >= 1e6) return `${(num / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
    return String(num);
}

export function formatNumber(n) {
    return (Number(n) || 0).toLocaleString('en-US');
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

export function debounce(fn, wait = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

export function absoluteUrl(path) {
    return new URL(path, window.location.origin + '/').toString();
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    }
}

const SNOO_PATH = 'M16.67 10a1.46 1.46 0 00-2.47-1.05 7.12 7.12 0 00-3.85-1.23l.8-2.54 2.18.52a1 1 0 101.07-1.42 1 1 0 00-.97.74l-2.44-.58a.28.28 0 00-.34.19l-.92 2.92a7.17 7.17 0 00-3.87 1.23 1.46 1.46 0 00-1.46 2.47 3.32 3.32 0 000 3.73 1.46 1.46 0 001.46 2.47 7.42 7.42 0 004.18 1.34 7.42 7.42 0 004.18-1.34 1.46 1.46 0 001.46-2.47 3.32 3.32 0 000-3.73 1.46 1.46 0 00-.18-.28zM7.05 11.23a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05zm5.9 3.55a3.67 3.67 0 01-2.95 1.03 3.67 3.67 0 01-2.95-1.03.28.28 0 010-.4.28.28 0 01.4 0 3.12 3.12 0 002.55.88 3.12 3.12 0 002.55-.88.28.28 0 01.4 0 .28.28 0 010 .4zm-.1-2.5a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05z';

/** Snoo avatar in the user's colour. */
export function userAvatar(user, size = 24) {
    const color = escapeHtml(user?.avatarColor || '#828F9A');
    return `<svg class="snoo-avatar no-invert" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="10" fill="${color}"/><path fill="#FFF" d="${SNOO_PATH}"/></svg>`;
}

export function communityIcon(community, size = 24) {
    const label = community?.icon || (community?.name || 'r').charAt(0).toUpperCase();
    const fontSize = Math.max(10, Math.round(size * 0.5));
    return `<span class="community-icon rc-community-icon no-invert" style="width:${size}px;height:${size}px;background-color:${escapeHtml(community?.color || '#FF4500')};color:#fff;font-size:${fontSize}px;">${escapeHtml(label)}</span>`;
}

/** Plain-text comment bodies: escape, keep line breaks, and link bare URLs. */
export function formatCommentBody(text) {
    return escapeHtml(text)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>')
        .replace(/\n/g, '<br>');
}

export function domainOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function isIndexPage() {
    const path = window.location.pathname;
    return path === '/' || path.endsWith('/index.html');
}

/** Navigate to a home-page view (home/popular/news/explore/...), from any page. */
export function homeViewUrl(view, extra = {}) {
    const params = new URLSearchParams({ view, ...extra });
    return `index.html?${params}`;
}

// ---- Per-viewer conveniences kept in localStorage ------------------------------------------

export function readLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function writeLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage unavailable (private mode); ignore */
    }
}

export function rememberRecentPost(post) {
    const recent = readLocal('rc_recent_posts', []).filter(p => p.id !== post.id);
    recent.unshift({
        id: post.id,
        title: post.title,
        community: { name: post.community.name, icon: post.community.icon, color: post.community.color },
        score: post.score,
        commentCount: post.commentCount,
        thumb: post.media?.find(m => m.type === 'image')?.url || '',
        viewedAt: Date.now()
    });
    writeLocal('rc_recent_posts', recent.slice(0, 10));
}
