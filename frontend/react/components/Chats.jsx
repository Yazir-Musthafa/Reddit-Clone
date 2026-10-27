import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { UserAvatar } from './Avatars.jsx';
import { showToast } from '../Toasts.jsx';

export default function Chats() {
    const { chatModal, closeChatModal, user } = useAuth();
    const { isOpen, activeUser: initialActiveUser } = chatModal;

    const [conversations, setConversations] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [newChatUsername, setNewChatUsername] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const messagesEndRef = useRef(null);

    // Load conversations list
    const loadConversations = async () => {
        try {
            const data = await api.get('/chats');
            setConversations(data.chats || []);
        } catch {}
    };

    // Load active conversation messages
    const loadMessages = async (targetUsername) => {
        if (!targetUsername) return;
        try {
            const data = await api.get(`/chats/${encodeURIComponent(targetUsername)}`);
            setMessages(data.messages || []);
        } catch {}
    };

    useEffect(() => {
        if (isOpen) {
            loadConversations();
            if (initialActiveUser) {
                setActiveUser(initialActiveUser);
                loadMessages(initialActiveUser);
            }
        }
    }, [isOpen, initialActiveUser]);

    // Polling active chat
    useEffect(() => {
        if (isOpen && activeUser) {
            const interval = setInterval(() => {
                loadMessages(activeUser);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isOpen, activeUser]);

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleStartNewChat = async (e) => {
        e.preventDefault();
        const target = newChatUsername.trim();
        if (!target) return;
        try {
            const { user: other } = await api.get(`/users/${encodeURIComponent(target)}`);
            setActiveUser(other.username);
            setNewChatOpen(false);
            setNewChatUsername('');
            loadMessages(other.username);
            loadConversations();
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = messageInput.trim();
        if (!text || !activeUser) return;
        setMessageInput('');
        try {
            const data = await api.post(`/chats/${encodeURIComponent(activeUser)}`, { text });
            setMessages(prev => [...prev, data.message || { id: Date.now(), text, fromMe: true, createdAt: new Date() }]);
            loadConversations();
        } catch (err) {
            showToast(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`chats-popup-container${minimized ? ' chats-minimized' : ''}${expanded ? ' chats-expanded' : ''}`}
            id="chatsPopupModal"
        >
            {/* Left List Column */}
            <div className="chats-list-panel">
                <div className="chats-header-bar">
                    <div className="chats-header-left">
                        <div className="chats-snoo-badge">
                            <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                                <circle cx="10" cy="10" r="10" fill="#FF4500" />
                                <path fill="#FFF" d="M16.67 10a1.46 1.46 0 00-2.47-1.05 7.12 7.12 0 00-3.85-1.23l.8-2.54 2.18.52a1 1 0 101.07-1.42 1 1 0 00-.97.74l-2.44-.58a.28.28 0 00-.34.19l-.92 2.92a7.17 7.17 0 00-3.87 1.23 1.46 1.46 0 00-1.46 2.47 3.32 3.32 0 000 3.73 1.46 1.46 0 001.46 2.47 7.42 7.42 0 004.18 1.34 7.42 7.42 0 004.18-1.34 1.46 1.46 0 001.46-2.47 3.32 3.32 0 000-3.73 1.46 1.46 0 00-.18-.28zM7.05 11.23a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05zm5.9 3.55a3.67 3.67 0 01-2.95 1.03 3.67 3.67 0 01-2.95-1.03.28.28 0 010-.4.28.28 0 01.4 0 3.12 3.12 0 002.55.88 3.12 3.12 0 002.55-.88.28.28 0 01.4 0 .28.28 0 010 .4zm-.1-2.5a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05z" />
                            </svg>
                        </div>
                        <h3 className="chats-title">Chats</h3>

                        <button
                            type="button"
                            className="chats-action-icon"
                            id="chatsHomeBtn"
                            title="Back to conversations"
                            onClick={() => setActiveUser(null)}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                        </button>
                        <button
                            type="button"
                            className="chats-action-icon"
                            id="chatsNewBtn"
                            title="New Chat"
                            onClick={() => setNewChatOpen(prev => !prev)}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    className="chats-threads-subbar"
                    id="chatsRefreshBtn"
                    title="Refresh conversations"
                    onClick={loadConversations}
                >
                    <div className="threads-left">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                        <span>Conversations</span>
                    </div>
                </button>

                {/* New chat form */}
                <form
                    className={`rc-new-chat-form${newChatOpen ? '' : ' hidden'}`}
                    id="newChatForm"
                    onSubmit={handleStartNewChat}
                >
                    <input
                        type="text"
                        id="newChatUsername"
                        placeholder="Username (e.g. demo_user)"
                        autoComplete="off"
                        maxLength={20}
                        value={newChatUsername}
                        onChange={e => setNewChatUsername(e.target.value)}
                    />
                    <button type="submit">Start</button>
                </form>

                <div className="chats-threads-list" id="chatThreadsList">
                    {conversations.map(c => {
                        const other = c.otherUser || c.participant;
                        const isCurrent = activeUser === other?.username;
                        return (
                            <div
                                key={c.id || other?.username}
                                className={`chat-thread-row${isCurrent ? ' active' : ''}`}
                                onClick={() => {
                                    setActiveUser(other.username);
                                    loadMessages(other.username);
                                }}
                            >
                                <UserAvatar user={other} size={32} />
                                <div className="thread-info">
                                    <span className="thread-username">{other?.username}</span>
                                    <span className="thread-last-msg">{c.lastMessage?.text || 'No messages yet'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Active Conversation Panel */}
            <div className="chats-conversation-panel">
                <div className="chats-header-bar conv-header-bar">
                    <div className="conv-user-title">
                        <span id="activeChatAvatar">
                            {activeUser && <UserAvatar user={{ username: activeUser }} size={24} />}
                        </span>
                        <span className="active-user-name" id="activeChatUserName">
                            {activeUser || 'Chats'}
                        </span>
                    </div>

                    <div className="chats-header-right">
                        <button
                            type="button"
                            className="chats-control-btn"
                            id="btnExpandChats"
                            title="Expand"
                            onClick={() => setExpanded(prev => !prev)}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </button>
                        <button
                            type="button"
                            className="chats-control-btn"
                            id="btnMinimizeChats"
                            title="Minimize"
                            onClick={() => setMinimized(prev => !prev)}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <button
                            type="button"
                            className="chats-control-btn"
                            id="btnCloseChats"
                            title="Close"
                            onClick={closeChatModal}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>

                <div className="chats-messages-scroll" id="chatsMessagesScroll">
                    <div className="chat-messages-list" id="chatMessagesList">
                        {!activeUser ? (
                            <p className="rc-chat-empty">Pick a conversation, or press + to start a new chat.</p>
                        ) : !messages.length ? (
                            <p className="rc-chat-empty">No messages yet. Say hello!</p>
                        ) : (
                            messages.map((m, idx) => {
                                const isMe = m.fromMe || m.sender === user?.username || m.sender?.username === user?.username;
                                return (
                                    <div key={m.id || idx} className={`chat-bubble-row ${isMe ? 'msg-sent' : 'msg-received'}`}>
                                        <div className="msg-text-bubble">{m.text}</div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <form className="chats-input-bar" id="chatInputForm" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        className="chat-text-input"
                        id="chatMessageInput"
                        placeholder="Message"
                        autoComplete="off"
                        maxLength={2000}
                        disabled={!activeUser}
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn-send-chat"
                        id="btnSendChatMessage"
                        aria-label="Send message"
                        disabled={!activeUser || !messageInput.trim()}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
