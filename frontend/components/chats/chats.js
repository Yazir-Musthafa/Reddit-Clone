import { showToast } from '../../js/interactions.js';
import { api } from '../../js/api.js';
import { authState } from '../../js/auth-state.js';
import { requireLogin } from '../../js/ui.js';
import { escapeHtml, userAvatar, formatCount, formatDate } from '../../js/utils.js';

const chat = {
    active: null,        // username of the open conversation
    other: null,         // that user's public profile
    lastMessageId: null,
    pollTimer: null
};

const byId = (id) => document.getElementById(id);

export function initChats() {
    const modal = byId('chatsPopupModal');
    if (!modal) return;

    byId('btnCloseChats').onclick = () => closeChats();
    byId('btnMinimizeChats').onclick = () => modal.classList.toggle('minimized');
    byId('btnExpandChats').onclick = () => modal.classList.toggle('expanded');
    byId('chatsRefreshBtn').onclick = () => loadThreads();
    byId('chatsHomeBtn').onclick = () => {
        chat.active = null;
        renderEmptyConversation();
        loadThreads();
    };

    const newChatForm = byId('newChatForm');
    byId('chatsNewBtn').onclick = () => {
        newChatForm.classList.toggle('hidden');
        if (!newChatForm.classList.contains('hidden')) byId('newChatUsername').focus();
    };
    newChatForm.onsubmit = (e) => {
        e.preventDefault();
        const username = byId('newChatUsername').value.trim().replace(/^u\//, '');
        if (!username) return;
        newChatForm.classList.add('hidden');
        byId('newChatUsername').value = '';
        selectConversation(username);
    };

    const input = byId('chatMessageInput');
    const sendBtn = byId('btnSendChatMessage');
    input.oninput = () => sendBtn.classList.toggle('active', input.value.trim().length > 0);
    byId('chatInputForm').onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !chat.active) return;
        input.value = '';
        sendBtn.classList.remove('active');
        try {
            const { message } = await api.post(`/chats/${encodeURIComponent(chat.active)}`, { text });
            appendMessages([message], true);
            loadThreads();
        } catch (err) {
            input.value = text;
            showToast(err.message);
        }
    };
}

export function toggleChatsModal() {
    const modal = byId('chatsPopupModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) openChats();
    else closeChats();
}

export function openChatWith(username) {
    if (!requireLogin()) return;
    openChats();
    selectConversation(username);
}

function openChats() {
    if (!requireLogin()) return;
    const modal = byId('chatsPopupModal');
    modal.classList.remove('hidden', 'minimized');
    loadThreads();
    clearInterval(chat.pollTimer);
    chat.pollTimer = setInterval(poll, 4000);
}

function closeChats() {
    byId('chatsPopupModal')?.classList.add('hidden');
    clearInterval(chat.pollTimer);
}

async function poll() {
    const modal = byId('chatsPopupModal');
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('minimized')) return;
    loadThreads();
    if (chat.active) loadConversation(chat.active, { quiet: true });
}

async function loadThreads() {
    const list = byId('chatThreadsList');
    try {
        const { conversations } = await api.get('/chats');
        if (!conversations.length) {
            list.innerHTML = '<p class="rc-chat-empty">No conversations yet. Press + to message someone.</p>';
            return;
        }
        list.innerHTML = conversations.map(c => `
            <button class="thread-item ${c.user.username === chat.active ? 'active' : ''}" data-user="${escapeHtml(c.user.username)}">
                <span class="thread-avatar-slot">${userAvatar(c.user, 36)}</span>
                <div class="thread-info">
                    <span class="thread-name">${escapeHtml(c.user.username)}</span>
                    <span class="thread-subtext">${c.lastMessage.fromMe ? 'You: ' : ''}${escapeHtml(c.lastMessage.text)}</span>
                </div>
                ${c.unread ? `<span class="rc-count-badge rc-thread-badge">${c.unread}</span>` : ''}
            </button>`).join('');
        list.querySelectorAll('.thread-item').forEach(item => {
            item.onclick = () => selectConversation(item.dataset.user);
        });
    } catch (err) {
        list.innerHTML = `<p class="rc-chat-empty">${escapeHtml(err.message)}</p>`;
    }
}

function renderEmptyConversation() {
    byId('activeChatUserName').textContent = 'Chats';
    byId('activeChatAvatar').innerHTML = '';
    byId('chatProfileHeader').classList.add('hidden');
    byId('chatMessagesList').innerHTML = '<p class="rc-chat-empty">Pick a conversation, or press + to start a new chat.</p>';
    byId('chatMessageInput').disabled = true;
    document.querySelectorAll('#chatThreadsList .thread-item').forEach(t => t.classList.remove('active'));
}

function selectConversation(username) {
    chat.active = username;
    chat.other = null;
    chat.lastMessageId = null;
    document.querySelectorAll('#chatThreadsList .thread-item').forEach(t => t.classList.toggle('active', t.dataset.user === username));
    byId('chatMessagesList').innerHTML = '<div class="rc-spinner"></div>';
    loadConversation(username);
}

async function loadConversation(username, { quiet = false } = {}) {
    try {
        const { user, messages } = await api.get(`/chats/${encodeURIComponent(username)}`);
        if (chat.active !== username) return;
        chat.active = user.username;
        chat.other = user;

        byId('activeChatUserName').textContent = user.username;
        byId('activeChatAvatar').innerHTML = userAvatar(user, 24);
        byId('chatProfileHeader').classList.remove('hidden');
        byId('chatProfileAvatar').innerHTML = userAvatar(user, 56);
        byId('chatProfileTitle').textContent = `u/${user.username}`;
        byId('chatProfileTitle').href = `user.html?u=${encodeURIComponent(user.username)}`;
        byId('chatProfileMeta').textContent = `Redditor since ${formatDate(user.createdAt)} • ${formatCount(user.karma)} karma`;

        const input = byId('chatMessageInput');
        input.disabled = !user.allowChats;
        input.placeholder = user.allowChats ? 'Message' : `u/${user.username} isn't accepting chats`;

        const newest = messages[messages.length - 1]?.id || null;
        if (quiet && newest === chat.lastMessageId) return;
        byId('chatMessagesList').innerHTML = messages.length ? '' : '<p class="rc-chat-empty">Say hi 👋</p>';
        appendMessages(messages, true);
        if (!quiet) {
            input.focus();
            loadThreads();
        }
    } catch (err) {
        if (quiet) return;
        byId('chatMessagesList').innerHTML = `<p class="rc-chat-empty">${escapeHtml(err.message)}</p>`;
        byId('chatMessageInput').disabled = true;
        chat.active = null;
    }
}

function appendMessages(messages, scroll) {
    const list = byId('chatMessagesList');
    list.querySelector('.rc-chat-empty')?.remove();
    const me = authState.user;
    const other = chat.other || { username: chat.active, avatarColor: '#828F9A' };
    let lastDay = list.dataset.lastDay || '';
    if (!list.children.length) lastDay = '';

    messages.forEach(m => {
        const day = new Date(m.createdAt).toDateString();
        if (day !== lastDay) {
            const isToday = day === new Date().toDateString();
            list.insertAdjacentHTML('beforeend', `<div class="chat-date-divider"><span>${isToday ? 'Today' : formatDate(m.createdAt)}</span></div>`);
            lastDay = day;
        }
        const author = m.fromMe ? me : other;
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-message-group ${m.fromMe ? 'rc-from-me' : ''}">
                <span class="msg-author-avatar-slot">${userAvatar(author, 28)}</span>
                <div class="msg-content-wrapper">
                    <div class="msg-author-header">
                        <span class="msg-author-name">${escapeHtml(author.username)}</span>
                        <span class="msg-time" title="${escapeHtml(new Date(m.createdAt).toLocaleString())}">${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p class="msg-text-bubble">${escapeHtml(m.text)}</p>
                </div>
            </div>`);
        chat.lastMessageId = m.id;
    });
    list.dataset.lastDay = lastDay;

    if (scroll) {
        const scroller = byId('chatsMessagesScroll');
        scroller.scrollTop = scroller.scrollHeight;
    }
}

