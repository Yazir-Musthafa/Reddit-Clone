import { useRef, useState } from 'react';

/** Shared controlled values, client/server errors and duplicate-submit guard. */
export function useForm({ initialValues, validate, onSubmit, resetOnSuccess = false }) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [pending, setPending] = useState(false);
    const inFlight = useRef(false);
    function change(name, value) {
        setValues(current => ({ ...current, [name]: value }));
        setErrors(current => ({ ...current, [name]: undefined, form: undefined }));
    }
    async function submit(event) {
        event.preventDefault();
        if (inFlight.current) return;
        const nextErrors = validate(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
            return;
        }
        inFlight.current = true;
        setPending(true);
        try {
            const result = await onSubmit(values);
            if (resetOnSuccess && result !== false) setValues(initialValues);
        } catch (error) {
            setErrors({ form: error.message });
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    }
    return { values, errors, pending, change, submit };
}
