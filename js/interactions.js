import { authState } from './auth-state.js';
import { api } from './api.js';
import { escapeHtml, debounce } from './utils.js';

/**
 * Global interactions: log in, multi-step sign up, one-time code log in, password reset, and toasts.
 */

const signUpState = {
    step: 1,
    email: '',
    code: '',
    devCode: '',
    username: '',
    password: '',
    gender: '',
    interests: [],
    topics: []
};

const ICONS = {
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    google: `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`,
    apple: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.18-.56 2.84-1.36z"/></svg>`,
    link: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
};

const LEGAL = `By continuing, you agree to our <a href="page.html?p=user-agreement" class="legal-link">User Agreement</a> and acknowledge that you understand the <a href="page.html?p=privacy" class="legal-link">Privacy Policy</a>.`;

const PROVIDER_NOTICE = {
    phone: 'Phone number sign-in needs an SMS provider, which this server doesn\'t have. Continue with email instead.',
    google: 'Google sign-in needs OAuth credentials, which this server doesn\'t have. Continue with email instead.',
    apple: 'Apple sign-in needs OAuth credentials, which this server doesn\'t have. Continue with email instead.'
};

export function openAuthModal(mode = 'login', options = {}) {
    const normalized = String(mode).toLowerCase();
    if (normalized === 'signup' || normalized === 'sign up') {
        openSignUpStep(1);
    } else {
        renderLogInModal(options.notice || '');
    }
}

/** Opens the login modal with an explanation for social providers the server can't support. */
export function openProviderNotice(provider) {
    renderLogInModal(PROVIDER_NOTICE[provider] || '');
}

function getModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'reddit-modal-backdrop';
        document.body.appendChild(modal);
    }
    modal.onclick = (e) => { if (e.target === modal) closeAuthModal(); };
    modal.classList.add('active');
    return modal;
}

function closeAuthModal() {
    document.getElementById('authModal')?.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAuthModal();
});

function setError(modal, message) {
    const el = modal.querySelector('.auth-error');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
}

function devCodeHint(code) {
    return code
        ? `<p class="auth-dev-code">Email isn't configured on this server, so your code is shown here: <strong>${escapeHtml(code)}</strong></p>`
        : '';
}

function bindSubmit(button, inputs, handler) {
    const run = async () => {
        if (!button.classList.contains('enabled') || button.dataset.busy) return;
        button.dataset.busy = '1';
        const label = button.textContent;
        button.textContent = 'Please wait…';
        try {
            await handler();
        } finally {
            delete button.dataset.busy;
            if (button.isConnected) button.textContent = label;
        }
    };
    button.addEventListener('click', run);
    inputs.forEach(input => input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') run();
    }));
}

function bindPasswordToggle(modal, buttonSel, inputSel) {
    const btn = modal.querySelector(buttonSel);
    const input = modal.querySelector(inputSel);
    btn?.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
    });
}

function providerPills() {
    return `
        <div class="reddit-auth-pill-list">
            <button class="reddit-auth-pill-btn" data-provider="phone"><span class="pill-icon">${ICONS.phone}</span><span>Continue with Phone Number</span></button>
            <button class="reddit-auth-pill-btn" data-provider="google"><span class="pill-icon">${ICONS.google}</span><span>Continue With Google</span></button>
            <button class="reddit-auth-pill-btn" data-provider="apple"><span class="pill-icon">${ICONS.apple}</span><span>Continue with Apple</span></button>
        </div>`;
}

function bindProviderPills(modal) {
    modal.querySelectorAll('[data-provider]').forEach(btn => {
        btn.addEventListener('click', () => {
            const notice = modal.querySelector('.auth-notice');
            if (notice) {
                notice.textContent = PROVIDER_NOTICE[btn.dataset.provider];
                notice.classList.remove('hidden');
            }
            modal.querySelector('.reddit-input-field')?.focus();
        });
    });
}

/* -------------------------------------------------------------
 * 1. LOG IN
 * ------------------------------------------------------------- */
function renderLogInModal(notice = '') {
    const modal = getModal();
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal">${ICONS.close}</button>
            <h2 class="reddit-modal-title">Log In</h2>
            <p class="reddit-modal-legal">${LEGAL}</p>
            ${providerPills()}
            <div class="reddit-auth-pill-list" style="margin-top:10px;">
                <button class="reddit-auth-pill-btn" id="modalBtnLink"><span class="pill-icon">${ICONS.link}</span><span>Email me a one-time code</span></button>
            </div>
            <p class="auth-notice ${notice ? '' : 'hidden'}">${escapeHtml(notice)}</p>
            <div class="reddit-modal-divider"><span>OR</span></div>
            <div class="reddit-input-group">
                <input type="text" id="modalInputUser" class="reddit-input-field" placeholder=" " autocomplete="username">
                <label for="modalInputUser" class="reddit-input-label">Email or username <span class="required-asterisk">*</span></label>
            </div>
            <div class="reddit-input-group">
                <input type="password" id="modalInputPass" class="reddit-input-field" placeholder=" " autocomplete="current-password">
                <label for="modalInputPass" class="reddit-input-label">Password <span class="required-asterisk">*</span></label>
                <button type="button" class="password-toggle-btn" id="togglePasswordBtn" aria-label="Toggle password visibility">${ICONS.eye}</button>
            </div>
            <p class="auth-error hidden"></p>
            <div class="reddit-modal-links">
                <a href="#" class="forgot-link" id="forgotPasswordLink">Forgot password?</a>
                <p class="signup-prompt">New to Reddit? <a href="#" class="signup-link" id="modalSignUpLink">Sign Up</a></p>
            </div>
            <button class="reddit-login-submit-btn" id="modalSubmitBtn">Log In</button>
        </div>`;

    const userInput = modal.querySelector('#modalInputUser');
    const passInput = modal.querySelector('#modalInputPass');
    const submitBtn = modal.querySelector('#modalSubmitBtn');

    modal.querySelector('#modalCloseBtn').onclick = closeAuthModal;
    bindPasswordToggle(modal, '#togglePasswordBtn', '#modalInputPass');
    bindProviderPills(modal);

    const validate = () => {
        submitBtn.classList.toggle('enabled', userInput.value.trim().length > 0 && passInput.value.length > 0);
    };
    userInput.addEventListener('input', validate);
    passInput.addEventListener('input', validate);

    bindSubmit(submitBtn, [userInput, passInput], async () => {
        setError(modal, '');
        try {
            await api.post('/auth/login', { identifier: userInput.value.trim(), password: passInput.value });
            authState.completeLogin();
        } catch (err) {
            setError(modal, err.message);
        }
    });

    modal.querySelector('#modalSignUpLink').onclick = (e) => { e.preventDefault(); openSignUpStep(1); };
    modal.querySelector('#forgotPasswordLink').onclick = (e) => { e.preventDefault(); renderEmailCodeStart('reset'); };
    modal.querySelector('#modalBtnLink').onclick = () => renderEmailCodeStart('login');
    setTimeout(() => userInput.focus(), 50);
}

/* -------------------------------------------------------------
 * 2. ONE-TIME CODE LOG IN and PASSWORD RESET
 * ------------------------------------------------------------- */
function renderEmailCodeStart(purpose, prefill = '') {
    const modal = getModal();
    const isReset = purpose === 'reset';
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <button class="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal">${ICONS.close}</button>
            <h2 class="reddit-modal-title">${isReset ? 'Reset your password' : 'Log in with a code'}</h2>
            <p class="reddit-modal-subtitle">${isReset
                ? "Enter your email address and we'll send you a code to reset your password."
                : "Enter your email address and we'll send you a one-time code to log in."}</p>
            <div class="reddit-input-group" style="margin-top: 16px;">
                <input type="email" id="codeEmailInput" class="reddit-input-field" placeholder=" " value="${escapeHtml(prefill)}" autocomplete="email">
                <label for="codeEmailInput" class="reddit-input-label">Email <span class="required-asterisk">*</span></label>
            </div>
            <p class="auth-error hidden"></p>
            <button class="reddit-login-submit-btn ${prefill.includes('@') ? 'enabled' : ''}" id="codeSendBtn" style="margin-top: 16px;">${isReset ? 'Reset Password' : 'Send Code'}</button>
        </div>`;

    const emailInput = modal.querySelector('#codeEmailInput');
    const sendBtn = modal.querySelector('#codeSendBtn');
    modal.querySelector('#modalBackBtn').onclick = () => renderLogInModal();
    modal.querySelector('#modalCloseBtn').onclick = closeAuthModal;
    emailInput.addEventListener('input', () => sendBtn.classList.toggle('enabled', emailInput.value.includes('@')));

    bindSubmit(sendBtn, [emailInput], async () => {
        setError(modal, '');
        try {
            const email = emailInput.value.trim();
            const { devCode } = await api.post('/auth/request-code', { email, purpose });
            renderEmailCodeVerify(purpose, email, devCode);
        } catch (err) {
            setError(modal, err.message);
        }
    });
    setTimeout(() => emailInput.focus(), 50);
}

function renderEmailCodeVerify(purpose, email, devCode) {
    const modal = getModal();
    const isReset = purpose === 'reset';
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <h2 class="reddit-modal-title">Check your email</h2>
            <p class="reddit-modal-subtitle">${isReset ? 'If an account uses' : 'We sent a 6-digit code to'} <strong>${escapeHtml(email)}</strong>${isReset ? ", we've sent it a 6-digit code." : '.'}</p>
            ${devCodeHint(devCode)}
            <div class="reddit-input-group" style="margin-top: 16px;">
                <input type="text" id="codeInput" class="reddit-input-field" placeholder=" " maxlength="6" inputmode="numeric" autocomplete="one-time-code">
                <label for="codeInput" class="reddit-input-label">Verification code</label>
            </div>
            ${isReset ? `
            <div class="reddit-input-group">
                <input type="password" id="newPassInput" class="reddit-input-field" placeholder=" " autocomplete="new-password">
                <label for="newPassInput" class="reddit-input-label">New password (8+ characters)</label>
                <button type="button" class="password-toggle-btn" id="toggleNewPass" aria-label="Toggle password visibility">${ICONS.eye}</button>
            </div>` : ''}
            <p class="auth-error hidden"></p>
            <button class="reddit-login-submit-btn" id="codeVerifyBtn" style="margin-top: 16px;">${isReset ? 'Reset Password' : 'Log In'}</button>
        </div>`;

    const codeInput = modal.querySelector('#codeInput');
    const passInput = modal.querySelector('#newPassInput');
    const verifyBtn = modal.querySelector('#codeVerifyBtn');
    modal.querySelector('#modalBackBtn').onclick = () => renderEmailCodeStart(purpose, email);
    bindPasswordToggle(modal, '#toggleNewPass', '#newPassInput');

    const validate = () => {
        const codeOk = codeInput.value.trim().length === 6;
        verifyBtn.classList.toggle('enabled', codeOk && (!isReset || passInput.value.length >= 8));
    };
    codeInput.addEventListener('input', validate);
    passInput?.addEventListener('input', validate);

    bindSubmit(verifyBtn, [codeInput, passInput], async () => {
        setError(modal, '');
        try {
            if (isReset) {
                await api.post('/auth/reset-password', { email, code: codeInput.value.trim(), password: passInput.value });
            } else {
                await api.post('/auth/login-code', { email, code: codeInput.value.trim() });
            }
            authState.completeLogin();
        } catch (err) {
            setError(modal, err.message);
        }
    });
    setTimeout(() => codeInput.focus(), 50);
}

/* -------------------------------------------------------------
 * 3. MULTI-STEP SIGN UP WIZARD (Steps 1 to 6)
 * ------------------------------------------------------------- */
function openSignUpStep(step) {
    signUpState.step = step;
    const modal = getModal();
    const steps = [null, renderSignUpStep1, renderSignUpStep2, renderSignUpStep3, renderSignUpStep4, renderSignUpStep5, renderSignUpStep6];
    steps[step](modal);
}

// STEP 1: Email
function renderSignUpStep1(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal">${ICONS.close}</button>
            <h2 class="reddit-modal-title">Sign Up</h2>
            <p class="reddit-modal-legal">${LEGAL}</p>
            ${providerPills()}
            <p class="auth-notice hidden"></p>
            <div class="reddit-modal-divider"><span>OR</span></div>
            <div class="reddit-input-group">
                <input type="email" id="signUpEmail" class="reddit-input-field" placeholder=" " value="${escapeHtml(signUpState.email)}" autocomplete="email">
                <label for="signUpEmail" class="reddit-input-label">Email <span class="required-asterisk">*</span></label>
            </div>
            <p class="auth-error hidden"></p>
            <div class="reddit-modal-links">
                <p class="signup-prompt">Already a redditor? <a href="#" class="signup-link" id="modalLogInLink">Log In</a></p>
            </div>
            <button class="reddit-login-submit-btn ${signUpState.email.includes('@') ? 'enabled' : ''}" id="step1ContinueBtn">Continue</button>
        </div>`;

    const emailInput = modal.querySelector('#signUpEmail');
    const continueBtn = modal.querySelector('#step1ContinueBtn');
    modal.querySelector('#modalCloseBtn').onclick = closeAuthModal;
    bindProviderPills(modal);

    emailInput.addEventListener('input', () => {
        signUpState.email = emailInput.value.trim();
        continueBtn.classList.toggle('enabled', signUpState.email.includes('@'));
    });

    bindSubmit(continueBtn, [emailInput], async () => {
        setError(modal, '');
        try {
            const { devCode } = await api.post('/auth/request-code', { email: signUpState.email, purpose: 'signup' });
            signUpState.devCode = devCode || '';
            signUpState.code = '';
            openSignUpStep(2);
        } catch (err) {
            setError(modal, err.message);
        }
    });

    modal.querySelector('#modalLogInLink').onclick = (e) => { e.preventDefault(); renderLogInModal(); };
    setTimeout(() => emailInput.focus(), 50);
}

// STEP 2: Email verification code
let resendTimer = null;
function renderSignUpStep2(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <h2 class="reddit-modal-title">Verify your email</h2>
            <p class="reddit-modal-subtitle">Enter the 6-digit code we sent to <strong>${escapeHtml(signUpState.email)}</strong></p>
            <div id="devCodeSlot">${devCodeHint(signUpState.devCode)}</div>
            <div class="reddit-input-group" style="margin-top: 24px;">
                <input type="text" id="verifyCodeInput" class="reddit-input-field" placeholder=" " maxlength="6" inputmode="numeric" autocomplete="one-time-code" value="${escapeHtml(signUpState.code)}">
                <label for="verifyCodeInput" class="reddit-input-label">Verification code</label>
            </div>
            <p class="auth-error hidden"></p>
            <div class="resend-info-box">
                <p>Didn't get an email?</p>
                <p>Check your spam folder or <button type="button" class="resend-timer" id="resendCodeBtn" disabled>Resend in 0:30</button></p>
            </div>
            <button class="reddit-login-submit-btn ${signUpState.code.length === 6 ? 'enabled' : ''}" id="step2ContinueBtn" style="margin-top: 32px;">Continue</button>
        </div>`;

    const codeInput = modal.querySelector('#verifyCodeInput');
    const continueBtn = modal.querySelector('#step2ContinueBtn');
    const resendBtn = modal.querySelector('#resendCodeBtn');

    modal.querySelector('#modalBackBtn').onclick = () => openSignUpStep(1);

    const startCountdown = () => {
        clearInterval(resendTimer);
        let remaining = 30;
        resendBtn.disabled = true;
        resendTimer = setInterval(() => {
            remaining -= 1;
            if (!resendBtn.isConnected) return clearInterval(resendTimer);
            if (remaining <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend code';
            } else {
                resendBtn.textContent = `Resend in 0:${String(remaining).padStart(2, '0')}`;
            }
        }, 1000);
    };
    startCountdown();

    resendBtn.onclick = async () => {
        try {
            const { devCode } = await api.post('/auth/request-code', { email: signUpState.email, purpose: 'signup' });
            signUpState.devCode = devCode || '';
            modal.querySelector('#devCodeSlot').innerHTML = devCodeHint(signUpState.devCode);
            showToast('A new code is on its way');
            startCountdown();
        } catch (err) {
            setError(modal, err.message);
        }
    };

    codeInput.addEventListener('input', () => {
        signUpState.code = codeInput.value.replace(/\D/g, '');
        codeInput.value = signUpState.code;
        continueBtn.classList.toggle('enabled', signUpState.code.length === 6);
    });

    bindSubmit(continueBtn, [codeInput], async () => {
        setError(modal, '');
        try {
            await api.post('/auth/verify-code', { email: signUpState.email, code: signUpState.code });
            clearInterval(resendTimer);
            openSignUpStep(3);
        } catch (err) {
            setError(modal, err.message);
        }
    });
    setTimeout(() => codeInput.focus(), 50);
}

// STEP 3: Username and password
function renderSignUpStep3(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <h2 class="reddit-modal-title">Create your username and password</h2>
            <p class="reddit-modal-subtitle">Reddit is anonymous, so your username is what you'll go by here. Choose wisely—because once you get a name, you can't change it.</p>
            <div class="reddit-input-group" style="margin-top: 20px;">
                <input type="text" id="signUpUsername" class="reddit-input-field" placeholder=" " maxlength="20" value="${escapeHtml(signUpState.username)}" autocomplete="username">
                <label for="signUpUsername" class="reddit-input-label">Username <span class="required-asterisk">*</span></label>
                <div class="input-status-icons">
                    <span class="icon-valid-check" id="userCheckIcon" style="display:none;">✓</span>
                    <button type="button" class="icon-refresh-btn" id="refreshUsernameBtn" title="Generate random name">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                </div>
            </div>
            <p class="input-success-msg" id="usernameStatusMsg" style="visibility:hidden;">&nbsp;</p>
            <div class="reddit-input-group" style="margin-top: 16px;">
                <input type="password" id="signUpPassword" class="reddit-input-field" placeholder=" " value="${escapeHtml(signUpState.password)}" autocomplete="new-password">
                <label for="signUpPassword" class="reddit-input-label">Password (8+ characters) <span class="required-asterisk">*</span></label>
                <div class="input-status-icons">
                    <span class="icon-valid-check" id="passCheckIcon" style="display:none;">✓</span>
                    <button type="button" class="password-toggle-btn" id="toggleSignUpPass" aria-label="Toggle password visibility">${ICONS.eye}</button>
                </div>
            </div>
            <p class="auth-error hidden"></p>
            <button class="reddit-login-submit-btn" id="step3ContinueBtn" style="margin-top: 24px;">Continue</button>
        </div>`;

    const userInput = modal.querySelector('#signUpUsername');
    const passInput = modal.querySelector('#signUpPassword');
    const userCheck = modal.querySelector('#userCheckIcon');
    const passCheck = modal.querySelector('#passCheckIcon');
    const statusMsg = modal.querySelector('#usernameStatusMsg');
    const continueBtn = modal.querySelector('#step3ContinueBtn');
    let usernameOk = false;

    modal.querySelector('#modalBackBtn').onclick = () => openSignUpStep(2);
    bindPasswordToggle(modal, '#toggleSignUpPass', '#signUpPassword');

    const refreshState = () => {
        signUpState.password = passInput.value;
        passCheck.style.display = signUpState.password.length >= 8 ? 'inline' : 'none';
        continueBtn.classList.toggle('enabled', usernameOk && signUpState.password.length >= 8);
    };

    const checkUsername = debounce(async () => {
        const value = userInput.value.trim();
        signUpState.username = value;
        if (!value) {
            usernameOk = false;
            statusMsg.style.visibility = 'hidden';
            userCheck.style.display = 'none';
            return refreshState();
        }
        try {
            const { available, message } = await api.get(`/auth/check-username?username=${encodeURIComponent(value)}`);
            if (userInput.value.trim() !== value) return;
            usernameOk = available;
            statusMsg.textContent = message;
            statusMsg.style.visibility = 'visible';
            statusMsg.style.color = available ? '' : '#D93A00';
            userCheck.style.display = available ? 'inline' : 'none';
        } catch {
            usernameOk = false;
        }
        refreshState();
    }, 300);

    const suggest = async () => {
        try {
            const { username } = await api.get('/auth/suggest-username');
            userInput.value = username;
            checkUsername();
        } catch (err) {
            setError(modal, err.message);
        }
    };

    userInput.addEventListener('input', () => {
        usernameOk = false;
        refreshState();
        checkUsername();
    });
    passInput.addEventListener('input', refreshState);
    modal.querySelector('#refreshUsernameBtn').onclick = suggest;

    if (signUpState.username) checkUsername();
    else suggest();

    bindSubmit(continueBtn, [userInput, passInput], async () => openSignUpStep(4));
}

// STEP 4: About you
function renderSignUpStep4(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <div class="reddit-modal-header-top">
                <button class="skip-step-btn" id="step4SkipBtn">Skip</button>
            </div>
            <h2 class="reddit-modal-title" style="margin-top: 8px;">About you</h2>
            <p class="reddit-modal-subtitle">Tell us about yourself to improve your experience on Reddit.</p>
            <p class="gender-prompt-text">How do you identify?</p>
            <div class="gender-options-list">
                ${['Woman', 'Man', 'Non-binary', 'I prefer not to say'].map(g => `
                    <button class="gender-pill-btn ${signUpState.gender === g ? 'selected' : ''}" data-gender="${g}">${g}</button>`).join('')}
            </div>
        </div>`;

    modal.querySelector('#modalBackBtn').onclick = () => openSignUpStep(3);
    modal.querySelector('#step4SkipBtn').onclick = () => {
        signUpState.gender = '';
        openSignUpStep(5);
    };
    modal.querySelectorAll('.gender-pill-btn').forEach(btn => {
        btn.onclick = () => {
            signUpState.gender = btn.dataset.gender;
            openSignUpStep(5);
        };
    });
}

// STEP 5: Interests
function renderSignUpStep5(modal) {
    const interestsList = [
        { name: 'Art', icon: '🎨' }, { name: 'Beauty', icon: '💄' }, { name: 'Career', icon: '💼' },
        { name: 'Entertainment', icon: '🎬' }, { name: 'Finance', icon: '📈' }, { name: 'Food', icon: '🍴' },
        { name: 'Gaming', icon: '🎮' }, { name: 'News', icon: '📰' }, { name: 'Sports', icon: '⚾' },
        { name: 'Technology', icon: '💻' }, { name: 'Travel', icon: '📍' }, { name: 'Wellness', icon: '🌱' }
    ];

    modal.innerHTML = `
        <div class="reddit-modal-card" style="max-width: 480px;">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <h2 class="reddit-modal-title">Choose your interests</h2>
            <p class="reddit-modal-subtitle">We'll add you to a few popular communities that match.</p>
            <div class="interests-grid-container">
                ${interestsList.map(item => `
                    <div class="interest-grid-card ${signUpState.interests.includes(item.name) ? 'selected' : ''}" data-name="${item.name}" role="button" tabindex="0">
                        <div class="interest-icon-circle">${item.icon}</div>
                        <span class="interest-card-label">${item.name}</span>
                    </div>`).join('')}
            </div>
            <button class="reddit-login-submit-btn ${signUpState.interests.length > 0 ? 'enabled' : ''}" id="step5ContinueBtn" style="margin-top: 16px;">Continue</button>
        </div>`;

    const continueBtn = modal.querySelector('#step5ContinueBtn');
    modal.querySelector('#modalBackBtn').onclick = () => openSignUpStep(4);

    modal.querySelectorAll('.interest-grid-card').forEach(card => {
        const toggle = () => {
            const name = card.dataset.name;
            if (signUpState.interests.includes(name)) {
                signUpState.interests = signUpState.interests.filter(i => i !== name);
            } else {
                signUpState.interests.push(name);
            }
            card.classList.toggle('selected');
            continueBtn.classList.toggle('enabled', signUpState.interests.length > 0);
        };
        card.onclick = toggle;
        card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
    });

    continueBtn.onclick = () => {
        if (continueBtn.classList.contains('enabled')) openSignUpStep(6);
    };
}

// STEP 6: Customize your feed, then create the account
function renderSignUpStep6(modal) {
    const baseTopics = [
        'Skincare', 'Mollywood', 'Painting', 'Digital Art', 'Beard Grooming', 'Kochi-Muziris Biennale',
        'Personal Finance', 'Sculpture', 'Software Development', 'Ayurvedic Skincare', 'Photography', 'Stock Market',
        'Indian IT Industry', 'Data Science', 'Bollywood', 'Fragrance', 'Gulf Jobs', "Men's Hairstyles", 'Hollywood', 'Investing'
    ];
    const moreTopics = ['Cricket', 'Football', 'Anime', 'Cooking', 'Travel Photography', 'Gaming PCs', 'Startups', 'Books',
        'Fitness', 'Music Production', 'Space', 'History', 'Cars', 'Gardening', 'Movies', 'Web Development'];
    let showingMore = false;

    modal.innerHTML = `
        <div class="reddit-modal-card" style="max-width: 480px;">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">${ICONS.back}</button>
            <h2 class="reddit-modal-title">Customize your feed</h2>
            <p class="reddit-modal-subtitle">Every selection you make improves your feed.</p>
            <div class="topics-search-wrapper">
                <svg class="topics-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="topics-search-input" id="topicsSearchInput" placeholder="Find more of your interests">
            </div>
            <div class="topics-cloud-container" id="topicsCloud"></div>
            <p class="auth-error hidden"></p>
            <button class="reddit-login-submit-btn ${signUpState.topics.length > 0 ? 'enabled' : ''}" id="step6FinishBtn">Continue</button>
        </div>`;

    const cloud = modal.querySelector('#topicsCloud');
    const searchInput = modal.querySelector('#topicsSearchInput');
    const finishBtn = modal.querySelector('#step6FinishBtn');
    modal.querySelector('#modalBackBtn').onclick = () => openSignUpStep(5);

    const renderTopics = () => {
        const query = searchInput.value.trim().toLowerCase();
        const all = showingMore ? [...baseTopics, ...moreTopics] : baseTopics;
        let list = query ? [...baseTopics, ...moreTopics].filter(t => t.toLowerCase().includes(query)) : all;
        const custom = query && ![...baseTopics, ...moreTopics].some(t => t.toLowerCase() === query) ? searchInput.value.trim() : '';
        if (custom) list = [...list, custom];
        cloud.innerHTML = list.map(topic => {
            const selected = signUpState.topics.includes(topic);
            return `<button class="topic-pill-btn ${selected ? 'selected' : ''}" data-topic="${escapeHtml(topic)}">${selected ? '✓ ' : ''}${escapeHtml(topic === custom ? `+ ${topic}` : topic)}</button>`;
        }).join('') + (!query && !showingMore ? '<button class="topic-pill-btn" id="showMoreTopicsBtn">Show More Topics</button>' : '');

        cloud.querySelectorAll('[data-topic]').forEach(btn => {
            btn.onclick = () => {
                const topic = btn.dataset.topic;
                if (signUpState.topics.includes(topic)) signUpState.topics = signUpState.topics.filter(t => t !== topic);
                else signUpState.topics.push(topic);
                finishBtn.classList.toggle('enabled', signUpState.topics.length > 0);
                renderTopics();
            };
        });
        const more = cloud.querySelector('#showMoreTopicsBtn');
        if (more) more.onclick = () => { showingMore = true; renderTopics(); };
    };
    searchInput.addEventListener('input', renderTopics);
    renderTopics();

    bindSubmit(finishBtn, [], async () => {
        setError(modal, '');
        try {
            await api.post('/auth/signup', {
                email: signUpState.email,
                code: signUpState.code,
                username: signUpState.username,
                password: signUpState.password,
                gender: signUpState.gender,
                interests: signUpState.interests,
                topics: signUpState.topics
            });
            authState.completeLogin();
        } catch (err) {
            setError(modal, err.message);
        }
    });
}

export function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.setAttribute('role', 'status');
    toast.style.cssText = `
        background-color: #1A1A1B;
        color: #FFFFFF;
        padding: 12px 20px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.25s ease;
        pointer-events: auto;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}
