export function validateAccount(kind, values) {
    const errors = {};
    if (kind === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address';
        if (!values.password) errors.password = 'Enter your current password';
    } else if (kind === 'password') {
        if (!values.currentPassword) errors.currentPassword = 'Enter your current password';
        if (values.newPassword.length < 8) errors.newPassword = 'Use at least 8 characters for the new password';
        if (values.newPassword !== values.confirmPassword) errors.confirmPassword = "New passwords don't match";
    } else if (!values.password) errors.password = 'Enter your password to confirm';
    return errors;
}

export function validateProfile(values) {
    const errors = {};
    if (values.displayName.length > 30) errors.displayName = 'Display name must be at most 30 characters';
    if (values.bio.length > 200) errors.bio = 'Bio must be at most 200 characters';
    return errors;
}
