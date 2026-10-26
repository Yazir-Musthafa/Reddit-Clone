/**
 * Utility to asynchronously load component HTML files into target containers.
 * @param {string} selector - CSS selector of the target container
 * @param {string} path - Relative path to component .html file
 * @returns {Promise<boolean>}
 */
export async function loadComponent(selector, path) {
    const container = document.querySelector(selector);
    if (!container) {
        console.warn(`Container element "${selector}" not found.`);
        return false;
    }

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load component from ${path} (${response.status})`);
        }
        const html = await response.text();
        container.innerHTML = html;
        return true;
    } catch (err) {
        console.error(`Component loader error:`, err);
        return false;
    }
}
