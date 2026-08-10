import { showToast } from '../../js/interactions.js';

export function initChats() {
    const modal = document.getElementById('chatsPopupModal');
    const closeBtns = document.querySelectorAll('#btnCloseChats');
    const minimizeBtns = document.querySelectorAll('#btnMinimizeChats');
    const threadItems = document.querySelectorAll('.thread-item');
    
    // Inputs & Send
    const msgInput = document.getElementById('chatMessageInput');
    const sendBtn = document.getElementById('btnSendChatMessage');
    const msgsList = document.getElementById('chatMessagesList');

    // Thread item selection (switches silently without annoying toast pop-ups!)
    threadItems.forEach(item => {
        item.onclick = () => {
            threadItems.forEach(t => t.classList.remove('active'));
            item.classList.add('active');

            const userName = item.getAttribute('data-user') || 'Chat';
            const activeTitle = document.getElementById('activeChatUserName');
            const profileTitle = document.getElementById('chatProfileTitle');

            if (activeTitle) activeTitle.textContent = userName;
            if (profileTitle) profileTitle.textContent = userName;
        };
    });

    // Close & Minimize
    closeBtns.forEach(btn => {
        btn.onclick = () => {
            if (modal) modal.classList.add('hidden');
        };
    });

    minimizeBtns.forEach(btn => {
        btn.onclick = () => {
            if (modal) modal.classList.toggle('minimized');
        };
    });

    // Send Message Logic
    const handleSendMessage = () => {
        if (!msgInput || !msgsList) return;
        const text = msgInput.value.trim();
        if (!text) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const msgGroup = document.createElement('div');
        msgGroup.className = 'chat-message-group';
        msgGroup.innerHTML = `
            <div class="msg-author-avatar avatar-pink-snoo">
                <span>S</span>
            </div>
            <div class="msg-content-wrapper">
                <div class="msg-author-header">
                    <span class="msg-author-name">Fantastic-Series2270</span>
                    <span class="msg-time">${timeStr}</span>
                </div>
                <p class="msg-text-bubble">${escapeHtml(text)}</p>
            </div>
        `;

        msgsList.appendChild(msgGroup);

        // Update thread preview subtext
        const activeThread = document.querySelector('.thread-item.active .thread-subtext');
        if (activeThread) activeThread.textContent = `You: ${text}`;

        msgInput.value = '';
        if (sendBtn) sendBtn.classList.remove('active');

        // Scroll to bottom of chat
        const scrollContainer = document.getElementById('chatsMessagesScroll');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    };

    if (msgInput) {
        msgInput.oninput = () => {
            if (sendBtn) {
                if (msgInput.value.trim().length > 0) sendBtn.classList.add('active');
                else sendBtn.classList.remove('active');
            }
        };

        msgInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
            }
        };
    }

    if (sendBtn) {
        sendBtn.onclick = handleSendMessage;
    }
}

export function toggleChatsModal() {
    const modal = document.getElementById('chatsPopupModal');
    if (modal) {
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            modal.classList.remove('minimized');
        } else {
            modal.classList.add('hidden');
        }
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
