import { openAuthModal, showToast } from '../../js/interactions.js';
import { toggleChatsModal, openChatWith } from '../chats/chats.js';
import { authState } from '../../js/auth-state.js';
import { api } from '../../js/api.js';
import { escapeHtml, timeAgo, userAvatar } from '../../js/utils.js';
import { isDarkMode, toggleDisplayMode } from '../../js/display-mode.js';

const NOTIF_ICONS = { comment: '💬', reply: '↩️', message: '✉️', community: '🛡️' };
let pollTimer = null;

export function initHeader() {
    const { isLoggedIn, user } = authState.getState();
    const moreBtn = document.getElementById('headerMoreBtn');
    const moreDropdown = document.getElementById('moreDropdown');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const bellBtn = document.getElementById('headerBellBtn');
    const notifDropdown = document.getElementById('notifDropdown');

    const byId = (id) => document.getElementById(id);

    if (byId('headerSignupBtn')) byId('headerSignupBtn').onclick = () => openAuthModal('Sign Up');
    if (byId('headerLoginBtn')) byId('headerLoginBtn').onclick = () => openAuthModal('Log In');
    if (byId('moreLoginLink')) {
        byId('moreLoginLink').onclick = (e) => {
            e.preventDefault();
            moreDropdown?.classList.add('hidden');
            openAuthModal('Log In');
        };
    }
    if (byId('headerDisplayBtn')) {
        byId('headerDisplayBtn').onclick = () => toggleDisplayMode();
    }

    if (moreBtn && moreDropdown) {
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            moreDropdown.classList.toggle('hidden');
        };
    }

    if (isLoggedIn && user) {
        byId('headerAvatar').innerHTML = userAvatar(user, 32);
        byId('dropdownAvatar').innerHTML = userAvatar(user, 36);
        byId('dropdownUsername').textContent = `u/${user.username}`;
        byId('profileViewLink').href = `user.html?u=${encodeURIComponent(user.username)}`;
        byId('profileAchievementsLink').href = `user.html?u=${encodeURIComponent(user.username)}&tab=achievements`;
        byId('achievementsCount').textContent = `${user.achievementsUnlocked} unlocked`;

        byId('headerChatBtn').onclick = (e) => {
            e.stopPropagation();
            toggleChatsModal();
        };

        const modToggle = byId('modModeToggle');
        modToggle.checked = user.prefs?.modMode !== false;
        modToggle.onchange = async () => {
            try {
                await api.patch('/users/me', { prefs: { modMode: modToggle.checked } });
                user.prefs.modMode = modToggle.checked;
                showToast(`Mod Mode ${modToggle.checked ? 'on' : 'off'}`);
            } catch (err) {
                modToggle.checked = !modToggle.checked;
                showToast(err.message);
            }
        };

        const displayLabel = byId('displayModeLabel');
        displayLabel.textContent = isDarkMode() ? 'Dark' : 'Light';
        byId('displayModeBtn').onclick = () => {
            displayLabel.textContent = toggleDisplayMode() ? 'Dark' : 'Light';
        };

        byId('profileLogoutBtn').onclick = (e) => {
            e.preventDefault();
            profileDropdown.classList.add('hidden');
            authState.logout();
        };

        bellBtn.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.add('hidden');
            notifDropdown.classList.toggle('hidden');
            bellBtn.setAttribute('aria-expanded', String(!notifDropdown.classList.contains('hidden')));
            if (!notifDropdown.classList.contains('hidden')) loadNotifications();
        };
        notifDropdown.onclick = (e) => e.stopPropagation();
        byId('notifMarkAllBtn').onclick = async () => {
            await api.post('/notifications/read-all').catch(() => {});
            loadNotifications();
        };

        clearInterval(pollTimer);
        refreshBadges();
        pollTimer = setInterval(refreshBadges, 30000);
    }

    if (userProfileBtn && profileDropdown) {
        userProfileBtn.onclick = (e) => {
            e.stopPropagation();
            moreDropdown?.classList.add('hidden');
            notifDropdown?.classList.add('hidden');
            profileDropdown.classList.toggle('hidden');
            userProfileBtn.setAttribute('aria-expanded', String(!profileDropdown.classList.contains('hidden')));
        };
        profileDropdown.onclick = (e) => e.stopPropagation();
    }

    document.addEventListener('click', () => {
        moreDropdown?.classList.add('hidden');
        notifDropdown?.classList.add('hidden');
        if (profileDropdown && !profileDropdown.classList.contains('hidden')) {
            profileDropdown.classList.add('hidden');
            userProfileBtn?.setAttribute('aria-expanded', 'false');
        }
    });
}

function setBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('hidden', !count);
}

export async function refreshBadges() {
    try {
        const [{ unread }, { count }] = await Promise.all([api.get('/notifications'), api.get('/chats/unread')]);
        setBadge('notifUnreadBadge', unread);
        setBadge('chatUnreadBadge', count);
    } catch {
        /* offline or logged out; badges simply stay as they are */
    }
}

async function loadNotifications() {
    const list = document.getElementById('notifList');
    try {
        const { notifications, unread } = await api.get('/notifications');
        setBadge('notifUnreadBadge', unread);
        if (!notifications.length) {
            list.innerHTML = '<p class="rc-notif-empty">No notifications yet. When someone replies to you or messages you, it shows up here.</p>';
            return;
        }
        list.innerHTML = notifications.map(n => `
            <button class="rc-notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-link="${escapeHtml(n.link)}">
                <span class="rc-notif-icon">${NOTIF_ICONS[n.type] || '🔔'}</span>
                <span class="rc-notif-text">${escapeHtml(n.text)}<small>${timeAgo(n.createdAt)}</small></span>
            </button>`).join('');
        list.querySelectorAll('.rc-notif-item').forEach(item => {
            item.onclick = async () => {
                await api.post(`/notifications/${item.dataset.id}/read`).catch(() => {});
                document.getElementById('notifDropdown').classList.add('hidden');
                const link = item.dataset.link;
                if (link.startsWith('chat:')) {
                    openChatWith(link.slice(5));
                    refreshBadges();
                } else if (link) {
                    window.location.href = link;
                }
            };
        });
    } catch (err) {
        list.innerHTML = `<p class="rc-notif-empty">${escapeHtml(err.message)}</p>`;
    }
}
