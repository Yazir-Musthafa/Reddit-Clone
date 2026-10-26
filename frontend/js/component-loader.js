import { renderMarkup } from '../react/render.jsx';

// Component templates are bundled with React; no runtime HTML fetches are needed.
const templates = import.meta.glob('../components/**/*.html', { query: '?raw', import: 'default', eager: true });

export async function loadComponent(selector, path) {
    const container = document.querySelector(selector);
    if (!container) return false;
    const key = path.replace(/^\.\//, '../');
    if (!(key in templates)) throw new Error(`Unknown component template: ${path}`);
    renderMarkup(container, templates[key]);
    return true;
}
