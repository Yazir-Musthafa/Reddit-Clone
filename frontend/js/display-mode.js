/**
 * Light/dark display mode. The choice is a per-browser preference kept in localStorage;
 * each page's <head> applies it before first paint to avoid a flash.
 */
const KEY = 'rc_display';

export function isDarkMode() {
    return document.documentElement.classList.contains('dark-mode');
}

export function toggleDisplayMode() {
    const dark = !isDarkMode();
    document.documentElement.classList.toggle('dark-mode', dark);
    try {
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
    } catch {
        /* storage unavailable; the mode still applies for this page view */
    }
    return dark;
}
