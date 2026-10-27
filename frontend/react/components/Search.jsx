import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../../js/api.js';
import { formatCount, debounce } from '../../js/utils.js';

export default function Search() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(() => searchParams.get('q') || '');
    const [suggestions, setSuggestions] = useState({ communities: [], users: [] });
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    // Keep query synced with URL if on search page
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null && q !== undefined) {
            setQuery(q);
        }
    }, [searchParams]);

    // Close on click outside
    useEffect(() => {
        const handleDocClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    const fetchSuggestions = useRef(
        debounce(async (val) => {
            if (!val.trim()) {
                setOpen(false);
                return;
            }
            try {
                const res = await api.get(`/search/suggest?q=${encodeURIComponent(val.trim())}`);
                setSuggestions(res || { communities: [], users: [] });
                setOpen(true);
            } catch {
                setOpen(false);
            }
        }, 200)
    ).current;

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        fetchSuggestions(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = query.trim();
            if (val) {
                setOpen(false);
                navigate(`/search.html?q=${encodeURIComponent(val)}`);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const handleAskClick = () => {
        const val = query.trim();
        if (val) {
            setOpen(false);
            navigate(`/search.html?q=${encodeURIComponent(val)}&type=posts`);
        } else {
            const input = containerRef.current?.querySelector('#searchInput');
            if (input) {
                input.placeholder = 'Ask a question, then press Enter';
                input.focus();
            }
        }
    };

    return (
        <div className="search-bar" id="searchContainer" ref={containerRef}>
            <div className="search-input-wrapper">
                <div className="search-icon-bg">
                    <svg className="search-snoo-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-3.5 8a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zm-6.2 2.8a.5.5 0 01.7 0 3 3 0 004 0 .5.5 0 01.7.7 4 4 0 01-5.4 0 .5.5 0 010-.7z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="search-input"
                    id="searchInput"
                    placeholder="Find anything"
                    aria-label="Search Reddit"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="searchSuggest"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => { if (query.trim()) fetchSuggestions(query); }}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <div className="search-divider"></div>

            <button type="button" className="search-ask-btn" id="askBtn" aria-label="Ask Reddit AI" onClick={handleAskClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
                </svg>
                <span>Ask</span>
            </button>

            <div className={`rc-search-suggest${open ? '' : ' hidden'}`} id="searchSuggest" role="listbox">
                {suggestions.communities?.length > 0 && (
                    <>
                        <div className="rc-suggest-label">Communities</div>
                        {suggestions.communities.map(c => (
                            <a
                                key={c.id || c.name}
                                className="rc-suggest-item"
                                href={`community.html?name=${encodeURIComponent(c.name)}`}
                                role="option"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setOpen(false);
                                    navigate(`/community.html?name=${encodeURIComponent(c.name)}`);
                                }}
                            >
                                <span className="community-icon-sm" style={{ backgroundColor: c.color || '#FF4500', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', fontWeight: 'bold' }}>
                                    {c.icon || 'r/'}
                                </span>
                                <span><strong>r/{c.name}</strong><small>{formatCount(c.memberCount)} members</small></span>
                            </a>
                        ))}
                    </>
                )}

                {suggestions.users?.length > 0 && (
                    <>
                        <div className="rc-suggest-label">People</div>
                        {suggestions.users.map(u => (
                            <a
                                key={u.id || u.username}
                                className="rc-suggest-item"
                                href={`user.html?u=${encodeURIComponent(u.username)}`}
                                role="option"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setOpen(false);
                                    navigate(`/user.html?u=${encodeURIComponent(u.username)}`);
                                }}
                            >
                                <span className="user-avatar-sm" style={{ backgroundColor: u.avatarColor || '#FF4500', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', fontWeight: 'bold' }}>
                                    {u.username[0]?.toUpperCase() || 'u'}
                                </span>
                                <span><strong>u/{u.username}</strong></span>
                            </a>
                        ))}
                    </>
                )}

                {query.trim() && (
                    <a
                        className="rc-suggest-item rc-suggest-all"
                        href={`search.html?q=${encodeURIComponent(query.trim())}`}
                        role="option"
                        onClick={(e) => {
                            e.preventDefault();
                            setOpen(false);
                            navigate(`/search.html?q=${encodeURIComponent(query.trim())}`);
                        }}
                    >
                        <span className="rc-suggest-search-icon">🔍</span>
                        <span>Search for “{query.trim()}”</span>
                    </a>
                )}
            </div>
        </div>
    );
}
