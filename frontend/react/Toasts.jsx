import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

let messages = [];
let nextId = 0;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => messages;
const notify = () => listeners.forEach(listener => listener());
export function showToast(message) {
    messages = [...messages, { id: ++nextId, message }];
    notify();
}
const containerStyle = { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' };
function Toast({ item }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        const hide = setTimeout(() => setVisible(false), 2800);
        const remove = setTimeout(() => { messages = messages.filter(m => m.id !== item.id); notify(); }, 3100);
        return () => { cancelAnimationFrame(frame); clearTimeout(hide); clearTimeout(remove); };
    }, [item.id]);
    return <div className="toast-msg" role="status" style={{ backgroundColor: '#1A1A1B', color: '#FFFFFF', padding: '12px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.25s ease', pointerEvents: 'auto' }}>{item.message}</div>;
}
export default function Toasts() {
    const items = useSyncExternalStore(subscribe, snapshot);
    if (!items.length) return null;
    return createPortal(<div id="toastContainer" style={containerStyle}>{items.map(item => <Toast key={item.id} item={item} />)}</div>, document.body);
}
