import { useEffect } from 'react';
import { renderMarkup, disposeViews } from './render.jsx';
import { escapeHtml } from '../js/utils.js';

/** A document navigation mounts one page; query-only feed navigation stays local. */
export function usePage(initialize) {
    useEffect(() => {
        let cancelled = false;
        // Let React finish its commit before the view controllers render regions.
        queueMicrotask(() => {
            if (cancelled) return;
            Promise.resolve(initialize()).catch(error => {
                console.error(error);
                renderMarkup(document.getElementById('feed-container'), `<div class="rc-empty-state"><h3>Unable to load this page</h3><p>${escapeHtml(error.message)}</p><button class="ui-btn ui-btn-primary">Try again</button></div>`);
                document.querySelector('#feed-container button').onclick = () => window.location.reload();
            });
        });
        return () => {
            cancelled = true;
            queueMicrotask(() => {
                for (const id of ['header-container', 'sidebar-container', 'feed-container', 'chats-slot', 'community-modal-slot']) {
                    const node = document.getElementById(id);
                    if (node) disposeViews(node);
                }
            });
        };
    }, [initialize]);
}
