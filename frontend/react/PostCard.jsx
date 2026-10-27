import React, { useEffect, useReducer, useRef, useState } from 'react';
import { postUrl } from '../components/post/post.js';
import { CardContent, CompactContent } from './PostContent.jsx';
import { postReducer } from './postState.mjs';
import { api } from '../js/api.js';
import { useAuth } from './AuthContext.jsx';
import { showToast } from '../js/interactions.js';
import { requireLogin, toggleJoin, reportDialog, confirmDialog } from '../js/ui.js';
import { copyToClipboard, absoluteUrl } from '../js/utils.js';

/** Keyed cards keep vote, menu, carousel and hide/undo state across feed updates. */
export default function PostCard({ post: initialPost, ...options }) {
    const { isLoggedIn } = useAuth();
    const element = useRef(null);
    const [post, dispatch] = useReducer(postReducer, initialPost);
    const votePending = useRef(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [removed, setRemoved] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [index, setIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [voting, setVoting] = useState(false);
    const view = expanded ? 'card' : options.view;
    useEffect(() => {
        const close = e => { if (!element.current?.querySelector('.post-options-wrapper')?.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);
    function update(changes) {
        dispatch({ type: 'patch', changes });
        options.onChange?.(changes);
    }
    async function vote(dir) {
        if (!isLoggedIn) { requireLogin(); return; }
        if (votePending.current) return;
        votePending.current = true;
        const next = post.userVote === dir ? 0 : dir;
        const previous = { score: post.score, userVote: post.userVote };
        dispatch({ type: 'vote', direction: next });
        options.onChange?.({ score: post.score + next - post.userVote, userVote: next });
        setVoting(true);
        try { update(await api.post(`/posts/${post.id}/vote`, { dir: next })); }
        catch (err) { update(previous); showToast(err.message); }
        finally { votePending.current = false; setVoting(false); }
    }
    async function action(e) {
        const target = e.target.closest('[data-action], [data-dot]');
        if (!target) {
            if (!options.detail && !e.target.closest('a, button, video, input, textarea, .post-options-menu, .rc-edit-box')) window.location.href = postUrl(post);
            return;
        }
        if (target.dataset.dot !== undefined) { setIndex(Number(target.dataset.dot)); return; }
        e.preventDefault();
        // Let other cards' document listeners close their menus.
        const name = target.dataset.action;
        if (name !== 'menu') setMenuOpen(false);
        try {
            switch (name) {
                case 'menu': setMenuOpen(open => !open); break;
                case 'upvote': await vote(1); break;
                case 'downvote': await vote(-1); break;
                case 'prev': setIndex(i => (i - 1 + post.media.length) % post.media.length); break;
                case 'next': setIndex(i => (i + 1) % post.media.length); break;
                case 'reveal': setRevealed(true); break;
                case 'join': await toggleJoin(post.community); break;
                case 'share':
                case 'copy': showToast(await copyToClipboard(absoluteUrl(postUrl(post))) ? 'Link copied to clipboard!' : "Couldn't copy the link"); break;
                case 'save': {
                    if (!requireLogin()) return;
                    const { saved } = await api.post(`/posts/${post.id}/save`);
                    update({ saved });
                    showToast(saved ? 'Post saved' : 'Post unsaved');
                    break;
                }
                case 'hide': {
                    if (!requireLogin()) return;
                    const result = await api.post(`/posts/${post.id}/hide`);
                    update({ hidden: result.hidden });
                    if (result.hidden && !options.detail) setHidden(true);
                    else showToast(result.hidden ? 'Post hidden' : 'Post unhidden');
                    break;
                }
                case 'report': if (requireLogin()) reportDialog('Post', post.id); break;
                case 'edit': options.onEdit?.(post); break;
                case 'expand': setExpanded(true); break;
                case 'delete': {
                    const asMod = !post.isAuthor;
                    if (!await confirmDialog(asMod ? 'Remove this post from the community?' : 'Once you delete this post, it can’t be restored.', {
                        title: asMod ? 'Remove post?' : 'Delete post?', confirmLabel: asMod ? 'Remove' : 'Delete', danger: true
                    })) return;
                    await api.del(`/posts/${post.id}`);
                    showToast(asMod ? 'Post removed' : 'Post deleted');
                    if (options.onDeleted) options.onDeleted(post); else setRemoved(true);
                    break;
                }
            }
        } catch (err) { showToast(err.message); }
    }
    if (removed) return null;
    if (hidden) return <div className="rc-hidden-placeholder"><span>Post hidden</span><button className="ui-btn ui-btn-secondary" onClick={async () => {
        try { await api.post(`/posts/${post.id}/hide`); update({ hidden: false }); setHidden(false); }
        catch (err) { showToast(err.message); }
    }}>Undo</button></div>;
    const compact = view === 'compact';
    const props = { post, showCommunity: options.showCommunity !== false, detail: !!options.detail, menuOpen, index, revealed };
    return <article ref={element} onClick={action} data-post-id={post.id} aria-busy={voting}
        className={compact ? 'compact-post-card feed-post rc-clickable' : `post-card feed-post ${options.detail ? 'rc-post-detail' : 'rc-clickable'}`}>
        {compact ? <CompactContent {...props} /> : <CardContent {...props} />}
    </article>;
}
