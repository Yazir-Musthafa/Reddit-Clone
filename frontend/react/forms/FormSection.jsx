import React from 'react';
import { useForm } from './useForm.js';

export function FormField({ form, id, name, label, multiline = false, ...props }) {
    const Input = multiline ? 'textarea' : 'input';
    return <>
        <label className="ui-field-label" htmlFor={id}>{label}</label>
        <Input {...props} id={id} name={name} className={`ui-input${multiline ? ' ui-textarea' : ''}`}
            value={form.values[name]} aria-invalid={!!form.errors[name]}
            onChange={event => form.change(name, event.target.value)} />
    </>;
}

export default function FormSection({ id, title, description, submitLabel, danger = false, children, ...options }) {
    const form = useForm(options);
    const error = Object.values(form.errors).filter(Boolean).join('. ');
    return <form className="rc-settings-section" id={id} noValidate onSubmit={form.submit} aria-busy={form.pending}>
        <h2>{title}</h2>
        {description && <p className="rc-muted-text">{description}</p>}
        {children(form)}
        <p className={`ui-error${error ? '' : ' hidden'}`} data-error="" role="alert">{error}</p>
        <div className="ui-dialog-actions"><button type="submit" className={`ui-btn ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}`} disabled={form.pending}>{submitLabel}</button></div>
    </form>;
}
