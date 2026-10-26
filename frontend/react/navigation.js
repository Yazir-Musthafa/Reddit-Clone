let navigate;

export function registerNavigation(handler) {
    navigate = handler;
    return () => { if (navigate === handler) navigate = undefined; };
}

// Existing controllers keep their query URLs and rendering lifecycle while
// React Router owns push/replace operations. Cross-page anchors still load a
// document, releasing the legacy page listeners and polling timers.
export function navigateQuery(target, { replace = false } = {}) {
    const url = new URL(target, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
        window.location[replace ? 'replace' : 'assign'](url.href);
        return;
    }
    if (!navigate) throw new Error('React Router navigation is not ready');
    navigate({ pathname: url.pathname, search: url.search, hash: url.hash }, { replace });
}
