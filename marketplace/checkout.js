/**
 * Checkout JavaScript
 * Handles order details, payment processing, and Firebase integration
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDiQ-R5oJ124N3fhm9Nhs7sC5yJZQM43Ts",
    authDomain: "expoter-af015.firebaseapp.com",
    projectId: "expoter-af015",
    storageBucket: "expoter-af015.appspot.com",
    messagingSenderId: "1094581941288",
    appId: "1:1094581941288:web:43f872395cf17eafd1311d",
    measurementId: "G-GSYX71VGVF",
    databaseURL: "https://expoter-af015-default-rtdb.firebaseio.com/"
};

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

// Initialize Firebase
let firebaseApp, auth, database;
let importerApp, importerAuth, importerDatabase;
let currentUser = null;
let currentUserType = null;
let cart = [];
let orderData = {};
let uploadedDocuments = {};

// Initialize Firebase
try {
    try {
        firebaseApp = firebase.app();
    } catch (e) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    auth = firebaseApp.auth();
    database = firebaseApp.database();

    // Initialize importer Firebase
    try {
        importerApp = firebase.initializeApp(importerFirebaseConfig, 'importerApp');
        importerAuth = importerApp.auth();
        importerDatabase = importerApp.database();
    } catch (e) {
        console.warn('Importer Firebase already initialized or error:', e);
        importerApp = firebase.app('importerApp');
        importerAuth = importerApp.auth();
        importerDatabase = importerApp.database();
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Check authentication state - wait for both auth instances
let authChecked = false;
let exporterAuthChecked = false;
let importerAuthChecked = false;

function checkAuthAndLoadCart() {
    if (authChecked) return;
    
    // Check exporter auth first
    if (auth) {
        const exporterUser = auth.currentUser;
        if (exporterUser) {
            currentUser = exporterUser;
            currentUserType = 'exporter';
            authChecked = true;
            loadCart();
            return;
        }
    }
    
    // Check importer auth
    if (importerAuth) {
        const importerUser = importerAuth.currentUser;
        if (importerUser) {
            currentUser = importerUser;
            currentUserType = 'importer';
            authChecked = true;
            loadCart();
            return;
        }
    }
    
    // If both checked and no user, redirect
    if (exporterAuthChecked && importerAuthChecked && !currentUser) {
        showToast('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = 'marketplace.html';
        }, 2000);
    }
}

// Listen to exporter auth state
auth?.onAuthStateChanged((user) => {
    exporterAuthChecked = true;
    if (user) {
        currentUser = user;
        currentUserType = 'exporter';
        authChecked = true;
        loadCart();
    } else {
        checkAuthAndLoadCart();
    }
});

// Listen to importer auth state
importerAuth?.onAuthStateChanged((importerUser) => {
    importerAuthChecked = true;
    if (importerUser) {
        currentUser = importerUser;
        currentUserType = 'importer';
        authChecked = true;
        loadCart();
    } else {
        checkAuthAndLoadCart();
    }
});

// Also check immediately in case auth is already established
setTimeout(() => {
    if (!authChecked) {
        checkAuthAndLoadCart();
    }
}, 500);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupFileUploads();
    setupPaymentMethodToggle();
    setupCardInputFormatting();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Order details form
    const orderDetailsForm = document.getElementById('orderDetailsForm');
    if (orderDetailsForm) {
        orderDetailsForm.addEventListener('submit', handleOrderDetailsSubmit);
    }

    // Payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    // Billing address checkbox
    const sameAsShipping = document.getElementById('sameAsShipping');
    if (sameAsShipping) {
        sameAsShipping.addEventListener('change', (e) => {
            const billingSection = document.getElementById('billingAddressSection');
            if (billingSection) {
                billingSection.style.display = e.target.checked ? 'none' : 'block';
            }
        });
    }
}

/**
 * Setup file uploads
 */
function setupFileUploads() {
    const fileInputs = ['idProof', 'businessLicense', 'taxDocument', 'importLicense'];
    
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const display = document.getElementById(`${inputId}Display`);
        
        if (input && display) {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file size (max 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        showToast('File size must be less than 10MB', 'error');
                        input.value = '';
                        display.innerHTML = '<span>No file selected</span>';
                        display.classList.remove('has-file');
                        return;
                    }

                    // Validate file type
                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                    if (!allowedTypes.includes(file.type)) {
                        showToast('Please upload PDF, JPG, or PNG files only', 'error');
                        input.value = '';
                        display.innerHTML = '<span>No file selected</span>';
                        display.classList.remove('has-file');
                        return;
                    }

                    display.innerHTML = `<span>📄 ${file.name} (${formatFileSize(file.size)})</span>`;
                    display.classList.add('has-file');

                    // Convert to Base64
                    try {
                        const base64 = await fileToBase64(file);
                        uploadedDocuments[inputId] = {
                            base64: base64,
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size
                        };
                    } catch (error) {
                        console.error('Error converting file to Base64:', error);
                        showToast('Error processing file. Please try again.', 'error');
                    }
                } else {
                    display.innerHTML = '<span>No file selected</span>';
                    display.classList.remove('has-file');
                    delete uploadedDocuments[inputId];
                }
            });
        }
    });
}

/**
 * Convert file to Base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data:type;base64, prefix if present
            const base64 = reader.result.split(',')[1] || reader.result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Setup payment method toggle
 */
function setupPaymentMethodToggle() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethods.forEach(radio => {
        radio.addEventListener('change', (e) => {
            showPaymentForm(e.target.value);
        });
    });
}

/**
 * Show appropriate payment form based on selected method
 */
function showPaymentForm(method) {
    // Hide all payment forms
    const forms = ['cardPaymentForm', 'upiPaymentForm', 'netBankingForm', 'walletForm', 'bankTransferForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.style.display = 'none';
    });

    // Show relevant form and make fields required/not required
    switch (method) {
        case 'creditCard':
        case 'debitCard':
            const cardForm = document.getElementById('cardPaymentForm');
            if (cardForm) {
                cardForm.style.display = 'block';
                setRequiredFields(['cardNumber', 'cardExpiry', 'cardCVV', 'cardName'], true);
            }
            break;
        case 'upi':
            const upiForm = document.getElementById('upiPaymentForm');
            if (upiForm) {
                upiForm.style.display = 'block';
                setRequiredFields(['upiId'], true);
            }
            break;
        case 'netBanking':
            const netBankingForm = document.getElementById('netBankingForm');
            if (netBankingForm) {
                netBankingForm.style.display = 'block';
                setRequiredFields(['bankName', 'accountNumber'], true);
            }
            break;
        case 'wallet':
            const walletForm = document.getElementById('walletForm');
            if (walletForm) {
                walletForm.style.display = 'block';
                setRequiredFields(['walletType', 'walletEmail'], true);
            }
            break;
        case 'bankTransfer':
            const bankTransferForm = document.getElementById('bankTransferForm');
            if (bankTransferForm) {
                bankTransferForm.style.display = 'block';
                setRequiredFields(['transferType', 'transferReference'], true);
            }
            break;
    }
}

/**
 * Set required fields
 */
function setRequiredFields(fieldIds, required) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.required = required;
        }
    });
}

/**
 * Setup card input formatting
 */
function setupCardInputFormatting() {
    // Card number formatting
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }

    // Expiry date formatting
    const cardExpiry = document.getElementById('cardExpiry');
    if (cardExpiry) {
        cardExpiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // CVV formatting (numbers only)
    const cardCVV = document.getElementById('cardCVV');
    if (cardCVV) {
        cardCVV.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
}

/**
 * Load cart from Firebase with fallback to localStorage
 */
async function loadCart() {
    if (!currentUser || !currentUserType) {
        // Try to load from localStorage as fallback
        try {
            const savedCart = localStorage.getItem('checkout_cart');
            if (savedCart) {
                cart = JSON.parse(savedCart);
                if (cart.length > 0) {
                    updateOrderSummary();
                    return;
                }
            }
        } catch (e) {
            console.warn('Error loading cart from localStorage:', e);
        }
        
        cart = [];
        updateOrderSummary();
        return;
    }

    try {
        const db = currentUserType === 'exporter' ? database : importerDatabase;
        if (!db) {
            console.warn('Database not initialized');
            // Try localStorage fallback
            tryLoadCartFromLocalStorage();
            return;
        }

        // Verify user is authenticated
        const currentAuth = currentUserType === 'exporter' ? auth : importerAuth;
        if (!currentAuth || !currentAuth.currentUser) {
            console.warn('User not authenticated');
            tryLoadCartFromLocalStorage();
            return;
        }

        const snapshot = await db.ref(`users/${currentUser.uid}/cart`).once('value');
        const cartData = snapshot.val();
        
        if (cartData) {
            if (Array.isArray(cartData)) {
                cart = cartData;
            } else {
                cart = Object.values(cartData);
            }
        } else {
            cart = [];
        }
        
        // Save to localStorage as backup
        if (cart.length > 0) {
            try {
                localStorage.setItem('checkout_cart', JSON.stringify(cart));
            } catch (e) {
                console.warn('Could not save cart to localStorage:', e);
            }
        }
        
        if (cart.length === 0) {
            showToast('Your cart is empty', 'error');
            setTimeout(() => {
                window.location.href = 'marketplace.html';
            }, 2000);
            return;
        }
        
        updateOrderSummary();
    } catch (error) {
        console.error('Error loading cart:', error);
        
        // If permission denied, try localStorage fallback
        if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
            console.warn('Permission denied. Trying localStorage fallback...');
            tryLoadCartFromLocalStorage();
            
            if (cart.length === 0) {
                showToast('Unable to access cart. Please check Firebase security rules or try again.', 'error');
                setTimeout(() => {
                    window.location.href = 'marketplace.html';
                }, 3000);
            }
        } else {
            cart = [];
            if (cart.length === 0) {
                showToast('Error loading cart. Redirecting to marketplace...', 'error');
                setTimeout(() => {
                    window.location.href = 'marketplace.html';
                }, 2000);
            }
            updateOrderSummary();
        }
    }
}

/**
 * Try to load cart from localStorage as fallback
 */
function tryLoadCartFromLocalStorage() {
    try {
        const savedCart = localStorage.getItem('checkout_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            if (cart.length > 0) {
                updateOrderSummary();
                showToast('Loaded cart from local storage', 'success');
                return true;
            }
        }
    } catch (e) {
        console.warn('Error loading cart from localStorage:', e);
    }
    cart = [];
    updateOrderSummary();
    return false;
}

/**
 * Update order summary
 */
function updateOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const taxEl = document.getElementById('tax');
    const orderTotalEl = document.getElementById('orderTotal');

    if (!orderItems) return;

    if (cart.length === 0) {
        orderItems.innerHTML = '<p>No items in cart</p>';
        return;
    }

    // Render cart items
    orderItems.innerHTML = cart.map(item => {
        const imageSrc = getProductImageSrc(item) || 'https://via.placeholder.com/80x80?text=No+Image';
        const price = (item.price || 0) * (item.quantity || 1);
        const currency = item.currency || 'USD';
        
        return `
            <div class="order-item">
                <img src="${imageSrc}" alt="${escapeHtml(item.name || 'Product')}" class="order-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                <div class="order-item-info">
                    <div class="order-item-name">${escapeHtml(item.name || 'Unnamed Product')}</div>
                    <div class="order-item-quantity">Quantity: ${item.quantity || 1}</div>
                    <div class="order-item-price">${currency} ${price.toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const shipping = subtotal > 1000 ? 0 : 50; // Free shipping over $1000
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + shipping + tax;

    const currency = cart[0]?.currency || 'USD';

    if (subtotalEl) subtotalEl.textContent = `${currency} ${subtotal.toLocaleString()}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Free' : `${currency} ${shipping.toLocaleString()}`;
    if (taxEl) taxEl.textContent = `${currency} ${tax.toLocaleString()}`;
    if (orderTotalEl) orderTotalEl.textContent = `${currency} ${total.toLocaleString()}`;

    // Store totals in orderData
    orderData.totals = {
        subtotal,
        shipping,
        tax,
        total,
        currency
    };
}

/**
 * Get product image source
 */
function getProductImageSrc(item) {
    let imageBase64 = item.imageBase64 || item.image || '';
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
        return imageBase64;
    }
    
    if (imageBase64) {
        const imageFileType = item.imageFileType || 'image/jpeg';
        return `data:${imageFileType};base64,${imageBase64}`;
    }
    
    return null;
}

/**
 * Escape HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Handle order details form submit
 */
async function handleOrderDetailsSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        showToast('Please login to continue', 'error');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);

    // Collect order details
    orderData.orderDetails = {
        contactInfo: {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            alternatePhone: formData.get('alternatePhone') || null
        },
        shippingAddress: {
            addressLine1: formData.get('addressLine1'),
            addressLine2: formData.get('addressLine2') || null,
            city: formData.get('city'),
            state: formData.get('state'),
            postalCode: formData.get('postalCode'),
            country: formData.get('country')
        },
        documents: uploadedDocuments,
        specialInstructions: formData.get('specialInstructions') || null,
        createdAt: new Date().toISOString()
    };

    // Validate required documents
    if (!uploadedDocuments.idProof) {
        showToast('Please upload a government ID proof', 'error');
        return;
    }

    // Move to payment step
    goToStep(2);
}

/**
 * Handle payment form submit
 */
async function handlePaymentSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        showToast('Please login to continue', 'error');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const paymentMethod = formData.get('paymentMethod');

    // Collect payment details
    const paymentData = {
        method: paymentMethod,
        details: {}
    };

    // Collect method-specific details
    switch (paymentMethod) {
        case 'creditCard':
        case 'debitCard':
            paymentData.details = {
                cardNumber: formData.get('cardNumber'),
                cardExpiry: formData.get('cardExpiry'),
                cardCVV: formData.get('cardCVV'),
                cardName: formData.get('cardName'),
                cardType: paymentMethod === 'creditCard' ? 'credit' : 'debit'
            };
            break;
        case 'upi':
            paymentData.details = {
                upiId: formData.get('upiId'),
                upiApp: formData.get('upiApp')
            };
            break;
        case 'netBanking':
            paymentData.details = {
                bankName: formData.get('bankName'),
                accountNumber: formData.get('accountNumber')
            };
            break;
        case 'wallet':
            paymentData.details = {
                walletType: formData.get('walletType'),
                walletEmail: formData.get('walletEmail')
            };
            break;
        case 'bankTransfer':
            paymentData.details = {
                transferType: formData.get('transferType'),
                transferReference: formData.get('transferReference')
            };
            break;
    }

    // Mask sensitive information before storing
    if (paymentData.details.cardNumber) {
        const cardNumber = paymentData.details.cardNumber.replace(/\s/g, '');
        paymentData.details.cardNumber = '**** **** **** ' + cardNumber.slice(-4);
    }
    if (paymentData.details.cardCVV) {
        paymentData.details.cardCVV = '***';
    }
    if (paymentData.details.accountNumber) {
        paymentData.details.accountNumber = '****' + paymentData.details.accountNumber;
    }

    orderData.payment = paymentData;
    orderData.status = 'pending';
    orderData.items = cart;
    orderData.userId = currentUser.uid;
    orderData.userType = currentUserType;
    orderData.orderId = generateOrderId();

    // Show loading state
    const submitBtn = document.getElementById('submitPaymentBtn');
    if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    }

    try {
        // Save order to Firebase
        await saveOrderToFirebase();

        // Clear cart
        await clearCart();

        // Show success modal
        showSuccessModal(orderData.orderId);

    } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Error processing payment. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
}

/**
 * Save order to Firebase
 */
async function saveOrderToFirebase() {
    if (!currentUser || !currentUserType) {
        throw new Error('User not authenticated');
    }

    const db = currentUserType === 'exporter' ? database : importerDatabase;
    if (!db) {
        throw new Error('Database not initialized');
    }

    // Save order to users/{uid}/orders/{orderId}
    const orderPath = `users/${currentUser.uid}/orders/${orderData.orderId}`;
    await db.ref(orderPath).set(orderData);

    // Also save to orders collection for admin access
    const ordersPath = `orders/${orderData.orderId}`;
    await db.ref(ordersPath).set({
        ...orderData,
        userId: currentUser.uid,
        userType: currentUserType,
        userEmail: currentUser.email
    });

    console.log('Order saved to Firebase:', orderData.orderId);
}

/**
 * Clear cart after order
 */
async function clearCart() {
    if (!currentUser || !currentUserType) return;

    try {
        const db = currentUserType === 'exporter' ? database : importerDatabase;
        if (!db) return;

        await db.ref(`users/${currentUser.uid}/cart`).set([]);
        cart = [];
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
}

/**
 * Generate unique order ID
 */
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

/**
 * Go to step
 */
function goToStep(step) {
    // Update progress
    document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
        if (index + 1 <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });

    // Update forms
    document.querySelectorAll('.checkout-step').forEach(form => {
        if (parseInt(form.dataset.step) === step) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });

    // Show appropriate payment form
    if (step === 2) {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (selectedMethod) {
            showPaymentForm(selectedMethod.value);
        }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show success modal
 */
function showSuccessModal(orderId) {
    const modal = document.getElementById('successModal');
    const orderIdDisplay = document.getElementById('orderIdDisplay');
    
    if (orderIdDisplay) {
        orderIdDisplay.textContent = orderId;
    }
    
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * View order details
 */
function viewOrderDetails() {
    // Redirect to dashboard or order details page
    if (currentUserType === 'exporter') {
        window.location.href = '../Export-Dashboard/export-dashboard.html';
    } else {
        window.location.href = '../Impoter-Dashboard/impoter-dashboard.html';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('checkoutToast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

