import React, { createContext, useContext, useState, useRef } from 'react';

const DialogContext = createContext(null);

let globalShowDialog = null;

export function DialogProvider({ children }) {
    const [dialog, setDialog] = useState(null);
    const resolverRef = useRef(null);

    const showDialog = (config) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog(config);
        });
    };

    globalShowDialog = showDialog;

    const closeDialog = (value = null) => {
        if (resolverRef.current) {
            resolverRef.current(value);
            resolverRef.current = null;
        }
        setDialog(null);
    };

    return (
        <DialogContext.Provider value={{ showDialog, closeDialog }}>
            {children}
            {dialog && <DialogHost dialog={dialog} onClose={closeDialog} />}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    return useContext(DialogContext);
}

export function showDialogGlobal(config) {
    if (globalShowDialog) {
        return globalShowDialog(config);
    }
    return Promise.resolve(null);
}

function DialogHost({ dialog, onClose }) {
    const {
        type,
        title,
        subtitle,
        message,
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel',
        danger = false,
        fields = [],
        submitLabel = 'Save',
        onSubmit,
        wide = false,
        render,
        bodyHtml
    } = dialog;

    const [formValues, setFormValues] = useState(() => {
        const initial = {};
        if (fields) {
            fields.forEach(f => {
                if (f.type === 'checkboxes') {
                    initial[f.name] = (f.options || []).filter(o => o.checked).map(o => o.value);
                } else {
                    initial[f.name] = f.value ?? '';
                }
            });
        }
        return initial;
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (onSubmit) {
                const res = await onSubmit(formValues);
                onClose(res !== undefined ? res : true);
            } else {
                onClose(formValues);
            }
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="reddit-modal-backdrop ui-dialog active"
            onClick={(e) => {
                if (e.target.classList.contains('reddit-modal-backdrop') || e.target.closest('[data-close]')) {
                    onClose(null);
                }
            }}
        >
            <div className={`reddit-modal-card ${wide ? 'ui-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <button
                    type="button"
                    className="reddit-modal-close"
                    data-close
                    aria-label="Close"
                    onClick={() => onClose(null)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <h2 className="reddit-modal-title">{title}</h2>
                {subtitle && <p className="reddit-modal-subtitle">{subtitle}</p>}

                {type === 'confirm' ? (
                    <div className="ui-dialog-body">
                        <p className="ui-dialog-text">{message}</p>
                        <div className="ui-dialog-actions">
                            <button type="button" className="ui-btn ui-btn-secondary" data-close onClick={() => onClose(false)}>{cancelLabel}</button>
                            <button type="button" className={`ui-btn ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}`} data-confirm onClick={() => onClose(true)}>{confirmLabel}</button>
                        </div>
                    </div>
                ) : type === 'form' ? (
                    <div className="ui-dialog-body">
                        <form className="ui-form" onSubmit={handleFormSubmit}>
                            {fields.map(f => {
                                const id = `ui-field-${f.name}`;
                                return (
                                    <div key={f.name} style={{ marginBottom: '12px' }}>
                                        <label className="ui-field-label" htmlFor={id}>{f.label}</label>
                                        {f.type === 'textarea' ? (
                                            <textarea
                                                className="ui-input ui-textarea"
                                                id={id}
                                                name={f.name}
                                                rows={f.rows || 4}
                                                maxLength={f.maxlength}
                                                placeholder={f.placeholder || ''}
                                                value={formValues[f.name] || ''}
                                                onChange={e => setFormValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                                            />
                                        ) : f.type === 'select' ? (
                                            <select
                                                className="ui-input"
                                                id={id}
                                                name={f.name}
                                                value={formValues[f.name] || ''}
                                                onChange={e => setFormValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                                            >
                                                {(f.options || []).map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        ) : f.type === 'checkboxes' ? (
                                            <div className="ui-checkbox-list" id={id}>
                                                {(f.options || []).map(o => {
                                                    const checked = (formValues[f.name] || []).includes(o.value);
                                                    return (
                                                        <label key={o.value} className="ui-checkbox-row">
                                                            <input
                                                                type="checkbox"
                                                                name={f.name}
                                                                value={o.value}
                                                                checked={checked}
                                                                onChange={e => {
                                                                    const current = formValues[f.name] || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current, o.value]
                                                                        : current.filter(v => v !== o.value);
                                                                    setFormValues(prev => ({ ...prev, [f.name]: updated }));
                                                                }}
                                                            />
                                                            {' '}{o.label}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <input
                                                type={f.type || 'text'}
                                                className="ui-input"
                                                id={id}
                                                name={f.name}
                                                maxLength={f.maxlength}
                                                placeholder={f.placeholder || ''}
                                                value={formValues[f.name] || ''}
                                                onChange={e => setFormValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                                                autoComplete="off"
                                            />
                                        )}
                                        {f.hint && <p className="ui-muted">{f.hint}</p>}
                                    </div>
                                );
                            })}
                            {error && <p className="ui-error">{error}</p>}
                            <div className="ui-dialog-actions">
                                <button type="button" className="ui-btn ui-btn-secondary" data-close onClick={() => onClose(null)}>{cancelLabel}</button>
                                <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting}>{submitLabel}</button>
                            </div>
                        </form>
                    </div>
                ) : typeof render === 'function' ? (
                    <div className="ui-dialog-body">
                        {render(onClose)}
                    </div>
                ) : bodyHtml ? (
                    <div className="ui-dialog-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                ) : null}
            </div>
        </div>
    );
}
