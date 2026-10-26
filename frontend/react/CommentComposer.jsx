import React, { useEffect, useRef, useState } from 'react';
import { showToast } from './Toasts.jsx';

/** Shared controlled form for new comments, replies and edits. */
export default function CommentComposer({ placeholder = 'Join the conversation', submitLabel = 'Comment',
    initialValue = '', onSubmit, onCancel, autoFocus = false, resetOnSuccess = false }) {
    const [value, setValue] = useState(initialValue);
    const [submitting, setSubmitting] = useState(false);
    const textarea = useRef(null);
    const pending = useRef(false);
    useEffect(() => {
        if (autoFocus) {
            textarea.current.focus();
            textarea.current.setSelectionRange(initialValue.length, initialValue.length);
        }
    }, [autoFocus, initialValue]);
    async function submit(event) {
        event.preventDefault();
        const body = value.trim();
        if (!body || pending.current) return;
        pending.current = true;
        setSubmitting(true);
        try {
            await onSubmit(body);
            if (resetOnSuccess) setValue('');
        } catch (error) {
            showToast(error.message);
        } finally {
            pending.current = false;
            setSubmitting(false);
        }
    }
    return <form className="rc-comment-composer" onSubmit={submit}>
        <textarea ref={textarea} className="rc-comment-textarea" placeholder={placeholder} maxLength={10000} rows={3}
            value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    event.currentTarget.form.requestSubmit();
                }
            }} />
        <div className="rc-composer-actions">
            <span className="rc-muted-text rc-composer-hint">Ctrl + Enter to submit</span>
            {onCancel && <button type="button" className="ui-btn ui-btn-secondary" data-cancel="" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting || !value.trim()}>{submitLabel}</button>
        </div>
    </form>;
}
