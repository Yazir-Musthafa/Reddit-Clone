import { authState } from './auth-state.js';

/**
 * Global interactions, modal managers, and multi-step Sign Up wizard.
 */

// State for multi-step signup
const signUpState = {
    step: 1,
    email: '',
    code: '',
    username: 'Fantastic-Series2270',
    password: '',
    gender: '',
    interests: [],
    topics: []
};

// Preset random usernames generator
const randomUsernames = [
    'Fantastic-Series2270',
    'Curious-Explorer409',
    'Pixel-Artisan99',
    'Starry-Voyager712',
    'Cosmic-Dev2026',
    'Bold-Adventurer88'
];

export function openAuthModal(mode = 'login') {
    if (mode === 'signup' || mode === 'Sign Up') {
        openSignUpStep(1);
    } else {
        renderLogInModal();
    }
}

/* -------------------------------------------------------------
 * 1. LOG IN MODAL IMPLEMENTATION
 * ------------------------------------------------------------- */
function renderLogInModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'reddit-modal-backdrop';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Log In</h2>
            
            <p class="reddit-modal-legal">
                By continuing, you agree to our <a href="#" class="legal-link">User Agreement</a> and acknowledge that you understand the <a href="#" class="legal-link">Privacy Policy</a>.
            </p>

            <div class="reddit-auth-pill-list">
                <button class="reddit-auth-pill-btn" id="modalBtnPhone">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                    </span>
                    <span>Continue with Phone Number</span>
                </button>

                <button class="reddit-auth-pill-btn" id="modalBtnGoogle">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                    </span>
                    <span>Continue With Google</span>
                </button>

                <button class="reddit-auth-pill-btn" id="modalBtnApple">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.18-.56 2.84-1.36z"/>
                        </svg>
                    </span>
                    <span>Continue with Apple</span>
                </button>

                <button class="reddit-auth-pill-btn" id="modalBtnLink">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                    </span>
                    <span>Email me a one-time link</span>
                </button>
            </div>

            <div class="reddit-modal-divider">
                <span>OR</span>
            </div>

            <div class="reddit-input-group">
                <input type="text" id="modalInputUser" class="reddit-input-field" placeholder=" " autocomplete="username">
                <label for="modalInputUser" class="reddit-input-label">Email or username <span class="required-asterisk">*</span></label>
            </div>

            <div class="reddit-input-group">
                <input type="password" id="modalInputPass" class="reddit-input-field" placeholder=" " autocomplete="current-password">
                <label for="modalInputPass" class="reddit-input-label">Password <span class="required-asterisk">*</span></label>
                <button type="button" class="password-toggle-btn" id="togglePasswordBtn" aria-label="Toggle password visibility">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>

            <div class="reddit-modal-links">
                <a href="#" class="forgot-link" id="forgotPasswordLink">Forgot password?</a>
                <p class="signup-prompt">New to Reddit? <a href="#" class="signup-link" id="modalSignUpLink">Sign Up</a></p>
            </div>

            <button class="reddit-login-submit-btn" id="modalSubmitBtn">Log In</button>
        </div>
    `;

    bindLogInEvents(modal);
    modal.classList.add('active');
}

function bindLogInEvents(modal) {
    const closeBtn = modal.querySelector('#modalCloseBtn');
    const userInput = modal.querySelector('#modalInputUser');
    const passInput = modal.querySelector('#modalInputPass');
    const togglePass = modal.querySelector('#togglePasswordBtn');
    const submitBtn = modal.querySelector('#modalSubmitBtn');
    const signUpLink = modal.querySelector('#modalSignUpLink');
    const forgotLink = modal.querySelector('#forgotPasswordLink');

    const closeModal = () => modal.classList.remove('active');

    closeBtn?.addEventListener('click', closeModal);
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const validateInputs = () => {
        const hasUser = userInput.value.trim().length > 0;
        const hasPass = passInput.value.length > 0;
        if (hasUser && hasPass) {
            submitBtn.classList.add('enabled');
        } else {
            submitBtn.classList.remove('enabled');
        }
    };

    userInput?.addEventListener('input', validateInputs);
    passInput?.addEventListener('input', validateInputs);

    togglePass?.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
    });

    submitBtn?.addEventListener('click', () => {
        if (submitBtn.classList.contains('enabled')) {
            const user = userInput.value.trim() || 'Fantastic-Series2270';
            authState.login(user);
            closeModal();
            showToast(`Welcome back, ${user}!`);
        }
    });

    signUpLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openSignUpStep(1);
    });

    forgotLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Password reset link sent');
    });

    modal.querySelectorAll('.reddit-auth-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const label = btn.querySelector('span:last-child')?.textContent || 'Authentication';
            showToast(`${label} selected`);
        });
    });
}

/* -------------------------------------------------------------
 * 2. MULTI-STEP SIGN UP WIZARD IMPLEMENTATION (Steps 1 to 6)
 * ------------------------------------------------------------- */
function openSignUpStep(step) {
    signUpState.step = step;
    let modal = document.getElementById('authModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'reddit-modal-backdrop';
        document.body.appendChild(modal);
    }

    if (step === 1) renderSignUpStep1(modal);
    else if (step === 2) renderSignUpStep2(modal);
    else if (step === 3) renderSignUpStep3(modal);
    else if (step === 4) renderSignUpStep4(modal);
    else if (step === 5) renderSignUpStep5(modal);
    else if (step === 6) renderSignUpStep6(modal);

    modal.classList.add('active');
}

// STEP 1: Email Input
function renderSignUpStep1(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-close" id="modalCloseBtn" aria-label="Close modal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Sign Up</h2>
            
            <p class="reddit-modal-legal">
                By continuing, you agree to our <a href="#" class="legal-link">User Agreement</a> and acknowledge that you understand the <a href="#" class="legal-link">Privacy Policy</a>.
            </p>

            <div class="reddit-auth-pill-list">
                <button class="reddit-auth-pill-btn">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                    </span>
                    <span>Continue with Phone Number</span>
                </button>

                <button class="reddit-auth-pill-btn">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                    </span>
                    <span>Continue With Google</span>
                </button>

                <button class="reddit-auth-pill-btn">
                    <span class="pill-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.18-.56 2.84-1.36z"/>
                        </svg>
                    </span>
                    <span>Continue with Apple</span>
                </button>
            </div>

            <div class="reddit-modal-divider">
                <span>OR</span>
            </div>

            <div class="reddit-input-group">
                <input type="email" id="signUpEmail" class="reddit-input-field" placeholder=" " value="${signUpState.email}">
                <label for="signUpEmail" class="reddit-input-label">Email <span class="required-asterisk">*</span></label>
            </div>

            <div class="reddit-modal-links">
                <p class="signup-prompt">Already a redditor? <a href="#" class="signup-link" id="modalLogInLink">Log In</a></p>
            </div>

            <button class="reddit-login-submit-btn ${signUpState.email ? 'enabled' : ''}" id="step1ContinueBtn">Continue</button>
        </div>
    `;

    const emailInput = modal.querySelector('#signUpEmail');
    const continueBtn = modal.querySelector('#step1ContinueBtn');
    const closeBtn = modal.querySelector('#modalCloseBtn');
    const logInLink = modal.querySelector('#modalLogInLink');

    const closeModal = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', closeModal);
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    emailInput?.addEventListener('input', () => {
        signUpState.email = emailInput.value.trim();
        if (signUpState.email.includes('@')) {
            continueBtn.classList.add('enabled');
        } else {
            continueBtn.classList.remove('enabled');
        }
    });

    continueBtn?.addEventListener('click', () => {
        if (continueBtn.classList.contains('enabled')) {
            openSignUpStep(2);
        }
    });

    logInLink?.addEventListener('click', (e) => {
        e.preventDefault();
        renderLogInModal();
    });
}

// STEP 2: Email Verification Code Input
function renderSignUpStep2(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Verify your email</h2>
            <p class="reddit-modal-subtitle">
                Enter the 6-digit code we sent to <strong>${signUpState.email || 'yazirm@gmail.com'}</strong>
            </p>

            <div class="reddit-input-group" style="margin-top: 24px;">
                <input type="text" id="verifyCodeInput" class="reddit-input-field" placeholder=" " maxlength="6" value="${signUpState.code}">
                <label for="verifyCodeInput" class="reddit-input-label">Verification code</label>
            </div>

            <div class="resend-info-box">
                <p>Didn't get an email?</p>
                <p>Check your spam folder or <span class="resend-timer">Resend in 0:22</span></p>
            </div>

            <button class="reddit-login-submit-btn ${signUpState.code.length >= 6 ? 'enabled' : ''}" id="step2ContinueBtn" style="margin-top: 32px;">Continue</button>
        </div>
    `;

    const backBtn = modal.querySelector('#modalBackBtn');
    const codeInput = modal.querySelector('#verifyCodeInput');
    const continueBtn = modal.querySelector('#step2ContinueBtn');

    backBtn?.addEventListener('click', () => openSignUpStep(1));
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    codeInput?.addEventListener('input', () => {
        signUpState.code = codeInput.value.trim();
        if (signUpState.code.length >= 6) {
            continueBtn.classList.add('enabled');
        } else {
            continueBtn.classList.remove('enabled');
        }
    });

    continueBtn?.addEventListener('click', () => {
        if (continueBtn.classList.contains('enabled')) {
            openSignUpStep(3);
        }
    });
}

// STEP 3: Create Username and Password
function renderSignUpStep3(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Create your username and password</h2>
            <p class="reddit-modal-subtitle">
                Reddit is anonymous, so your username is what you'll go by here. Choose wisely—because once you get a name, you can't change it.
            </p>

            <div class="reddit-input-group" style="margin-top: 20px;">
                <input type="text" id="signUpUsername" class="reddit-input-field" placeholder=" " value="${signUpState.username}">
                <label for="signUpUsername" class="reddit-input-label">Username <span class="required-asterisk">*</span></label>
                <div class="input-status-icons">
                    <span class="icon-valid-check">✓</span>
                    <button type="button" class="icon-refresh-btn" id="refreshUsernameBtn" title="Generate random name">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                    </button>
                </div>
            </div>
            <p class="input-success-msg">Great name! It's not taken so it's all yours</p>

            <div class="reddit-input-group" style="margin-top: 16px;">
                <input type="password" id="signUpPassword" class="reddit-input-field" placeholder=" " value="${signUpState.password}">
                <label for="signUpPassword" class="reddit-input-label">Password <span class="required-asterisk">*</span></label>
                <div class="input-status-icons">
                    <span class="icon-valid-check" id="passCheckIcon" style="display: ${signUpState.password ? 'inline' : 'none'};">✓</span>
                    <button type="button" class="password-toggle-btn" id="toggleSignUpPass">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>

            <button class="reddit-login-submit-btn ${signUpState.username && signUpState.password ? 'enabled' : ''}" id="step3ContinueBtn" style="margin-top: 32px;">Continue</button>
        </div>
    `;

    const backBtn = modal.querySelector('#modalBackBtn');
    const userInput = modal.querySelector('#signUpUsername');
    const passInput = modal.querySelector('#signUpPassword');
    const refreshBtn = modal.querySelector('#refreshUsernameBtn');
    const togglePass = modal.querySelector('#toggleSignUpPass');
    const passCheck = modal.querySelector('#passCheckIcon');
    const continueBtn = modal.querySelector('#step3ContinueBtn');

    backBtn?.addEventListener('click', () => openSignUpStep(2));
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    refreshBtn?.addEventListener('click', () => {
        const randName = randomUsernames[Math.floor(Math.random() * randomUsernames.length)];
        userInput.value = randName;
        signUpState.username = randName;
    });

    togglePass?.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
    });

    const checkStep3 = () => {
        signUpState.username = userInput.value.trim();
        signUpState.password = passInput.value;
        if (signUpState.password.length > 0) passCheck.style.display = 'inline';
        else passCheck.style.display = 'none';

        if (signUpState.username && signUpState.password.length >= 6) {
            continueBtn.classList.add('enabled');
        } else {
            continueBtn.classList.remove('enabled');
        }
    };

    userInput?.addEventListener('input', checkStep3);
    passInput?.addEventListener('input', checkStep3);

    continueBtn?.addEventListener('click', () => {
        if (continueBtn.classList.contains('enabled')) {
            openSignUpStep(4);
        }
    });
}

// STEP 4: About You (Gender Options)
function renderSignUpStep4(modal) {
    modal.innerHTML = `
        <div class="reddit-modal-card">
            <div class="reddit-modal-header-top">
                <button class="skip-step-btn" id="step4SkipBtn">Skip</button>
            </div>

            <h2 class="reddit-modal-title" style="margin-top: 8px;">About you</h2>
            <p class="reddit-modal-subtitle">
                Tell us about yourself to improve your experience on Reddit.
            </p>

            <p class="gender-prompt-text">How do you identify?</p>

            <div class="gender-options-list">
                <button class="gender-pill-btn" data-gender="Woman">Woman</button>
                <button class="gender-pill-btn" data-gender="Man">Man</button>
                <button class="gender-pill-btn" data-gender="Non-binary">Non-binary</button>
                <button class="gender-pill-btn" data-gender="I prefer not to say">I prefer not to say</button>
            </div>
        </div>
    `;

    const skipBtn = modal.querySelector('#step4SkipBtn');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    skipBtn?.addEventListener('click', () => openSignUpStep(5));

    modal.querySelectorAll('.gender-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            signUpState.gender = btn.getAttribute('data-gender');
            openSignUpStep(5);
        });
    });
}

// STEP 5: Choose Your Interests Grid
function renderSignUpStep5(modal) {
    const interestsList = [
        { name: 'Art', icon: '🎨' },
        { name: 'Beauty', icon: '💄' },
        { name: 'Career', icon: '💼' },
        { name: 'Entertainment', icon: '🎬' },
        { name: 'Finance', icon: '📈' },
        { name: 'Food', icon: '🍴' },
        { name: 'Gaming', icon: '🎮' },
        { name: 'News', icon: '📰' },
        { name: 'Sports', icon: '⚾' },
        { name: 'Technology', icon: '💻' },
        { name: 'Travel', icon: '📍' },
        { name: 'Wellness', icon: '🌱' }
    ];

    modal.innerHTML = `
        <div class="reddit-modal-card" style="max-width: 480px;">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Choose your interests</h2>
            <p class="reddit-modal-subtitle">
                Your choices will determine the options you see next.
            </p>

            <div class="interests-grid-container">
                ${interestsList.map(item => {
                    const isSelected = signUpState.interests.includes(item.name);
                    return `
                        <div class="interest-grid-card ${isSelected ? 'selected' : ''}" data-name="${item.name}">
                            <div class="interest-icon-circle">${item.icon}</div>
                            <span class="interest-card-label">${item.name}</span>
                        </div>
                    `;
                }).join('')}
            </div>

            <button class="reddit-login-submit-btn ${signUpState.interests.length > 0 ? 'enabled' : ''}" id="step5ContinueBtn" style="margin-top: 16px;">Continue</button>
        </div>
    `;

    const backBtn = modal.querySelector('#modalBackBtn');
    const continueBtn = modal.querySelector('#step5ContinueBtn');

    backBtn?.addEventListener('click', () => openSignUpStep(4));
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    modal.querySelectorAll('.interest-grid-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.getAttribute('data-name');
            if (signUpState.interests.includes(name)) {
                signUpState.interests = signUpState.interests.filter(i => i !== name);
                card.classList.remove('selected');
            } else {
                signUpState.interests.push(name);
                card.classList.add('selected');
            }

            if (signUpState.interests.length > 0) {
                continueBtn.classList.add('enabled');
            } else {
                continueBtn.classList.remove('enabled');
            }
        });
    });

    continueBtn?.addEventListener('click', () => {
        if (continueBtn.classList.contains('enabled')) {
            openSignUpStep(6);
        }
    });
}

// STEP 6: Customize Your Feed (Screenshots 1 & 2)
function renderSignUpStep6(modal) {
    const topicsList = [
        'Skincare', 'Mollywood', 'Painting', 'Digital Art',
        'Beard Grooming', 'Kochi-Muziris Biennale',
        'Personal Finance', 'Sculpture', 'Software Development',
        'Ayurvedic Skincare', 'Photography', 'Stock Market',
        'Indian IT Industry', 'Data Science', 'Bollywood',
        'Fragrance', 'Gulf Jobs', "Men's Hairstyles", 'Hollywood',
        'Investing', 'Show More Topics'
    ];

    modal.innerHTML = `
        <div class="reddit-modal-card" style="max-width: 480px;">
            <button class="reddit-modal-back" id="modalBackBtn" aria-label="Go back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
            </button>

            <h2 class="reddit-modal-title">Customize your feed</h2>
            <p class="reddit-modal-subtitle">
                Every selection you make improves your feed.
            </p>

            <div class="topics-search-wrapper">
                <svg class="topics-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" class="topics-search-input" placeholder="Find more of your interests">
            </div>

            <div class="topics-cloud-container">
                ${topicsList.map(topic => {
                    const isSelected = signUpState.topics.includes(topic);
                    return `
                        <button class="topic-pill-btn ${isSelected ? 'selected' : ''}" data-topic="${topic}">
                            ${isSelected ? '✓ ' : ''}${topic}
                        </button>
                    `;
                }).join('')}
            </div>

            <button class="reddit-login-submit-btn ${signUpState.topics.length > 0 ? 'enabled' : ''}" id="step6FinishBtn">Continue</button>
        </div>
    `;

    const backBtn = modal.querySelector('#modalBackBtn');
    const finishBtn = modal.querySelector('#step6FinishBtn');

    backBtn?.addEventListener('click', () => openSignUpStep(5));
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    modal.querySelectorAll('.topic-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const topic = btn.getAttribute('data-topic');
            if (signUpState.topics.includes(topic)) {
                signUpState.topics = signUpState.topics.filter(t => t !== topic);
                btn.classList.remove('selected');
                btn.textContent = topic;
            } else {
                signUpState.topics.push(topic);
                btn.classList.add('selected');
                btn.textContent = `✓ ${topic}`;
            }

            if (signUpState.topics.length > 0) {
                finishBtn.classList.add('enabled');
            } else {
                finishBtn.classList.remove('enabled');
            }
        });
    });

    finishBtn?.addEventListener('click', () => {
        if (finishBtn.classList.contains('enabled')) {
            authState.login(signUpState.username);
            modal.classList.remove('active');
            showToast(`Welcome to Reddit, u/${signUpState.username}!`);
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
