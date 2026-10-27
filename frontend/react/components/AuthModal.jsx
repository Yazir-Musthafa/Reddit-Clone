import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { debounce } from '../../js/utils.js';
import { showToast } from '../Toasts.jsx';

const ICONS = {
    close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    eye: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
    google: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>,
    apple: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.18-.56 2.84-1.36z" /></svg>,
    link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
};

const PROVIDER_NOTICES = {
    phone: "Phone number sign-in needs an SMS provider, which this server doesn't have. Continue with email instead.",
    google: "Google sign-in needs OAuth credentials, which this server doesn't have. Continue with email instead.",
    apple: "Apple sign-in needs OAuth credentials, which this server doesn't have. Continue with email instead."
};

const INTERESTS_LIST = [
    { name: 'Art', icon: '🎨' }, { name: 'Beauty', icon: '💄' }, { name: 'Career', icon: '💼' },
    { name: 'Entertainment', icon: '🎬' }, { name: 'Finance', icon: '📈' }, { name: 'Food', icon: '🍴' },
    { name: 'Gaming', icon: '🎮' }, { name: 'News', icon: '📰' }, { name: 'Sports', icon: '⚾' },
    { name: 'Technology', icon: '💻' }, { name: 'Travel', icon: '📍' }, { name: 'Wellness', icon: '🌱' }
];

const BASE_TOPICS = [
    'Skincare', 'Mollywood', 'Painting', 'Digital Art', 'Beard Grooming', 'Kochi-Muziris Biennale',
    'Personal Finance', 'Sculpture', 'Software Development', 'Ayurvedic Skincare', 'Photography', 'Stock Market',
    'Indian IT Industry', 'Data Science', 'Bollywood', 'Fragrance', 'Gulf Jobs', "Men's Hairstyles", 'Hollywood', 'Investing'
];

const MORE_TOPICS = [
    'Cricket', 'Football', 'Anime', 'Cooking', 'Travel Photography', 'Gaming PCs', 'Startups', 'Books',
    'Fitness', 'Music Production', 'Space', 'History', 'Cars', 'Gardening', 'Movies', 'Web Development'
];

export default function AuthModal() {
    const { authModal, closeAuthModal, setUser } = useAuth();
    const { isOpen, mode: initialMode, notice: initialNotice } = authModal;

    // View state: 'login' | 'code-request' | 'code-verify' | 'signup'
    const [view, setView] = useState('login');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    // Login state
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [showLoginPass, setShowLoginPass] = useState(false);

    // Code state (login or reset)
    const [codePurpose, setCodePurpose] = useState('login'); // 'login' | 'reset'
    const [codeEmail, setCodeEmail] = useState('');
    const [codeValue, setCodeValue] = useState('');
    const [codeNewPass, setCodeNewPass] = useState('');
    const [showCodeNewPass, setShowCodeNewPass] = useState(false);
    const [codeDevCode, setCodeDevCode] = useState('');

    // Signup state (Steps 1 to 6)
    const [signUpStep, setSignUpStep] = useState(1);
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpCode, setSignUpCode] = useState('');
    const [signUpDevCode, setSignUpDevCode] = useState('');
    const [signUpUsername, setSignUpUsername] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [showSignUpPass, setShowSignUpPass] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState('');
    const [signUpGender, setSignUpGender] = useState('');
    const [signUpInterests, setSignUpInterests] = useState([]);
    const [signUpTopics, setSignUpTopics] = useState([]);
    const [topicSearch, setTopicSearch] = useState('');
    const [showMoreTopics, setShowMoreTopics] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);

    // Sync mode with props
    useEffect(() => {
        if (isOpen) {
            setError('');
            setNotice(initialNotice || '');
            if (initialMode === 'signup') {
                setView('signup');
                setSignUpStep(1);
            } else if (initialMode === 'reset') {
                setView('code-request');
                setCodePurpose('reset');
            } else {
                setView('login');
            }
        }
    }, [isOpen, initialMode, initialNotice]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) closeAuthModal();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeAuthModal]);

    // Resend countdown timer for step 2
    useEffect(() => {
        if (view === 'signup' && signUpStep === 2) {
            setResendTimer(30);
            const interval = setInterval(() => {
                setResendTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [view, signUpStep]);

    // Debounced username check
    const checkUsernameAvail = useRef(
        debounce(async (val) => {
            if (!val.trim()) {
                setUsernameAvailable(false);
                setUsernameStatus('');
                return;
            }
            try {
                const res = await api.get(`/auth/check-username?username=${encodeURIComponent(val.trim())}`);
                setUsernameAvailable(res.available);
                setUsernameStatus(res.message);
            } catch {
                setUsernameAvailable(false);
            }
        }, 300)
    ).current;

    const handleSuggestUsername = async () => {
        try {
            const { username } = await api.get('/auth/suggest-username');
            setSignUpUsername(username);
            checkUsernameAvail(username);
        } catch {}
    };

    if (!isOpen) return null;

    // Handlers
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { user } = await api.post('/auth/login', { identifier: loginUser.trim(), password: loginPass });
            setUser(user);
            closeAuthModal();
            showToast('Logged in');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSendCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { devCode } = await api.post('/auth/request-code', { email: codeEmail.trim(), purpose: codePurpose });
            setCodeDevCode(devCode || '');
            setView('code-verify');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVerifyCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (codePurpose === 'reset') {
                const { user } = await api.post('/auth/reset-password', { email: codeEmail.trim(), code: codeValue.trim(), password: codeNewPass });
                setUser(user);
                closeAuthModal();
                showToast('Password reset successfully');
            } else {
                const { user } = await api.post('/auth/login-code', { email: codeEmail.trim(), code: codeValue.trim() });
                setUser(user);
                closeAuthModal();
                showToast('Logged in');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignUpStep1 = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { devCode } = await api.post('/auth/request-code', { email: signUpEmail.trim(), purpose: 'signup' });
            setSignUpDevCode(devCode || '');
            setSignUpStep(2);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleResendSignUpCode = async () => {
        try {
            const { devCode } = await api.post('/auth/request-code', { email: signUpEmail.trim(), purpose: 'signup' });
            setSignUpDevCode(devCode || '');
            setResendTimer(30);
            showToast('A new code is on its way');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignUpStep2 = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/auth/verify-code', { email: signUpEmail.trim(), code: signUpCode.trim() });
            setSignUpStep(3);
            if (!signUpUsername) handleSuggestUsername();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignUpStep3 = (e) => {
        e.preventDefault();
        setSignUpStep(4);
    };

    const handleSignUpStep4 = (gender) => {
        setSignUpGender(gender || '');
        setSignUpStep(5);
    };

    const handleSignUpStep5 = () => {
        setSignUpStep(6);
    };

    const handleSignUpFinish = async () => {
        setError('');
        try {
            const { user } = await api.post('/auth/signup', {
                email: signUpEmail.trim(),
                code: signUpCode.trim(),
                username: signUpUsername.trim(),
                password: signUpPassword,
                gender: signUpGender,
                interests: signUpInterests,
                topics: signUpTopics
            });
            setUser(user);
            closeAuthModal();
            showToast('Account created!');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="reddit-modal-backdrop active" id="authModal" onClick={(e) => {
            if (e.target.id === 'authModal') closeAuthModal();
        }}>
            {/* 1. LOG IN VIEW */}
            {view === 'login' && (
                <div className="reddit-modal-card">
                    <button type="button" className="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal" onClick={closeAuthModal}>
                        {ICONS.close}
                    </button>
                    <h2 className="reddit-modal-title">Log In</h2>
                    <p className="reddit-modal-legal">
                        By continuing, you agree to our{' '}
                        <a href="page.html?p=user-agreement" className="legal-link">User Agreement</a>{' '}
                        and acknowledge that you understand the{' '}
                        <a href="page.html?p=privacy" className="legal-link">Privacy Policy</a>.
                    </p>

                    <div className="reddit-auth-pill-list">
                        <button type="button" className="reddit-auth-pill-btn" data-provider="phone" onClick={() => setNotice(PROVIDER_NOTICES.phone)}>
                            <span className="pill-icon">{ICONS.phone}</span><span>Continue with Phone Number</span>
                        </button>
                        <button type="button" className="reddit-auth-pill-btn" data-provider="google" onClick={() => setNotice(PROVIDER_NOTICES.google)}>
                            <span className="pill-icon">{ICONS.google}</span><span>Continue With Google</span>
                        </button>
                        <button type="button" className="reddit-auth-pill-btn" data-provider="apple" onClick={() => setNotice(PROVIDER_NOTICES.apple)}>
                            <span className="pill-icon">{ICONS.apple}</span><span>Continue with Apple</span>
                        </button>
                    </div>

                    <div className="reddit-auth-pill-list" style={{ marginTop: '10px' }}>
                        <button type="button" className="reddit-auth-pill-btn" id="modalBtnLink" onClick={() => { setCodePurpose('login'); setView('code-request'); }}>
                            <span className="pill-icon">{ICONS.link}</span><span>Email me a one-time code</span>
                        </button>
                    </div>

                    <p className={`auth-notice${notice ? '' : ' hidden'}`}>{notice}</p>
                    <div className="reddit-modal-divider"><span>OR</span></div>

                    <form onSubmit={handleLoginSubmit}>
                        <div className="reddit-input-group">
                            <input
                                type="text"
                                id="modalInputUser"
                                className="reddit-input-field"
                                placeholder=" "
                                autoComplete="username"
                                value={loginUser}
                                onChange={e => setLoginUser(e.target.value)}
                            />
                            <label htmlFor="modalInputUser" className="reddit-input-label">Email or username <span className="required-asterisk">*</span></label>
                        </div>

                        <div className="reddit-input-group">
                            <input
                                type={showLoginPass ? 'text' : 'password'}
                                id="modalInputPass"
                                className="reddit-input-field"
                                placeholder=" "
                                autoComplete="current-password"
                                value={loginPass}
                                onChange={e => setLoginPass(e.target.value)}
                            />
                            <label htmlFor="modalInputPass" className="reddit-input-label">Password <span className="required-asterisk">*</span></label>
                            <button
                                type="button"
                                className="password-toggle-btn"
                                id="togglePasswordBtn"
                                aria-label="Toggle password visibility"
                                onClick={() => setShowLoginPass(prev => !prev)}
                            >
                                {ICONS.eye}
                            </button>
                        </div>

                        <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                        <div className="reddit-modal-links">
                            <a
                                href="#"
                                className="forgot-link"
                                id="forgotPasswordLink"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCodePurpose('reset');
                                    setView('code-request');
                                }}
                            >
                                Forgot password?
                            </a>
                            <p className="signup-prompt">
                                New to Reddit?{' '}
                                <a
                                    href="#"
                                    className="signup-link"
                                    id="modalSignUpLink"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setView('signup');
                                        setSignUpStep(1);
                                    }}
                                >
                                    Sign Up
                                </a>
                            </p>
                        </div>

                        <button
                            type="submit"
                            className={`reddit-login-submit-btn${loginUser.trim() && loginPass ? ' enabled' : ''}`}
                            id="modalSubmitBtn"
                        >
                            Log In
                        </button>
                    </form>
                </div>
            )}

            {/* 2. ONE-TIME CODE / RESET PASSWORD REQUEST VIEW */}
            {view === 'code-request' && (
                <div className="reddit-modal-card">
                    <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setView('login')}>
                        {ICONS.back}
                    </button>
                    <button type="button" className="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal" onClick={closeAuthModal}>
                        {ICONS.close}
                    </button>
                    <h2 className="reddit-modal-title">{codePurpose === 'reset' ? 'Reset your password' : 'Log in with a code'}</h2>
                    <p className="reddit-modal-subtitle">
                        {codePurpose === 'reset'
                            ? "Enter your email address and we'll send you a code to reset your password."
                            : "Enter your email address and we'll send you a one-time code to log in."}
                    </p>

                    <form onSubmit={handleSendCodeSubmit}>
                        <div className="reddit-input-group" style={{ marginTop: '16px' }}>
                            <input
                                type="email"
                                id="codeEmailInput"
                                className="reddit-input-field"
                                placeholder=" "
                                autoComplete="email"
                                value={codeEmail}
                                onChange={e => setCodeEmail(e.target.value)}
                            />
                            <label htmlFor="codeEmailInput" className="reddit-input-label">Email <span className="required-asterisk">*</span></label>
                        </div>

                        <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                        <button
                            type="submit"
                            className={`reddit-login-submit-btn${codeEmail.includes('@') ? ' enabled' : ''}`}
                            id="codeSendBtn"
                            style={{ marginTop: '16px' }}
                        >
                            {codePurpose === 'reset' ? 'Reset Password' : 'Send Code'}
                        </button>
                    </form>
                </div>
            )}

            {/* 3. CODE VERIFY VIEW */}
            {view === 'code-verify' && (
                <div className="reddit-modal-card">
                    <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setView('code-request')}>
                        {ICONS.back}
                    </button>
                    <h2 className="reddit-modal-title">Check your email</h2>
                    <p className="reddit-modal-subtitle">
                        {codePurpose === 'reset' ? 'If an account uses' : 'We sent a 6-digit code to'} <strong>{codeEmail}</strong>{codePurpose === 'reset' ? ", we've sent it a 6-digit code." : '.'}
                    </p>

                    {codeDevCode && (
                        <p className="auth-dev-code">
                            Email isn't configured on this server, so your code is shown here: <strong>{codeDevCode}</strong>
                        </p>
                    )}

                    <form onSubmit={handleVerifyCodeSubmit}>
                        <div className="reddit-input-group" style={{ marginTop: '16px' }}>
                            <input
                                type="text"
                                id="codeInput"
                                className="reddit-input-field"
                                placeholder=" "
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={codeValue}
                                onChange={e => setCodeValue(e.target.value.replace(/\D/g, ''))}
                            />
                            <label htmlFor="codeInput" className="reddit-input-label">Verification code</label>
                        </div>

                        {codePurpose === 'reset' && (
                            <div className="reddit-input-group">
                                <input
                                    type={showCodeNewPass ? 'text' : 'password'}
                                    id="newPassInput"
                                    className="reddit-input-field"
                                    placeholder=" "
                                    autoComplete="new-password"
                                    value={codeNewPass}
                                    onChange={e => setCodeNewPass(e.target.value)}
                                />
                                <label htmlFor="newPassInput" className="reddit-input-label">New password (8+ characters)</label>
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    id="toggleNewPass"
                                    aria-label="Toggle password visibility"
                                    onClick={() => setShowCodeNewPass(prev => !prev)}
                                >
                                    {ICONS.eye}
                                </button>
                            </div>
                        )}

                        <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                        <button
                            type="submit"
                            className={`reddit-login-submit-btn${codeValue.length === 6 && (codePurpose !== 'reset' || codeNewPass.length >= 8) ? ' enabled' : ''}`}
                            id="codeVerifyBtn"
                            style={{ marginTop: '16px' }}
                        >
                            {codePurpose === 'reset' ? 'Reset Password' : 'Log In'}
                        </button>
                    </form>
                </div>
            )}

            {/* 4. SIGN UP WIZARD (Steps 1 to 6) */}
            {view === 'signup' && (
                <>
                    {signUpStep === 1 && (
                        <div className="reddit-modal-card">
                            <button type="button" className="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal" onClick={closeAuthModal}>
                                {ICONS.close}
                            </button>
                            <h2 className="reddit-modal-title">Sign Up</h2>
                            <p className="reddit-modal-legal">
                                By continuing, you agree to our{' '}
                                <a href="page.html?p=user-agreement" className="legal-link">User Agreement</a>{' '}
                                and acknowledge that you understand the{' '}
                                <a href="page.html?p=privacy" className="legal-link">Privacy Policy</a>.
                            </p>

                            <div className="reddit-auth-pill-list">
                                <button type="button" className="reddit-auth-pill-btn" data-provider="phone" onClick={() => setNotice(PROVIDER_NOTICES.phone)}>
                                    <span className="pill-icon">{ICONS.phone}</span><span>Continue with Phone Number</span>
                                </button>
                                <button type="button" className="reddit-auth-pill-btn" data-provider="google" onClick={() => setNotice(PROVIDER_NOTICES.google)}>
                                    <span className="pill-icon">{ICONS.google}</span><span>Continue With Google</span>
                                </button>
                                <button type="button" className="reddit-auth-pill-btn" data-provider="apple" onClick={() => setNotice(PROVIDER_NOTICES.apple)}>
                                    <span className="pill-icon">{ICONS.apple}</span><span>Continue with Apple</span>
                                </button>
                            </div>

                            <p className={`auth-notice${notice ? '' : ' hidden'}`}>{notice}</p>
                            <div className="reddit-modal-divider"><span>OR</span></div>

                            <form onSubmit={handleSignUpStep1}>
                                <div className="reddit-input-group">
                                    <input
                                        type="email"
                                        id="signUpEmail"
                                        className="reddit-input-field"
                                        placeholder=" "
                                        autoComplete="email"
                                        value={signUpEmail}
                                        onChange={e => setSignUpEmail(e.target.value)}
                                    />
                                    <label htmlFor="signUpEmail" className="reddit-input-label">Email <span className="required-asterisk">*</span></label>
                                </div>

                                <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                                <div className="reddit-modal-links">
                                    <p className="signup-prompt">
                                        Already a redditor?{' '}
                                        <a href="#" className="signup-link" id="modalLogInLink" onClick={(e) => { e.preventDefault(); setView('login'); }}>
                                            Log In
                                        </a>
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className={`reddit-login-submit-btn${signUpEmail.includes('@') ? ' enabled' : ''}`}
                                    id="step1ContinueBtn"
                                >
                                    Continue
                                </button>
                            </form>
                        </div>
                    )}

                    {signUpStep === 2 && (
                        <div className="reddit-modal-card">
                            <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setSignUpStep(1)}>
                                {ICONS.back}
                            </button>
                            <h2 className="reddit-modal-title">Verify your email</h2>
                            <p className="reddit-modal-subtitle">Enter the 6-digit code we sent to <strong>{signUpEmail}</strong></p>

                            <div id="devCodeSlot">
                                {signUpDevCode && (
                                    <p className="auth-dev-code">
                                        Email isn't configured on this server, so your code is shown here: <strong>{signUpDevCode}</strong>
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleSignUpStep2}>
                                <div className="reddit-input-group" style={{ marginTop: '24px' }}>
                                    <input
                                        type="text"
                                        id="verifyCodeInput"
                                        className="reddit-input-field"
                                        placeholder=" "
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={signUpCode}
                                        onChange={e => setSignUpCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <label htmlFor="verifyCodeInput" className="reddit-input-label">Verification code</label>
                                </div>

                                <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                                <div className="resend-info-box">
                                    <p>Didn't get an email?</p>
                                    <p>
                                        Check your spam folder or{' '}
                                        <button
                                            type="button"
                                            className="resend-timer"
                                            id="resendCodeBtn"
                                            disabled={resendTimer > 0}
                                            onClick={handleResendSignUpCode}
                                        >
                                            {resendTimer > 0 ? `Resend in 0:${String(resendTimer).padStart(2, '0')}` : 'Resend code'}
                                        </button>
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className={`reddit-login-submit-btn${signUpCode.length === 6 ? ' enabled' : ''}`}
                                    id="step2ContinueBtn"
                                    style={{ marginTop: '32px' }}
                                >
                                    Continue
                                </button>
                            </form>
                        </div>
                    )}

                    {signUpStep === 3 && (
                        <div className="reddit-modal-card">
                            <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setSignUpStep(2)}>
                                {ICONS.back}
                            </button>
                            <h2 className="reddit-modal-title">Create your username and password</h2>
                            <p className="reddit-modal-subtitle">
                                Reddit is anonymous, so your username is what you'll go by here. Choose wisely—because once you get a name, you can't change it.
                            </p>

                            <form onSubmit={handleSignUpStep3}>
                                <div className="reddit-input-group" style={{ marginTop: '20px' }}>
                                    <input
                                        type="text"
                                        id="signUpUsername"
                                        className="reddit-input-field"
                                        placeholder=" "
                                        maxLength={20}
                                        autoComplete="username"
                                        value={signUpUsername}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSignUpUsername(val);
                                            checkUsernameAvail(val);
                                        }}
                                    />
                                    <label htmlFor="signUpUsername" className="reddit-input-label">Username <span className="required-asterisk">*</span></label>
                                    <div className="input-status-icons">
                                        <span className="icon-valid-check" id="userCheckIcon" style={{ display: usernameAvailable ? 'inline' : 'none' }}>✓</span>
                                        <button
                                            type="button"
                                            className="icon-refresh-btn"
                                            id="refreshUsernameBtn"
                                            title="Generate random name"
                                            onClick={handleSuggestUsername}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="input-success-msg" id="usernameStatusMsg" style={{ visibility: usernameStatus ? 'visible' : 'hidden', color: usernameAvailable ? '' : '#D93A00' }}>
                                    {usernameStatus || '\u00A0'}
                                </p>

                                <div className="reddit-input-group" style={{ marginTop: '16px' }}>
                                    <input
                                        type={showSignUpPass ? 'text' : 'password'}
                                        id="signUpPassword"
                                        className="reddit-input-field"
                                        placeholder=" "
                                        autoComplete="new-password"
                                        value={signUpPassword}
                                        onChange={e => setSignUpPassword(e.target.value)}
                                    />
                                    <label htmlFor="signUpPassword" className="reddit-input-label">Password (8+ characters) <span className="required-asterisk">*</span></label>
                                    <div className="input-status-icons">
                                        <span className="icon-valid-check" id="passCheckIcon" style={{ display: signUpPassword.length >= 8 ? 'inline' : 'none' }}>✓</span>
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            id="toggleSignUpPass"
                                            aria-label="Toggle password visibility"
                                            onClick={() => setShowSignUpPass(prev => !prev)}
                                        >
                                            {ICONS.eye}
                                        </button>
                                    </div>
                                </div>

                                <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                                <button
                                    type="submit"
                                    className={`reddit-login-submit-btn${usernameAvailable && signUpPassword.length >= 8 ? ' enabled' : ''}`}
                                    id="step3ContinueBtn"
                                    style={{ marginTop: '24px' }}
                                >
                                    Continue
                                </button>
                            </form>
                        </div>
                    )}

                    {signUpStep === 4 && (
                        <div className="reddit-modal-card">
                            <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setSignUpStep(3)}>
                                {ICONS.back}
                            </button>
                            <div className="reddit-modal-header-top">
                                <button type="button" className="skip-step-btn" id="step4SkipBtn" onClick={() => handleSignUpStep4('')}>
                                    Skip
                                </button>
                            </div>
                            <h2 className="reddit-modal-title" style={{ marginTop: '8px' }}>About you</h2>
                            <p className="reddit-modal-subtitle">Tell us about yourself to improve your experience on Reddit.</p>
                            <p className="gender-prompt-text">How do you identify?</p>
                            <div className="gender-options-list">
                                {['Woman', 'Man', 'Non-binary', 'I prefer not to say'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        className={`gender-pill-btn${signUpGender === g ? ' selected' : ''}`}
                                        data-gender={g}
                                        onClick={() => handleSignUpStep4(g)}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {signUpStep === 5 && (
                        <div className="reddit-modal-card" style={{ maxWidth: '480px' }}>
                            <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setSignUpStep(4)}>
                                {ICONS.back}
                            </button>
                            <h2 className="reddit-modal-title">Choose your interests</h2>
                            <p className="reddit-modal-subtitle">We'll add you to a few popular communities that match.</p>

                            <div className="interests-grid-container">
                                {INTERESTS_LIST.map(item => {
                                    const selected = signUpInterests.includes(item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            className={`interest-grid-card${selected ? ' selected' : ''}`}
                                            data-name={item.name}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                setSignUpInterests(prev =>
                                                    prev.includes(item.name)
                                                        ? prev.filter(i => i !== item.name)
                                                        : [...prev, item.name]
                                                );
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSignUpInterests(prev =>
                                                        prev.includes(item.name)
                                                            ? prev.filter(i => i !== item.name)
                                                            : [...prev, item.name]
                                                    );
                                                }
                                            }}
                                        >
                                            <div className="interest-icon-circle">{item.icon}</div>
                                            <span className="interest-card-label">{item.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className={`reddit-login-submit-btn${signUpInterests.length > 0 ? ' enabled' : ''}`}
                                id="step5ContinueBtn"
                                style={{ marginTop: '16px' }}
                                onClick={handleSignUpStep5}
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {signUpStep === 6 && (
                        <div className="reddit-modal-card" style={{ maxWidth: '480px' }}>
                            <button type="button" className="reddit-modal-back" id="modalBackBtn" aria-label="Go back" onClick={() => setSignUpStep(5)}>
                                {ICONS.back}
                            </button>
                            <h2 className="reddit-modal-title">Customize your feed</h2>
                            <p className="reddit-modal-subtitle">Every selection you make improves your feed.</p>

                            <div className="topics-search-wrapper">
                                <svg className="topics-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input
                                    type="text"
                                    className="topics-search-input"
                                    id="topicsSearchInput"
                                    placeholder="Find more of your interests"
                                    value={topicSearch}
                                    onChange={e => setTopicSearch(e.target.value)}
                                />
                            </div>

                            <div className="topics-cloud-container" id="topicsCloud">
                                {(() => {
                                    const query = topicSearch.trim().toLowerCase();
                                    const all = showMoreTopics ? [...BASE_TOPICS, ...MORE_TOPICS] : BASE_TOPICS;
                                    let list = query ? [...BASE_TOPICS, ...MORE_TOPICS].filter(t => t.toLowerCase().includes(query)) : all;
                                    const custom = query && ![...BASE_TOPICS, ...MORE_TOPICS].some(t => t.toLowerCase() === query) ? topicSearch.trim() : '';
                                    if (custom) list = [...list, custom];

                                    return (
                                        <>
                                            {list.map(topic => {
                                                const selected = signUpTopics.includes(topic);
                                                return (
                                                    <button
                                                        key={topic}
                                                        type="button"
                                                        className={`topic-pill-btn${selected ? ' selected' : ''}`}
                                                        data-topic={topic}
                                                        onClick={() => {
                                                            setSignUpTopics(prev =>
                                                                prev.includes(topic)
                                                                    ? prev.filter(t => t !== topic)
                                                                    : [...prev, topic]
                                                            );
                                                        }}
                                                    >
                                                        {selected ? '✓ ' : ''}{topic === custom ? `+ ${topic}` : topic}
                                                    </button>
                                                );
                                            })}
                                            {!query && !showMoreTopics && (
                                                <button
                                                    type="button"
                                                    className="topic-pill-btn"
                                                    id="showMoreTopicsBtn"
                                                    onClick={() => setShowMoreTopics(true)}
                                                >
                                                    Show More Topics
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <p className={`auth-error${error ? '' : ' hidden'}`}>{error}</p>

                            <button
                                type="button"
                                className={`reddit-login-submit-btn${signUpTopics.length > 0 ? ' enabled' : ''}`}
                                id="step6FinishBtn"
                                onClick={handleSignUpFinish}
                            >
                                Continue
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
