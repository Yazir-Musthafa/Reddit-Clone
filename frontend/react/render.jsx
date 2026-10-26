import React, { Fragment, cloneElement, isValidElement, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import parse, { attributesToProps, domToReact } from 'html-react-parser';

/**
 * Template-backed React views retain the exact existing HTML (including inline
 * whitespace and SVGs). API strings must still be escaped by the caller; rich
 * post bodies are sanitized by the server. This is not an HTML sanitizer.
 */
const options = {
    replace(node) {
        if (node.type === 'script') return <></>;
        if (node.name === 'select') {
            const props = attributesToProps(node.attribs, 'select');
            const selected = node.children.filter(n => n.name === 'option' && 'selected' in n.attribs);
            if (selected.length) {
                const values = selected.map(n => n.attribs.value ?? n.children.map(c => c.data || '').join(''));
                props.defaultValue = props.multiple ? values : values[0];
            }
            return <select {...props}>{domToReact(node.children, options)}</select>;
        }
        if (node.name === 'option' && 'selected' in node.attribs) {
            const { selected, ...props } = attributesToProps(node.attribs, 'option');
            return <option {...props}>{domToReact(node.children, options)}</option>;
        }
    },
    transform(element) {
        if (isValidElement(element) && element.props.contentEditable) {
            return cloneElement(element, { suppressContentEditableWarning: true });
        }
        return element;
    }
};

export function Markup({ html }) {
    return useMemo(() => parse(String(html || ''), options), [html]);
}

// A view boundary owns its children. Controllers may use refs/native browser
// APIs inside that boundary, but replace markup only through this React renderer.
// Unmount nested boundaries before replacing their parent to release effects.
const roots = new Map();
let revision = 0;

export function disposeViews(container, includeSelf = true) {
    const targets = [...roots.keys()].filter(el => (includeSelf && el === container) || (el !== container && container.contains(el)));
    // Children must be unmounted before the ancestor which contains their root.
    targets.sort((a, b) => a.contains(b) ? 1 : b.contains(a) ? -1 : 0);
    for (const el of targets) {
        const record = roots.get(el);
        roots.delete(el);
        record.root.unmount();
    }
}

export function renderView(container, children) {
    if (!container) return;
    disposeViews(container, false);
    let record = roots.get(container);
    if (!record) {
        record = { root: createRoot(container), children: [] };
        roots.set(container, record);
    }
    // These existing forms deliberately reset on replacement (e.g. dialog step).
    // A fresh key preserves that behavior and avoids accumulating native handlers.
    record.children = [<Fragment key={++revision}>{children}</Fragment>];
    flushSync(() => record.root.render(record.children));
}

export function renderMarkup(container, html) {
    renderView(container, <Markup html={html} />);
}

export function appendMarkup(container, html) {
    if (!container) return;
    if (!roots.has(container)) renderMarkup(container, container.innerHTML);
    const record = roots.get(container);
    record.children = [...record.children, <Markup key={++revision} html={html} />];
    flushSync(() => record.root.render(record.children));
}

export function removeView(node) {
    if (!node) return;
    const parent = node.parentElement;
    disposeViews(node);
    if (roots.has(parent)) {
        const html = [...parent.childNodes].filter(n => n !== node).map(n => n.outerHTML ?? n.textContent).join('');
        renderMarkup(parent, html);
    } else {
        node.remove();
    }
}
