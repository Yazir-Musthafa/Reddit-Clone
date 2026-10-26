import React, { cloneElement, isValidElement, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import parse from 'html-react-parser';
import { postCardHtml, compactPostHtml, postUrl } from '../components/post/post.js';
import { api } from '../js/api.js';
import { authState } from '../js/auth-state.js';
import { showToast } from '../js/interactions.js';
import { requireLogin, toggleJoin, reportDialog, confirmDialog } from '../js/ui.js';
import { copyToClipboard, absoluteUrl } from '../js/utils.js';

/** Keyed cards keep vote, menu, carousel and hide/undo state across feed updates. */
export default function PostCard({ post, ...options }) {
    const element = useRef(null);
    const [, refresh] = useReducer(n => n + 1, 0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [removed, setRemoved] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [index, setIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [voting, setVoting] = useState(false);
    const view = expanded ? 'card' : options.view;
    useEffect(() => authState.subscribe(refresh), []);
    useEffect(() => {
        const close = e => { if (!element.current?.querySelector('.post-options-wrapper')?.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);
    useLayoutEffect(() => {
        const el = element.current;
        if (!el) return;
        el.querySelector('.post-options-menu')?.classList.toggle('hidden', !menuOpen);
        const media = el.querySelector('.rc-media');
        if (media) {
            media.dataset.index = String(index);
            media.querySelectorAll('.rc-media-item').forEach((item, i) => {
                item.classList.toggle('hidden', i !== index);
                if (i !== index && item.tagName === 'VIDEO') item.pause();
            });
            media.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
            if (revealed) {
                media.classList.remove('rc-blurred');
                media.querySelector('.rc-reveal-btn')?.classList.add('hidden');
            }
        }
    });
    async function vote(dir) {
        if (!requireLogin() || voting) return;
        const next = post.userVote === dir ? 0 : dir;
        const previous = { score: post.score, userVote: post.userVote };
        post.score += next - post.userVote;
        post.userVote = next;
        setVoting(true);
        refresh();
        try { Object.assign(post, await api.post(`/posts/${post.id}/vote`, { dir: next })); }
        catch (err) { Object.assign(post, previous); showToast(err.message); }
        finally { setVoting(false); refresh(); }
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
                case 'join': await toggleJoin(post.community); refresh(); break;
                case 'share':
                case 'copy': showToast(await copyToClipboard(absoluteUrl(postUrl(post))) ? 'Link copied to clipboard!' : "Couldn't copy the link"); break;
                case 'save': {
                    if (!requireLogin()) return;
                    const { saved } = await api.post(`/posts/${post.id}/save`);
                    post.saved = saved;
                    refresh();
                    showToast(saved ? 'Post saved' : 'Post unsaved');
                    break;
                }
                case 'hide': {
                    if (!requireLogin()) return;
                    const result = await api.post(`/posts/${post.id}/hide`);
                    post.hidden = result.hidden;
                    if (result.hidden && !options.detail) setHidden(true);
                    else showToast(result.hidden ? 'Post hidden' : 'Post unhidden');
                    refresh();
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
        try { await api.post(`/posts/${post.id}/hide`); post.hidden = false; setHidden(false); }
        catch (err) { showToast(err.message); }
    }}>Undo</button></div>;
    const html = view === 'compact' ? compactPostHtml(post, options) : postCardHtml(post, options);
    return parse(html, { transform(node) {
        return isValidElement(node) && node.type === 'article' ? cloneElement(node, { ref: element, onClick: action }) : node;
    } });
}
