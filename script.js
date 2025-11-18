/**
 * GlobalGuard Exports - Main JavaScript
 * Handles navigation, animations, and interactive features
 */

(function() {
    'use strict';

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Throttle function to limit how often a function can be called
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Debounce function to delay function execution
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================
    // NAVBAR FUNCTIONALITY
    // ============================================

    const navbar = document.querySelector('.navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    /**
     * Toggle mobile menu
     */
    function toggleMobileMenu() {
        const isActive = navMenu.classList.contains('active');
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', !isActive);
        
        // Prevent body scroll when menu is open
        if (!isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close mobile menu
     */
    function closeMobileMenu() {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    // Event listeners for mobile menu
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }

    // Close menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !hamburger.contains(e.target)) {
            closeMobileMenu();
        }
    });

    /**
     * Handle navbar scroll effect
     */
    function handleNavbarScroll() {
        const scrollY = window.pageYOffset;
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // Throttled scroll handler for better performance
    window.addEventListener('scroll', throttle(handleNavbarScroll, 100));

    // ============================================
    // SMOOTH SCROLLING
    // ============================================

    /**
     * Smooth scroll to target element
     */
    function smoothScrollTo(target) {
        if (!target) return;
        
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }

    // Smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#contact') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                smoothScrollTo(target);
            }
        });
    });

    // ============================================
    // INTERSECTION OBSERVER FOR ANIMATIONS
    // ============================================

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after animation to improve performance
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    /**
     * Initialize scroll animations
     */
    function initScrollAnimations() {
        const serviceCards = document.querySelectorAll('.service-card');
        const aboutTexts = document.querySelectorAll('.about-text');
        
        // Observe service cards with staggered delay
        serviceCards.forEach((card, index) => {
            observer.observe(card);
        });
        
        // Observe about texts
        aboutTexts.forEach((text) => {
            observer.observe(text);
        });
    }

    // ============================================
    // ACTIVE NAVIGATION LINK HIGHLIGHTING
    // ============================================

    const sections = document.querySelectorAll('section[id]');

    /**
     * Update active navigation link based on scroll position
     */
    function updateActiveNavLink() {
        const scrollY = window.pageYOffset + 100;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // Throttled scroll handler for active link highlighting
    window.addEventListener('scroll', throttle(updateActiveNavLink, 150));

    // ============================================
    // BUTTON INTERACTIONS
    // ============================================

    /**
     * Add ripple effect to buttons
     */
    function createRipple(e, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Initialize button handlers
     */
    function initButtonHandlers() {
        // Primary buttons (Get Started, Start Hedging)
        document.querySelectorAll('.btn-primary, .btn-get-started').forEach(button => {
            button.addEventListener('click', function(e) {
                createRipple(e, this);
                // Add your action here (e.g., redirect to signup page)
                console.log('Primary action triggered');
                // Example: window.location.href = 'signup.html';
            });
        });

        // Secondary buttons (Explore Services)
        document.querySelectorAll('.btn-secondary').forEach(button => {
            button.addEventListener('click', function(e) {
                createRipple(e, this);
                const servicesSection = document.getElementById('services');
                if (servicesSection) {
                    smoothScrollTo(servicesSection);
                }
            });
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize all functionality when DOM is ready
     */
    function init() {
        initScrollAnimations();
        initButtonHandlers();
        handleNavbarScroll(); // Check initial scroll position
        updateActiveNavLink(); // Set initial active link
    }

    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // KEYBOARD NAVIGATION SUPPORT
    // ============================================

    // Close mobile menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // ============================================
    // PERFORMANCE OPTIMIZATIONS
    // ============================================

    // Preload critical resources
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // Any non-critical initialization can go here
        });
    }

})();

// ============================================
// FIREBASE AUTHENTICATION
// ============================================

// Firebase Configuration
// NOTE: Replace these with your actual Firebase config values
const exporterFirebaseConfig = {
    apiKey: "AIzaSyDiQ-R5oJ124N3fhm9Nhs7sC5yJZQM43Ts",
    authDomain: "expoter-af015.firebaseapp.com",
    projectId: "expoter-af015",
    storageBucket: "expoter-af015.firebasestorage.app",
    messagingSenderId: "1094581941288",
    appId: "1:1094581941288:web:43f872395cf17eafd1311d",
    measurementId: "G-GSYX71VGVF"
};

// Dedicated Importer Firebase project (placeholder values)
// TODO: Replace with live importer Firebase project credentials
const importerFirebaseConfig = {
    apiKey: "AIzaSyAR-xJ3WZsw8m9ZE97hDRiHFaU0Uilq9Lw",
    authDomain: "impoter-9e6bf.firebaseapp.com",
    databaseURL: "https://impoter-9e6bf-default-rtdb.firebaseio.com",
    projectId: "impoter-9e6bf",
    storageBucket: "impoter-9e6bf.firebasestorage.app",
    messagingSenderId: "663462993062",
    appId: "1:663462993062:web:be35a602082d488315e867",
    measurementId: "G-7ZHY799QTS"
};

// Initialize Firebase instances for exporter and importer
const firebaseApps = {};
const authInstances = {};
const redirectTargets = {
    exporter: 'Export-Dashboard/export-dashboard.html',
    importer: 'Impoter-Dashboard/impoter-dashboard.html'
};

let currentUserType = 'exporter';
let currentAuthTab = 'login';

function initializeFirebaseApp(config, name) {
    try {
        if (name) {
            const existing = firebase.apps.find(app => app.name === name);
            return existing || firebase.initializeApp(config, name);
        }
        if (firebase.apps.length) {
            return firebase.app();
        }
        return firebase.initializeApp(config);
    } catch (error) {
        console.warn(`Firebase initialization error for ${name || 'default app'}. Please configure Firebase credentials:`, error);
        return null;
    }
}

firebaseApps.exporter = initializeFirebaseApp(exporterFirebaseConfig);
firebaseApps.importer = initializeFirebaseApp(importerFirebaseConfig, 'importerApp');

if (firebaseApps.exporter) {
    authInstances.exporter = firebaseApps.exporter.auth();
}

if (firebaseApps.importer) {
    authInstances.importer = firebaseApps.importer.auth();
}

function getAuthInstance(userType = 'exporter') {
    const auth = authInstances[userType];
    if (!auth) {
        console.warn(`Firebase auth not configured for ${userType}.`);
        // Try to initialize if not already done
        if (userType === 'exporter' && !firebaseApps.exporter) {
            firebaseApps.exporter = initializeFirebaseApp(exporterFirebaseConfig);
            if (firebaseApps.exporter) {
                authInstances.exporter = firebaseApps.exporter.auth();
                return authInstances.exporter;
            }
        } else if (userType === 'importer' && !firebaseApps.importer) {
            firebaseApps.importer = initializeFirebaseApp(importerFirebaseConfig, 'importerApp');
            if (firebaseApps.importer) {
                authInstances.importer = firebaseApps.importer.auth();
                return authInstances.importer;
            }
        }
    }
    return auth;
}

// ============================================
// AUTH MODAL FUNCTIONALITY
// ============================================

let otpConfirmationResult = null;
let otpSent = false;

/**
 * Open authentication modal
 */
function openAuthModal(tab = 'login', userType = 'exporter') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Switch to specified tab
    switchUserType(userType);
    switchAuthTab(tab);
    
    // Focus management
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 300);
}

/**
 * Close authentication modal
 */
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Reset forms
    resetAuthForms();
    switchUserType('exporter');
    switchAuthTab('login');
}

/**
 * Switch between login and signup tabs
 */
function switchAuthTab(tab, options = {}) {
    currentAuthTab = tab;
    const loginTabBtn = document.querySelector('[data-tab="login"]');
    const signupTabBtn = document.querySelector('[data-tab="signup"]');

    loginTabBtn?.classList.toggle('active', tab === 'login');
    signupTabBtn?.classList.toggle('active', tab === 'signup');

    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    const targetForms = {
        exporter: {
            login: 'loginForm',
            signup: 'signupForm'
        },
        importer: {
            login: 'importerLoginForm',
            signup: 'importerSignupForm'
        }
    };

    const targetId = targetForms[currentUserType]?.[tab];
    if (targetId) {
        document.getElementById(targetId)?.classList.add('active');
    }

    if (!options.skipReset) {
        resetAuthForms();
    }
}

/**
 * Switch between email and OTP login methods
 */
function switchLoginMethod(method) {
    const emailForm = document.getElementById('emailLoginForm');
    const otpForm = document.getElementById('otpLoginForm');
    const emailBtn = document.querySelector('[data-method="email"]');
    const otpBtn = document.querySelector('[data-method="otp"]');
    
    if (method === 'email') {
        emailForm?.classList.add('active');
        otpForm?.classList.remove('active');
        emailBtn?.classList.add('active');
        otpBtn?.classList.remove('active');
    } else {
        otpForm?.classList.add('active');
        emailForm?.classList.remove('active');
        otpBtn?.classList.add('active');
        emailBtn?.classList.remove('active');
    }
    
    // Reset OTP form
    otpSent = false;
    const otpCodeGroup = document.getElementById('otpCodeGroup');
    const otpBtnText = document.getElementById('otpBtnText');
    if (otpCodeGroup) otpCodeGroup.style.display = 'none';
    if (otpBtnText) otpBtnText.textContent = 'Send OTP';
}

function switchUserType(userType) {
    currentUserType = userType;

    document.querySelectorAll('.user-type-btn').forEach(button => {
        const isActive = button.dataset.user === userType;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.auth-user-type-section').forEach(section => {
        section.classList.toggle('active', section.dataset.user === userType);
    });

    switchAuthTab(currentAuthTab, { skipReset: true });
    resetAuthForms();
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input?.parentElement.querySelector('.password-toggle');
    if (!input || !toggle) return;
    
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // Update icon (you can enhance this with different icons)
    const svg = toggle.querySelector('svg');
    if (svg) {
        if (type === 'text') {
            svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    }
}

/**
 * Check password strength
 */
function checkPasswordStrength(password, indicatorId = 'passwordStrength') {
    const strengthIndicator = document.getElementById(indicatorId);
    if (!strengthIndicator) return;
    
    if (!password) {
        strengthIndicator.className = 'password-strength';
        return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    
    strengthIndicator.className = 'password-strength';
    if (strength <= 2) {
        strengthIndicator.classList.add('weak');
    } else if (strength === 3) {
        strengthIndicator.classList.add('medium');
    } else {
        strengthIndicator.classList.add('strong');
    }
}

// Add password strength checker to signup password field
document.addEventListener('DOMContentLoaded', () => {
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value, 'passwordStrength');
        });
    }

    const importerPassword = document.getElementById('importerPassword');
    if (importerPassword) {
        importerPassword.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value, 'importerPasswordStrength');
        });
    }
});

/**
 * Show auth message
 */
function showAuthMessage(message, type = 'info') {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    
    // Check if message contains HTML tags
    const containsHTML = /<[a-z][\s\S]*>/i.test(message);
    if (containsHTML) {
        messageEl.innerHTML = message;
    } else {
        messageEl.textContent = message;
    }
    
    messageEl.className = `auth-message ${type} show`;
    
    // Auto-hide after 8 seconds for error messages with links
    const hideDelay = (type === 'error' && containsHTML) ? 8000 : 5000;
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, hideDelay);
}

/**
 * Reset all auth forms
 */
function resetAuthForms() {
    document.querySelectorAll('#authModal form').forEach(form => {
        form.reset();
    });
    
    // Reset OTP state
    otpSent = false;
    otpConfirmationResult = null;
    const otpCodeGroup = document.getElementById('otpCodeGroup');
    const otpBtnText = document.getElementById('otpBtnText');
    if (otpCodeGroup) otpCodeGroup.style.display = 'none';
    if (otpBtnText) otpBtnText.textContent = 'Send OTP';
    
    // Reset password strength
    ['passwordStrength', 'importerPasswordStrength'].forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) indicator.className = 'password-strength';
    });
    
    // Clear messages
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.classList.remove('show');
        messageEl.textContent = '';
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// ============================================
// FIREBASE AUTHENTICATION HANDLERS
// ============================================

/**
 * Handle email/password login
 */
async function handleEmailLogin(event, userType = currentUserType) {
    event.preventDefault();

    const auth = getAuthInstance(userType);
    if (!auth) {
        console.error(`Firebase auth not available for ${userType}`);
        showAuthMessage(`Firebase is not configured for ${userType}. Please add your Firebase credentials.`, 'error');
        return;
    }
    
    // Verify Firebase is properly initialized
    if (!firebase || !firebase.apps || firebase.apps.length === 0) {
        console.error('Firebase not initialized');
        showAuthMessage('Firebase is not initialized. Please refresh the page and try again.', 'error');
        return;
    }
    
    const form = event.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    const buttonId = userType === 'importer' ? 'importerEmailLoginBtn' : 'emailLoginBtn';
    
    setButtonLoading(buttonId, true);
    showAuthMessage('', 'info');
    
    try {
        // Validate inputs
        if (!email || !email.trim()) {
            showAuthMessage('Please enter your email address', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        if (!password || !password.trim()) {
            showAuthMessage('Please enter your password', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Check if input is email or username
        let emailToUse = email.trim();
        if (!emailToUse.includes('@')) {
            // If it's a username, you might want to look it up in Firestore
            // For now, we'll treat it as an email or show an error
            showAuthMessage('Please use your email address to login', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToUse)) {
            showAuthMessage('Please enter a valid email address', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Validate password length
        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters long', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(emailToUse, password);
        showAuthMessage('Login successful! Redirecting...', 'success');
        
        // Store user data if needed
        const user = userCredential.user;
        console.log('User logged in:', user);
        
        // Redirect or update UI
        setTimeout(() => {
            closeAuthModal();
            const redirectTo = redirectTargets[userType] || redirectTargets.exporter;
            window.location.href = redirectTo;
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Login failed. Please try again.';
        let showSignupLink = false;
        let showForgotPasswordLink = false;
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                showSignupLink = true;
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please check your password and try again.';
                showForgotPasswordLink = true;
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format. Please enter a valid email address.';
                break;
            case 'auth/invalid-credential':
                // This error can mean either wrong password or user doesn't exist
                // We'll show a helpful message with both options
                errorMessage = 'Invalid email or password. Please check your credentials.';
                showSignupLink = true;
                showForgotPasswordLink = true;
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support for assistance.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed login attempts. Please wait a few minutes before trying again, or reset your password.';
                showForgotPasswordLink = true;
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            case 'auth/internal-error':
                errorMessage = 'An internal error occurred. Please try again later.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password authentication is not enabled. Please contact support.';
                break;
            default:
                // For unknown errors, show a generic message
                if (error.message) {
                    errorMessage = `Login failed: ${error.message}`;
                }
        }
        
        // Show error message with helpful links
        let messageHTML = errorMessage;
        if (showSignupLink || showForgotPasswordLink) {
            messageHTML += '<div style="margin-top: 10px; font-size: 14px;">';
            if (showSignupLink) {
                messageHTML += `<a href="#" onclick="event.preventDefault(); switchAuthTab('signup'); return false;" style="color: #3b82f6; text-decoration: underline; margin-right: 15px;">Don't have an account? Sign up</a>`;
            }
            if (showForgotPasswordLink) {
                messageHTML += `<a href="#" onclick="event.preventDefault(); handleForgotPassword(event, '${userType}'); return false;" style="color: #3b82f6; text-decoration: underline;">Forgot password?</a>`;
            }
            messageHTML += '</div>';
        }
        
        showAuthMessage(messageHTML, 'error');
    } finally {
        setButtonLoading(buttonId, false);
    }
}

/**
 * Handle OTP login
 */
async function handleOTPLogin(event) {
    event.preventDefault();
    
    const auth = getAuthInstance('exporter');
    if (!auth) {
        showAuthMessage('Firebase is not configured. Please add your Firebase credentials.', 'error');
        return;
    }
    
    const form = event.target;
    const emailOrPhone = form.otpEmail.value.trim();
    const otpCode = form.otpCode?.value.trim();
    const button = document.getElementById('otpLoginBtn');
    const otpCodeGroup = document.getElementById('otpCodeGroup');
    const otpBtnText = document.getElementById('otpBtnText');
    
    setButtonLoading('otpLoginBtn', true);
    showAuthMessage('', 'info');
    
    try {
        if (!otpSent) {
            // Send OTP
            const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('otpLoginBtn', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved
                }
            });
            
            // Check if email or phone
            if (emailOrPhone.includes('@')) {
                // Email OTP
                const actionCodeSettings = {
                    url: window.location.href,
                    handleCodeInApp: true,
                };
                
                await auth.sendSignInLinkToEmail(emailOrPhone, actionCodeSettings);
                showAuthMessage('Sign-in link sent to your email!', 'success');
            } else {
                // Phone OTP
                const phoneNumber = emailOrPhone.startsWith('+') ? emailOrPhone : `+${emailOrPhone}`;
                otpConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
                
                otpSent = true;
                if (otpCodeGroup) otpCodeGroup.style.display = 'block';
                if (otpBtnText) otpBtnText.textContent = 'Verify OTP';
                showAuthMessage('OTP sent to your phone!', 'success');
            }
        } else {
            // Verify OTP
            if (!otpCode || otpCode.length !== 6) {
                showAuthMessage('Please enter the 6-digit OTP', 'error');
                setButtonLoading('otpLoginBtn', false);
                return;
            }
            
            if (otpConfirmationResult) {
                const userCredential = await otpConfirmationResult.confirm(otpCode);
                showAuthMessage('Login successful! Redirecting...', 'success');
                
                const user = userCredential.user;
                console.log('User logged in:', user);
                
                setTimeout(() => {
                    closeAuthModal();
                    window.location.href = 'Export-Dashboard/export-dashboard.html';
                }, 1500);
            }
        }
    } catch (error) {
        console.error('OTP login error:', error);
        let errorMessage = 'OTP verification failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-phone-number':
                errorMessage = 'Invalid phone number format.';
                break;
            case 'auth/invalid-verification-code':
                errorMessage = 'Invalid OTP code. Please try again.';
                break;
            case 'auth/code-expired':
                errorMessage = 'OTP code has expired. Please request a new one.';
                break;
        }
        
        showAuthMessage(errorMessage, 'error');
        otpSent = false;
        if (otpCodeGroup) otpCodeGroup.style.display = 'none';
        if (otpBtnText) otpBtnText.textContent = 'Send OTP';
    } finally {
        setButtonLoading('otpLoginBtn', false);
    }
}

/**
 * Handle signup
 */
async function handleSignup(event, userType = currentUserType) {
    event.preventDefault();

    const auth = getAuthInstance(userType);
    if (!auth) {
        showAuthMessage(`Firebase is not configured for ${userType}. Please add your Firebase credentials.`, 'error');
        return;
    }
    
    const form = event.target;
    const name = form.name.value.trim();
    const company = form.company.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const country = form.country.value;
    const address = form.address.value.trim();
    const phone = form.phone ? form.phone.value.trim() : '';
    const registration = form.registration ? form.registration.value.trim() : '';
    
    const buttonId = userType === 'importer' ? 'importerSignupBtn' : 'signupBtn';
    setButtonLoading(buttonId, true);
    showAuthMessage('', 'info');
    
    try {
        // Validate inputs
        if (!email || !email.trim()) {
            showAuthMessage('Please enter your email address', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        if (!password || !password.trim()) {
            showAuthMessage('Please enter a password', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAuthMessage('Please enter a valid email address', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Validate password length
        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters long', 'error');
            setButtonLoading(buttonId, false);
            return;
        }
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: name
        });
        
        // Store additional user data in Firestore (if you have Firestore set up)
        // You would need to add Firestore SDK and initialize it
        // For now, we'll just log it
        const userData = {
            uid: user.uid,
            name: name,
            company: company,
            email: email,
            country: country,
            address: address,
            phone: phone,
            registration: registration,
            userType: userType,
            createdAt: new Date().toISOString()
        };
        
        console.log('User data to store:', userData);
        // TODO: Save to Firestore
        // await firestore.collection('users').doc(user.uid).set(userData);
        
        showAuthMessage('Account created successfully! Redirecting...', 'success');
        
        // Send email verification (optional)
        try {
            await user.sendEmailVerification();
        } catch (verificationError) {
            console.warn('Email verification error:', verificationError);
        }
        
        setTimeout(() => {
            closeAuthModal();
            const redirectTo = redirectTargets[userType] || redirectTargets.exporter;
            window.location.href = redirectTo;
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please login instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password (at least 6 characters).';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            case 'auth/internal-error':
                errorMessage = 'An internal error occurred. Please try again later.';
                break;
            default:
                // For unknown errors, show a generic message
                if (error.message) {
                    errorMessage = `Signup failed: ${error.message}`;
                }
        }
        
        showAuthMessage(errorMessage, 'error');
    } finally {
        setButtonLoading(buttonId, false);
    }
}

/**
 * Handle forgot password
 */
async function handleForgotPassword(event, userType = currentUserType) {
    event.preventDefault();

    const auth = getAuthInstance(userType);
    if (!auth) {
        showAuthMessage(`Firebase is not configured for ${userType}. Please add your Firebase credentials.`, 'error');
        return;
    }

    const emailInputId = userType === 'importer' ? 'importerLoginEmail' : 'loginEmail';
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput?.value.trim();

    if (!email || !email.includes('@')) {
        showAuthMessage('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAuthMessage('Password reset email sent! Please check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        }
        
        showAuthMessage(errorMessage, 'error');
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('authModal');
        if (modal && modal.classList.contains('active')) {
            closeAuthModal();
        }
    }
});

// Prevent modal from closing when clicking inside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('authModal');
    const container = document.querySelector('.auth-modal-container');
    
    if (modal && modal.classList.contains('active')) {
        if (e.target === modal || e.target.classList.contains('auth-modal-overlay')) {
            closeAuthModal();
        }
    }
});