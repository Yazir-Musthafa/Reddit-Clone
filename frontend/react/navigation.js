let navigate;

export function registerNavigation(handler) {
    navigate = handler;
    return () => { if (navigate === handler) navigate = undefined; };
}

export function navigateQuery(target, { replace = false } = {}) {
    const url = new URL(target, window.location.href);
    if (url.origin !== window.location.origin) {
        window.location[replace ? 'replace' : 'assign'](url.href);
        return;
    }
    if (!navigate) {
        window.location[replace ? 'replace' : 'assign'](url.href);
        return;
    }
    navigate({ pathname: url.pathname, search: url.search, hash: url.hash }, { replace });
}
