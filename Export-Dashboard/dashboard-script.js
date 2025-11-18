/**
 * Export Dashboard - JavaScript
 * Handles dashboard functionality, Firebase integration, and profile management
 * 
 * FILE UPLOAD SYSTEM:
 * - All images and documents are converted to Base64 strings
 * - Base64 strings are stored directly in Firebase Realtime Database
 * - Images are automatically compressed (max 800x800, JPEG quality 0.7)
 * - Profile photos: users/{uid}/profilePhoto
 * - Documents: users/{uid}/documents/{docType}
 * 
 * NO FIREBASE STORAGE REQUIRED - All files stored as Base64 in Realtime Database
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyDiQ-R5oJ124N3fhm9Nhs7sC5yJZQM43Ts",
    authDomain: "expoter-af015.firebaseapp.com",
    projectId: "expoter-af015",
    storageBucket: "expoter-af015.appspot.com",
    messagingSenderId: "1094581941288",
    appId: "1:1094581941288:web:43f872395cf17eafd1311d",
    measurementId: "G-GSYX71VGVF",
    // Realtime Database URL - Get this from Firebase Console > Realtime Database
    // Format: https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/
    databaseURL: "https://expoter-af015-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
let firebaseApp, auth, database, firestore;
try {
    // Check if Firebase is already initialized (compat mode)
    try {
        firebaseApp = firebase.app();
    } catch (e) {
        // Firebase not initialized, initialize it
        firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth();
    database = firebase.database();
    firestore = firebase.firestore();
    
    console.log('Firebase initialized successfully with Realtime Database and Firestore');
} catch (error) {
    console.error('Firebase initialization error:', error);
    console.error('Error details:', error.message, error.code);
    console.warn('Note: Make sure Realtime Database and Firestore are enabled in Firebase Console');
}

// ============================================
// AUTHENTICATION CHECK
// ============================================

// Check if user is authenticated
auth?.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        loadUserData(user);
        updateProfileDisplay(user);
        // Set up real-time listeners after auth is confirmed
        checkEKYCStatus();
        listenForEKYCStatusChanges();
        ensureSupportChatListeners();
    } else {
        detachSupportChatListeners();
        // User is not signed in, redirect to login
        window.location.href = '../index.html';
    }
});

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    initializeSidebar();
    initializeNavigation();
    loadUserProfileData();
});

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    // Set active tab from URL hash or default to dashboard
    const hash = window.location.hash.substring(1) || 'dashboard';
    switchTab(hash);
}

/**
 * Initialize sidebar
 */
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar?.classList.toggle('active');
        });
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar?.classList.toggle('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 968) {
            if (sidebar?.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !mobileMenuToggle?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

/**
 * Initialize navigation
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            switchTab(tab);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Close sidebar on mobile
            if (window.innerWidth <= 968) {
                const sidebar = document.getElementById('sidebar');
                sidebar?.classList.remove('active');
            }
        });
    });
}

/**
 * Switch between dashboard tabs
 */
function switchTab(tabName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(`${tabName}Section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const titles = {
            dashboard: 'Dashboard',
            contracts: 'Forward Contracts',
            insurance: 'Insurance',
            products: 'Add Your Products',
            payments: 'Payments',
            documents: 'Documents',
            analytics: 'Analytics',
            support: 'Support',
            cart: 'My Cart'
        };
        pageTitle.textContent = titles[tabName] || 'Dashboard';
    }

    // Load cart if cart tab is selected
    if (tabName === 'cart') {
        loadExporterCart();
    }

    // Update URL hash
    window.location.hash = tabName;
}

// ============================================
// PROFILE MODAL
// ============================================

/**
 * Open profile modal
 */
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Load user data into forms
    loadUserProfileData();
}

/**
 * Close profile modal
 */
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

/**
 * Switch between profile tabs
 */
function switchProfileTab(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.profile-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update tab active state
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-section') === sectionName) {
            tab.classList.add('active');
        }
    });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('profileModal');
        if (modal && modal.classList.contains('active')) {
            closeProfileModal();
        }
    }
});

// ============================================
// USER DATA MANAGEMENT
// ============================================

/**
 * Load user data and update display
 */
function loadUserData(user) {
    if (!user) return;
    
    // Update welcome name
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
        welcomeName.textContent = user.displayName || user.email?.split('@')[0] || 'Exporter';
    }
    
    // Update profile display
    updateProfileDisplay(user);
}

/**
 * Update profile display in header
 */
function updateProfileDisplay(user) {
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (profileName) {
        profileName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    }
    
    if (avatarInitials) {
        const name = user.displayName || user.email || 'U';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        avatarInitials.textContent = initials;
    }
    
    // Load profile photo if available
    loadUserProfileData().then(() => {
        // Profile photo will be loaded from Realtime Database
    });
}

/**
 * Load user profile data from Realtime Database
 */
async function loadUserProfileData() {
    const user = auth?.currentUser;
    if (!user || !database) return;

    try {
        const userRef = database.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Populate Basic Information
            if (userData.fullName) document.getElementById('fullName').value = userData.fullName;
            if (userData.email) document.getElementById('email').value = userData.email;
            if (userData.phoneNumber) document.getElementById('phoneNumber').value = userData.phoneNumber;
            if (userData.alternatePhone) document.getElementById('alternatePhone').value = userData.alternatePhone;
            if (userData.profilePhoto) {
                const photoPreview = document.getElementById('photoPreviewImg');
                const photoPreviewText = document.getElementById('photoPreviewText');
                if (photoPreview) {
                    // Profile photo is now stored as Base64 string
                    photoPreview.src = userData.profilePhoto;
                    photoPreview.style.display = 'block';
                    if (photoPreviewText) {
                        photoPreviewText.style.display = 'none';
                    }
                }
                
                // Update avatar in header
                const profileAvatar = document.getElementById('profileAvatar');
                const avatarInitials = document.getElementById('avatarInitials');
                if (profileAvatar) {
                    profileAvatar.style.backgroundImage = `url(${userData.profilePhoto})`;
                    profileAvatar.style.backgroundSize = 'cover';
                    profileAvatar.style.backgroundPosition = 'center';
                    if (avatarInitials) {
                        avatarInitials.style.display = 'none';
                    }
                }
            }
            
            // Populate Business Details
            if (userData.companyName) document.getElementById('companyName').value = userData.companyName;
            if (userData.businessType) document.getElementById('businessType').value = userData.businessType;
            if (userData.yearEstablished) document.getElementById('yearEstablished').value = userData.yearEstablished;
            if (userData.businessCategory) document.getElementById('businessCategory').value = userData.businessCategory;
            if (userData.companyWebsite) document.getElementById('companyWebsite').value = userData.companyWebsite;
            if (userData.companyDescription) document.getElementById('companyDescription').value = userData.companyDescription;
            
            // Populate Compliance
            if (userData.iecNumber) document.getElementById('iecNumber').value = userData.iecNumber;
            if (userData.gstNumber) document.getElementById('gstNumber').value = userData.gstNumber;
            if (userData.panNumber) document.getElementById('panNumber').value = userData.panNumber;
            if (userData.cinNumber) document.getElementById('cinNumber').value = userData.cinNumber;
            if (userData.dgftRegion) document.getElementById('dgftRegion').value = userData.dgftRegion;
            
            // Populate Products
            if (userData.primaryProduct) document.getElementById('primaryProduct').value = userData.primaryProduct;
            if (userData.productCategory) document.getElementById('productCategory').value = userData.productCategory;
            if (userData.hsCode) document.getElementById('hsCode').value = userData.hsCode;
            if (userData.targetCountries && Array.isArray(userData.targetCountries)) {
                const select = document.getElementById('targetCountries');
                Array.from(select.options).forEach(option => {
                    if (userData.targetCountries.includes(option.value)) {
                        option.selected = true;
                    }
                });
            }
            if (userData.monthlyVolume) document.getElementById('monthlyVolume').value = userData.monthlyVolume;
            if (userData.shippingMethod) document.getElementById('shippingMethod').value = userData.shippingMethod;
            
            // Populate Address
            if (userData.businessAddress) document.getElementById('businessAddress').value = userData.businessAddress;
            if (userData.city) document.getElementById('city').value = userData.city;
            if (userData.state) document.getElementById('state').value = userData.state;
            if (userData.country) document.getElementById('country').value = userData.country;
            if (userData.pincode) document.getElementById('pincode').value = userData.pincode;
            
            // Populate Banking
            if (userData.bankName) document.getElementById('bankName').value = userData.bankName;
            if (userData.accountHolderName) document.getElementById('accountHolderName').value = userData.accountHolderName;
            if (userData.accountNumber) document.getElementById('accountNumber').value = userData.accountNumber;
            if (userData.ifscCode) document.getElementById('ifscCode').value = userData.ifscCode;
            if (userData.paymentMethod) document.getElementById('paymentMethod').value = userData.paymentMethod;
            
            // Populate Documents (Base64 strings)
            if (userData.documents) {
                Object.keys(userData.documents).forEach(docType => {
                    const preview = document.getElementById(`${docType}Preview`);
                    if (preview && userData.documents[docType]) {
                        const base64String = userData.documents[docType];
                        const fileName = userData.documents[`${docType}FileName`] || `${docType}.pdf`;
                        const fileType = userData.documents[`${docType}FileType`] || 'application/pdf';
                        
                        // Check if it's an image or document
                        if (fileType.startsWith('image/')) {
                            preview.innerHTML = `
                                <div style="margin-top: 8px;">
                                    <img src="${base64String}" alt="${docType}" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid var(--color-border);" />
                                    <br>
                                    <a href="${base64String}" download="${fileName}" style="color: var(--color-primary); text-decoration: none; font-size: 12px; margin-top: 4px; display: inline-block;">Download</a>
                                </div>
                            `;
                        } else {
                            preview.innerHTML = `
                                <div style="margin-top: 8px;">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="margin-bottom: 8px;">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                    </svg>
                                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px;">${fileName}</div>
                                    <a href="${base64String}" download="${fileName}" style="color: var(--color-primary); text-decoration: none; font-size: 12px;">Download Document</a>
                                </div>
                            `;
                        }
                    }
                });
            }
            
            // Update profile display
            if (userData.fullName) {
                const profileName = document.getElementById('profileName');
                if (profileName) profileName.textContent = userData.fullName;
            }
        } else {
            // Set default email from auth
            const emailInput = document.getElementById('email');
            if (emailInput && user.email) {
                emailInput.value = user.email;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Show profile message
 */
function showProfileMessage(message, type = 'success') {
    const messageEl = document.getElementById('profileMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `profile-message ${type} show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 5000);
}

// ============================================
// FORM HANDLERS
// ============================================

/**
 * Compress image before converting to Base64
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width (default: 800)
 * @param {number} maxHeight - Maximum height (default: 800)
 * @param {number} quality - JPEG quality 0-1 (default: 0.7)
 * @returns {Promise<string>} - Base64 string of compressed image
 */
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression
                const base64String = canvas.toDataURL('image/jpeg', quality);
                resolve(base64String);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Handle photo upload - Convert to Base64 and save to Realtime Database
 */
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showProfileMessage('Please upload an image file', 'error');
        return;
    }
    
    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
        showProfileMessage('Image size should be less than 10MB', 'error');
        return;
    }
    
    const user = auth?.currentUser;
    if (!user) {
        showProfileMessage('Please login to upload photos', 'error');
        return;
    }
    
    if (!database) {
        showProfileMessage('Database is not configured', 'error');
        return;
    }
    
    try {
        showProfileMessage('Processing image...', 'info');
        
        // Compress and convert to Base64
        const base64String = await compressImage(file);
        
        // Show preview immediately
        const photoPreview = document.getElementById('photoPreviewImg');
        const photoPreviewText = document.getElementById('photoPreviewText');
        if (photoPreview) {
            photoPreview.src = base64String;
            photoPreview.style.display = 'block';
        }
        if (photoPreviewText) {
            photoPreviewText.style.display = 'none';
        }
        
        // Save Base64 string to Realtime Database
        showProfileMessage('Saving photo...', 'info');
        await database.ref(`users/${user.uid}/profilePhoto`).set(base64String);
        await database.ref(`users/${user.uid}/profilePhotoUpdatedAt`).set(new Date().toISOString());
        
        // Update user profile (optional - for Firebase Auth profile)
        try {
            await user.updateProfile({
                photoURL: base64String
            });
        } catch (err) {
            console.warn('Could not update auth profile photo:', err);
        }
        
        // Update avatar in header
        const profileAvatar = document.getElementById('profileAvatar');
        const avatarInitials = document.getElementById('avatarInitials');
        if (profileAvatar) {
            profileAvatar.style.backgroundImage = `url(${base64String})`;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }
        }
        
        showProfileMessage('Profile photo uploaded successfully', 'success');
    } catch (error) {
        console.error('Error uploading photo:', error);
        showProfileMessage('Failed to upload photo. Please try again.', 'error');
    }
}

/**
 * Convert file to Base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Handle document upload - Convert to Base64 and save to Realtime Database
 */
async function handleDocumentUpload(event, docType) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size (max 10MB for Base64)
    if (file.size > 10 * 1024 * 1024) {
        showProfileMessage('File size should be less than 10MB', 'error');
        return;
    }
    
    const user = auth?.currentUser;
    if (!user) {
        showProfileMessage('Please login to upload documents', 'error');
        return;
    }
    
    if (!database) {
        showProfileMessage('Database is not configured', 'error');
        return;
    }
    
    try {
        const preview = document.getElementById(`${docType}Preview`);
        if (preview) {
            preview.innerHTML = '<span style="color: var(--color-primary);">Processing...</span>';
        }
        
        showProfileMessage('Converting document to Base64...', 'info');
        
        // Convert file to Base64
        const base64String = await fileToBase64(file);
        
        // Save Base64 string to Realtime Database
        showProfileMessage('Saving document...', 'info');
        const updates = {};
        updates[`users/${user.uid}/documents/${docType}`] = base64String;
        updates[`users/${user.uid}/documents/${docType}FileName`] = file.name;
        updates[`users/${user.uid}/documents/${docType}FileType`] = file.type;
        updates[`users/${user.uid}/${docType}UpdatedAt`] = new Date().toISOString();
        
        await database.ref().update(updates);
        
        // Update preview based on file type
        if (preview) {
            if (file.type.startsWith('image/')) {
                // For images, show preview
                preview.innerHTML = `
                    <div style="margin-top: 8px;">
                        <img src="${base64String}" alt="${docType}" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid var(--color-border);" />
                        <br>
                        <a href="${base64String}" download="${file.name}" style="color: var(--color-primary); text-decoration: none; font-size: 12px; margin-top: 4px; display: inline-block;">Download</a>
                    </div>
                `;
            } else {
                // For PDFs and other documents, show download link
                preview.innerHTML = `
                    <div style="margin-top: 8px;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="margin-bottom: 8px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px;">${file.name}</div>
                        <a href="${base64String}" download="${file.name}" style="color: var(--color-primary); text-decoration: none; font-size: 12px;">Download Document</a>
                    </div>
                `;
            }
        }
        
        showProfileMessage('Document uploaded successfully', 'success');
    } catch (error) {
        console.error('Error uploading document:', error);
        showProfileMessage('Failed to upload document. Please try again.', 'error');
        
        const preview = document.getElementById(`${docType}Preview`);
        if (preview) {
            preview.innerHTML = '';
        }
    }
}

/**
 * Save basic information
 */
async function saveBasicInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !database) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const formData = {
        fullName: document.getElementById('fullName').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        alternatePhone: document.getElementById('alternatePhone').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        
        // Update user display name
        if (formData.fullName) {
            await user.updateProfile({
                displayName: formData.fullName
            });
        }
        
        updateProfileDisplay(user);
        showProfileMessage('Basic information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving basic info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save business information
 */
async function saveBusinessInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !database) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const formData = {
        companyName: document.getElementById('companyName').value.trim(),
        businessType: document.getElementById('businessType').value,
        yearEstablished: document.getElementById('yearEstablished').value,
        businessCategory: document.getElementById('businessCategory').value,
        companyWebsite: document.getElementById('companyWebsite').value.trim(),
        companyDescription: document.getElementById('companyDescription').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        showProfileMessage('Business information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving business info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save compliance information
 */
async function saveComplianceInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !database) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const formData = {
        iecNumber: document.getElementById('iecNumber').value.trim(),
        gstNumber: document.getElementById('gstNumber').value.trim(),
        panNumber: document.getElementById('panNumber').value.trim(),
        cinNumber: document.getElementById('cinNumber').value.trim(),
        dgftRegion: document.getElementById('dgftRegion').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        showProfileMessage('Compliance information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving compliance info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save products information
 */
async function saveProductsInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !firestore) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const targetCountriesSelect = document.getElementById('targetCountries');
    const targetCountries = Array.from(targetCountriesSelect.selectedOptions).map(option => option.value);
    
    const formData = {
        primaryProduct: document.getElementById('primaryProduct').value.trim(),
        productCategory: document.getElementById('productCategory').value,
        hsCode: document.getElementById('hsCode').value.trim(),
        targetCountries: targetCountries,
        monthlyVolume: document.getElementById('monthlyVolume').value.trim(),
        shippingMethod: document.getElementById('shippingMethod').value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        showProfileMessage('Product information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving products info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save address information
 */
async function saveAddressInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !database) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const formData = {
        businessAddress: document.getElementById('businessAddress').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        country: document.getElementById('country').value.trim(),
        pincode: document.getElementById('pincode').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        showProfileMessage('Address information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving address info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save banking information
 */
async function saveBankingInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user || !database) {
        showProfileMessage('Firebase is not configured', 'error');
        return;
    }
    
    const formData = {
        bankName: document.getElementById('bankName').value.trim(),
        accountHolderName: document.getElementById('accountHolderName').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        ifscCode: document.getElementById('ifscCode').value.trim(),
        paymentMethod: document.getElementById('paymentMethod').value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await database.ref(`users/${user.uid}`).update(formData);
        showProfileMessage('Banking information saved successfully', 'success');
    } catch (error) {
        console.error('Error saving banking info:', error);
        showProfileMessage('Failed to save. Please try again.', 'error');
    }
}

/**
 * Save documents information
 */
async function saveDocumentsInfo(event) {
    event.preventDefault();
    showProfileMessage('Documents are saved automatically when uploaded', 'info');
}

/**
 * Save settings information
 */
async function saveSettingsInfo(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user) {
        showProfileMessage('User not authenticated', 'error');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const newPhoneNumber = document.getElementById('newPhoneNumber').value.trim();
    const twoFactorAuth = document.getElementById('twoFactorAuth').checked;
    
    try {
        // Change password if provided
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                showProfileMessage('New passwords do not match', 'error');
                return;
            }
            
            if (!currentPassword) {
                showProfileMessage('Please enter current password', 'error');
                return;
            }
            
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            showProfileMessage('Password changed successfully', 'success');
            
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        }
        
        // Update phone number if provided
        if (newPhoneNumber) {
            // Note: Phone number update requires phone authentication
            // This is a simplified version
            if (database) {
                await database.ref(`users/${user.uid}`).update({
                    phoneNumber: newPhoneNumber
                });
                showProfileMessage('Phone number updated successfully', 'success');
            }
        }
        
        // Save 2FA preference
        if (database) {
            await database.ref(`users/${user.uid}`).update({
                twoFactorAuth: twoFactorAuth
            });
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        let errorMessage = 'Failed to save settings. Please try again.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak';
        }
        
        showProfileMessage(errorMessage, 'error');
    }
}

// Store Firestore listeners for cleanup
let ekycStatusListener = null;

/**
 * Clean up all Firebase listeners
 */
function cleanupFirebaseListeners() {
    try {
        // Clean up Firestore listeners
        if (ekycStatusListener) {
            ekycStatusListener();
            ekycStatusListener = null;
        }
        
        if (videoCallListener) {
            videoCallListener();
            videoCallListener = null;
        }
        
        detachSupportChatListeners();
        
        // Clean up any Realtime Database listeners if needed
        // (Currently not using Realtime Database listeners in export dashboard)
    } catch (error) {
        console.warn('Error cleaning up Firebase listeners:', error);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clean up all listeners before signing out
            cleanupFirebaseListeners();
            await auth?.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showProfileMessage('Failed to logout. Please try again.', 'error');
        }
    }
}

// ============================================
// eKYC FUNCTIONALITY
// ============================================

// Document options based on country
const INDIAN_ID_PROOFS = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'driving-license', label: 'Driving License' },
    { value: 'voter-id', label: 'Voter ID' }
];

const INTERNATIONAL_ID_PROOFS = [
    { value: 'passport', label: 'Passport' },
    { value: 'national-id', label: 'National Identity Card' },
    { value: 'driving-license', label: 'Driving License' }
];

const INDIAN_BUSINESS_PROOFS = [
    { value: 'gst-certificate', label: 'GST Certificate' },
    { value: 'iec-certificate', label: 'IEC Certificate' },
    { value: 'company-registration', label: 'Company Registration Certificate' },
    { value: 'partnership-deed', label: 'Partnership Deed' },
    { value: 'llp-agreement', label: 'LLP Agreement' }
];

const INTERNATIONAL_BUSINESS_PROOFS = [
    { value: 'business-license', label: 'Business License' },
    { value: 'company-registration', label: 'Company Registration Certificate' },
    { value: 'tax-certificate', label: 'Tax Registration Certificate' },
    { value: 'trade-license', label: 'Trade License' }
];

const INDIAN_BANK_PROOFS = [
    { value: 'cancelled-cheque', label: 'Cancelled Cheque' },
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'bank-certificate', label: 'Bank Certificate' }
];

const INTERNATIONAL_BANK_PROOFS = [
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'bank-certificate', label: 'Bank Certificate' },
    { value: 'swift-confirmation', label: 'SWIFT Confirmation' }
];

let userCountry = null;
let ekycData = null;
let selfieDataUrl = null;

/**
 * Safe handler for eKYC button click - with fallback
 */
function handleEKYCButtonClick() {
    console.log('eKYC button clicked');
    try {
        // Try async open
        openEKYCModal().catch(error => {
            console.error('Async open failed, trying fallback:', error);
            forceOpenEKYCModal();
        });
    } catch (error) {
        console.error('Error in button handler:', error);
        forceOpenEKYCModal();
    }
}

/**
 * Check eKYC status and show/hide button accordingly
 */
async function checkEKYCStatus() {
    const user = auth?.currentUser;
    if (!user || !firestore) {
        console.log('No user or firestore available for eKYC check');
        return;
    }

    try {
        const ekycDoc = await firestore.collection('ekyc').doc(user.uid).get();
        console.log('eKYC Document check - exists:', ekycDoc.exists);
        
        const ekycCard = document.getElementById('ekycCard');
        const ekycStatusCard = document.getElementById('ekycStatusCard');
        const videoCallRequestCard = document.getElementById('videoCallRequestCard');
        
        // NO eKYC DATA - Show Complete eKYC button
        if (!ekycDoc.exists) {
            console.log('✓ No eKYC data - showing Complete eKYC button');
            if (ekycCard) ekycCard.style.display = 'block';
            if (ekycStatusCard) ekycStatusCard.style.display = 'none';
            if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
            return;
        }
        
        ekycData = ekycDoc.data();
        console.log('eKYC Data:', {
            ekycCompleted: ekycData.ekycCompleted,
            ekycStatus: ekycData.ekycStatus
        });
        
        // eKYC NOT COMPLETED - Show Complete eKYC button
        if (ekycData.ekycCompleted !== true) {
            console.log('✓ eKYC not completed - showing Complete eKYC button');
            if (ekycCard) ekycCard.style.display = 'block';
            if (ekycStatusCard) ekycStatusCard.style.display = 'none';
            if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
            return;
        }
        
        // eKYC COMPLETED - Show status card
        console.log('✓ eKYC completed - showing status card');
        if (ekycCard) ekycCard.style.display = 'none';
        if (ekycStatusCard) ekycStatusCard.style.display = 'block';
        
        const statusIcon = document.getElementById('ekycStatusIcon');
        const statusTitle = document.getElementById('ekycStatusTitle');
        const statusMessage = document.getElementById('ekycStatusMessage');
        
        if (statusIcon && statusTitle && statusMessage) {
            const status = ekycData.ekycStatus || 'pending';
            console.log('eKYC Status:', status);
            
            if (status === 'verified' || status === 'approved') {
                // eKYC COMPLETED ✓
                console.log('✓✓✓ eKYC VERIFIED - Show "eKYC Completed"');
                statusIcon.textContent = '✓';
                statusIcon.style.color = '#10b981';
                statusTitle.textContent = 'eKYC Completed';
                statusMessage.textContent = 'Your eKYC has been verified successfully. You can now access all features.';
                if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
            } else if (status === 'rejected') {
                // eKYC REJECTED ✗
                console.log('✗✗✗ eKYC REJECTED');
                statusIcon.textContent = '✗';
                statusIcon.style.color = '#ef4444';
                statusTitle.textContent = 'eKYC Rejected';
                statusMessage.textContent = 'Your eKYC verification was rejected. Reason: ' + (ekycData.rejectionReason || 'Not provided') + '. Please contact support to resubmit.';
                if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
            } else {
                // eKYC PENDING ⏳
                console.log('⏳⏳⏳ eKYC PENDING - Show video call button');
                statusIcon.textContent = '📹';
                statusIcon.style.color = '#3b82f6';
                statusTitle.textContent = 'eKYC Submitted - Awaiting Verification';
                statusMessage.textContent = 'Your documents have been received. Complete your verification with a video call to finish the process.';
                if (videoCallRequestCard) videoCallRequestCard.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking eKYC status:', error);
    }
}

/**
 * Listen for real-time eKYC status changes
 */
function listenForEKYCStatusChanges() {
    const user = auth?.currentUser;
    if (!user || !firestore) {
        console.log('No user or firestore for listener');
        return;
    }

    // Clean up existing listener if any
    if (ekycStatusListener) {
        ekycStatusListener();
        ekycStatusListener = null;
    }

    console.log('Setting up real-time eKYC listener for user:', user.uid);
    
    try {
        ekycStatusListener = firestore.collection('ekyc').doc(user.uid).onSnapshot(
            (doc) => {
                if (doc.exists) {
                    ekycData = doc.data();
                    console.log('📡 Real-time eKYC update received:', ekycData.ekycStatus);
                    checkEKYCStatus();
                } else {
                    console.log('📡 eKYC document deleted or not found');
                    ekycData = null;
                    checkEKYCStatus();
                }
            },
            (error) => {
                console.error('Error in eKYC listener:', error);
            }
        );
    } catch (error) {
        console.error('Error setting up eKYC listener:', error);
    }
}

/**
 * Open eKYC modal
 */
async function openEKYCModal() {
    const modal = document.getElementById('ekycModal');
    if (!modal) {
        console.error('eKYC modal element not found');
        return;
    }
    
    console.log('Opening eKYC modal...');
    
    const user = auth?.currentUser;
    if (!user) {
        console.warn('User not authenticated');
        showProfileMessage('Please login to complete eKYC', 'error');
        return;
    }
    
    console.log('User authenticated:', user.uid);
    
    // Fetch user country from Realtime Database
    try {
        if (database) {
            const userRef = database.ref(`users/${user.uid}`);
            const snapshot = await userRef.once('value');
            if (snapshot.exists()) {
                const userData = snapshot.val();
                userCountry = userData.country || 'India';
                console.log('User country:', userCountry);
            } else {
                userCountry = 'India';
            }
        } else {
            userCountry = 'India';
            console.warn('Database not initialized, defaulting to India');
        }
    } catch (error) {
        console.error('Error fetching user country:', error);
        userCountry = 'India';
    }
    
    // Check if eKYC already exists - only check, don't close
    try {
        if (firestore) {
            const ekycDoc = await firestore.collection('ekyc').doc(user.uid).get();
            if (ekycDoc.exists) {
                ekycData = ekycDoc.data();
                console.log('Existing eKYC found:', ekycData);
                if (ekycData.ekycCompleted === true) {
                    console.log('eKYC already completed');
                    showProfileMessage('You have already completed your eKYC.', 'info');
                    return; // Don't open modal
                }
            } else {
                ekycData = null;
                console.log('No existing eKYC data');
            }
        } else {
            ekycData = null;
            console.warn('Firestore not initialized');
        }
    } catch (error) {
        console.error('Error checking existing eKYC:', error);
        ekycData = null;
    }
    
    console.log('Populating eKYC form...');
    // Populate dropdowns based on country
    populateEKYCForm();
    
    // Pre-fill existing data if available but not completed
    if (ekycData && ekycData.ekycCompleted !== true) {
        console.log('Pre-filling existing eKYC form data...');
        prefillEKYCForm();
    }
    
    console.log('Displaying eKYC modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Verify modal is actually visible
    if (modal.classList.contains('active')) {
        console.log('✓ eKYC modal is now open');
    } else {
        console.error('✗ Failed to open eKYC modal');
    }
}

/**
 * Close eKYC modal
 */
function closeEKYCModal() {
    const modal = document.getElementById('ekycModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Stop camera if active
    stopCamera();
    selfieDataUrl = null;
    const selfieInput = document.getElementById('selfieFile');
    if (selfieInput) {
        selfieInput.value = '';
        selfieInput.removeAttribute('data-valid');
    }
    
    // Reset form and re-enable all fields
    const form = document.getElementById('ekycForm');
    if (form) {
        form.reset();
        clearFilePreviews();
        
        // Re-enable all disabled fields
        const disabledFields = form.querySelectorAll('select:disabled, input:disabled');
        disabledFields.forEach(field => {
            field.disabled = false;
            if (field.tagName === 'INPUT' && field.type === 'file') {
                field.required = true;
            }
        });
    }
    
    // Clear message
    const message = document.getElementById('ekycMessage');
    if (message) {
        message.textContent = '';
        message.className = 'ekyc-message';
    }
    
    // Reset submit button
    const submitBtn = document.getElementById('ekycSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit eKYC';
    }
    
    console.log('eKYC modal closed');
}

/**
 * Force open eKYC modal (fallback if async fails)
 */
function forceOpenEKYCModal() {
    console.log('Force opening eKYC modal...');
    const modal = document.getElementById('ekycModal');
    if (!modal) {
        console.error('Cannot find eKYC modal element!');
        alert('Modal element not found. Please refresh the page.');
        return;
    }
    
    // Set default country if not set
    if (!userCountry) {
        userCountry = 'India';
    }
    
    // Populate form immediately
    populateEKYCForm();
    
    // Open modal
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    console.log('✓ eKYC modal forced open');
}

/**
 * Populate eKYC form dropdowns based on country
 */
function populateEKYCForm() {
    const isIndia = userCountry && userCountry.toLowerCase() === 'india';
    
    // Identity Proof
    const identitySelect = document.getElementById('identityProofType');
    if (identitySelect) {
        identitySelect.innerHTML = '<option value="">Select ID Proof</option>';
        const options = isIndia ? INDIAN_ID_PROOFS : INTERNATIONAL_ID_PROOFS;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            identitySelect.appendChild(opt);
        });
    }
    
    // Business Proof
    const businessSelect = document.getElementById('businessProofType');
    if (businessSelect) {
        businessSelect.innerHTML = '<option value="">Select Business Proof</option>';
        const options = isIndia ? INDIAN_BUSINESS_PROOFS : INTERNATIONAL_BUSINESS_PROOFS;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            businessSelect.appendChild(opt);
        });
    }
    
    // Bank Proof
    const bankSelect = document.getElementById('bankProofType');
    if (bankSelect) {
        bankSelect.innerHTML = '<option value="">Select Bank Proof</option>';
        const options = isIndia ? INDIAN_BANK_PROOFS : INTERNATIONAL_BANK_PROOFS;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            bankSelect.appendChild(opt);
        });
    }
}

/**
 * Pre-fill eKYC form with existing data
 */
function prefillEKYCForm() {
    if (!ekycData) return;
    
    // Pre-fill dropdowns
    if (ekycData.selectedIdentityProof) {
        const identitySelect = document.getElementById('identityProofType');
        if (identitySelect) {
            identitySelect.value = ekycData.selectedIdentityProof;
            identitySelect.disabled = true;
        }
    }
    
    if (ekycData.selectedBusinessProof) {
        const businessSelect = document.getElementById('businessProofType');
        if (businessSelect) {
            businessSelect.value = ekycData.selectedBusinessProof;
            businessSelect.disabled = true;
        }
    }
    
    if (ekycData.selectedBankProof) {
        const bankSelect = document.getElementById('bankProofType');
        if (bankSelect) {
            bankSelect.value = ekycData.selectedBankProof;
            bankSelect.disabled = true;
        }
    }
    
    // Disable file inputs if data exists
    const fileInputs = ['identityProofFile', 'businessProofFile', 'bankProofFile', 'selfieFile'];
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.disabled = true;
            input.required = false;
        }
    });
}

// Camera stream variables
let cameraStream = null;

/**
 * Start camera for selfie capture
 */
async function startCamera() {
    try {
        const video = document.getElementById('cameraVideo');
        const previewContainer = document.getElementById('cameraPreviewContainer');
        const startBtn = document.getElementById('startCameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        const cancelBtn = document.getElementById('cancelCameraBtn');
        
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // Front camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = cameraStream;
        previewContainer.style.display = 'block';
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showEKYCMessage('Unable to access camera. Please check permissions.', 'error');
    }
}

/**
 * Capture selfie from camera
 */
function captureSelfie() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const preview = document.getElementById('selfiePreview');
    const selfieInput = document.getElementById('selfieFile');
    
    if (!video || !canvas || !cameraStream) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to Base64 data URL
    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    selfieDataUrl = imageUrl;
    
    // Show preview
    preview.innerHTML = `
        <div style="margin-top: 8px;">
            <img src="${imageUrl}" alt="Selfie" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid var(--color-border);" />
            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">Selfie captured</div>
        </div>
    `;
    
    // Mark as valid
    if (selfieInput) {
        selfieInput.value = 'captured';
        selfieInput.setAttribute('data-valid', 'true');
    }
    
    // Stop camera
    stopCamera();
    
    showEKYCMessage('Selfie captured successfully', 'success');
}

/**
 * Stop camera stream
 */
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    const video = document.getElementById('cameraVideo');
    const previewContainer = document.getElementById('cameraPreviewContainer');
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const cancelBtn = document.getElementById('cancelCameraBtn');
    
    if (video) video.srcObject = null;
    if (previewContainer) previewContainer.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (captureBtn) captureBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

/**
 * Handle file preview
 */
function handleFilePreview(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById(`${type}Preview`);
    if (!preview) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showEKYCMessage(`${type} file size should be less than 10MB`, 'error');
        event.target.value = '';
        preview.innerHTML = '';
        return;
    }
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <div style="margin-top: 8px;">
                    <img src="${e.target.result}" alt="${type}" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid var(--color-border);" />
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">${file.name}</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <div style="margin-top: 8px;">
                    <div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; height: 200px;">
                        <iframe src="${e.target.result}" type="application/pdf" style="width: 100%; height: 100%; border: none;" title="${file.name}"></iframe>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">${file.name}</div>
                    <a href="${e.target.result}" download="${file.name}" style="font-size: 12px; color: var(--color-primary); text-decoration: none;">Download PDF</a>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div style="margin-top: 8px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="margin-bottom: 8px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div style="font-size: 12px; color: var(--color-text-secondary);">${file.name}</div>
            </div>
        `;
    }
}

/**
 * Clear all file previews
 */
function clearFilePreviews() {
    const previews = ['identityProofPreview', 'businessProofPreview', 'bankProofPreview', 'selfiePreview'];
    previews.forEach(id => {
        const preview = document.getElementById(id);
        if (preview) preview.innerHTML = '';
    });
}

/**
 * Handle identity proof change
 */
function handleIdentityProofChange() {
    // This can be used for additional validation if needed
}

/**
 * Submit eKYC form
 */
async function submitEKYC(event) {
    event.preventDefault();
    
    const user = auth?.currentUser;
    if (!user) {
        showEKYCMessage('Please login to submit eKYC', 'error');
        return;
    }
    
    if (!firestore) {
        showEKYCMessage('Firebase services are not configured', 'error');
        return;
    }
    
    // Check if already completed
    try {
        const ekycDoc = await firestore.collection('ekyc').doc(user.uid).get();
        if (ekycDoc.exists && ekycDoc.data().ekycCompleted === true) {
            showEKYCMessage('You have already completed your eKYC', 'error');
            return;
        }
    } catch (error) {
        console.error('Error checking eKYC status:', error);
    }
    
    const submitBtn = document.getElementById('ekycSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }
    
    try {
        // Get form values
        const identityProofType = document.getElementById('identityProofType').value;
        const businessProofType = document.getElementById('businessProofType').value;
        const bankProofType = document.getElementById('bankProofType').value;
        
        // Get files
        const identityProofFile = document.getElementById('identityProofFile').files[0];
        const businessProofFile = document.getElementById('businessProofFile').files[0];
        const bankProofFile = document.getElementById('bankProofFile').files[0];
        
        // Validate files
        if (!identityProofFile || !businessProofFile || !bankProofFile) {
            showEKYCMessage('Please upload all required documents', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit eKYC';
            }
            return;
        }
        
        if (!selfieDataUrl) {
            showEKYCMessage('Please capture a live selfie before submitting', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit eKYC';
            }
            return;
        }
        
        showEKYCMessage('Processing documents...', 'info');
        
        // Convert files to Base64 (Data URLs)
        const [identityBase64, businessBase64, bankBase64] = await Promise.all([
            fileToBase64(identityProofFile),
            fileToBase64(businessProofFile),
            fileToBase64(bankProofFile)
        ]);
        
        const timestampIso = new Date().toISOString();
        const documentsPayload = {
            identityProof: {
                dataUrl: identityBase64,
                fileName: identityProofFile.name,
                fileType: identityProofFile.type,
                uploadedAt: timestampIso
            },
            businessProof: {
                dataUrl: businessBase64,
                fileName: businessProofFile.name,
                fileType: businessProofFile.type,
                uploadedAt: timestampIso
            },
            bankProof: {
                dataUrl: bankBase64,
                fileName: bankProofFile.name,
                fileType: bankProofFile.type,
                uploadedAt: timestampIso
            },
            selfie: {
                dataUrl: selfieDataUrl,
                fileName: `selfie-${Date.now()}.jpg`,
                fileType: 'image/jpeg',
                uploadedAt: timestampIso
            }
        };
        
        // Save metadata + documents to Firestore
        const ekycData = {
            ekycStatus: 'pending',
            ekycCompleted: true,
            selectedIdentityProof: identityProofType,
            selectedBusinessProof: businessProofType,
            selectedBankProof: bankProofType,
            country: userCountry || 'India',
            userName: document.getElementById('fullName')?.value?.trim() || user.displayName || '',
            userEmail: user.email,
            documents: documentsPayload,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: timestampIso
        };
        
        await firestore.collection('ekyc').doc(user.uid).set(ekycData, { merge: true });
        
        showEKYCMessage('Your eKYC has been submitted successfully. You can now request a video call for verification.', 'success');
        
        // Close modal after 2 seconds
        setTimeout(() => {
            closeEKYCModal();
            checkEKYCStatus(); // Refresh status
            
            // Show video call request card
            const videoCallRequestCard = document.getElementById('videoCallRequestCard');
            if (videoCallRequestCard) {
                videoCallRequestCard.style.display = 'block';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting eKYC:', error);
        showEKYCMessage('Failed to submit eKYC. Please try again.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit eKYC';
        }
    }
}

/**
 * Show eKYC message
 */
function showEKYCMessage(message, type = 'success') {
    const messageEl = document.getElementById('ekycMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `ekyc-message ${type} show`;
    
    // Auto-hide after 5 seconds for success/info, keep error visible
    if (type !== 'error') {
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 5000);
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('ekycModal');
        if (modal && modal.classList.contains('active')) {
            closeEKYCModal();
        }
        const videoModal = document.getElementById('videoCallModal');
        if (videoModal && videoModal.classList.contains('active')) {
            closeVideoCallModal();
        }
    }
});

// ============================================
// VIDEO CALL FUNCTIONALITY
// ============================================

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let videoCallRequestId = null;
let videoCallListener = null;

// WebRTC Configuration (using Google's public STUN servers)
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

/**
 * Request video call with agent
 */
async function requestVideoCall() {
    const user = auth?.currentUser;
    if (!user || !firestore) {
        showProfileMessage('Please login to request video call', 'error');
        return;
    }
    
    // Check if eKYC is submitted
    if (!ekycData || ekycData.ekycCompleted !== true) {
        showProfileMessage('Please complete eKYC submission first', 'error');
        return;
    }
    
    // Check if already verified
    if (ekycData.ekycStatus === 'verified') {
        showProfileMessage('Your eKYC is already verified!', 'info');
        return;
    }
    
    console.log('Requesting video call for user:', user.uid);
    
    // Open video call modal
    const modal = document.getElementById('videoCallModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Show waiting state
        document.getElementById('waitingForAgent').style.display = 'block';
        document.getElementById('videoCallInterface').style.display = 'none';
        document.getElementById('callEnded').style.display = 'none';
    }
    
    try {
        // Create video call request in Firestore
        const requestData = {
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || user.email.split('@')[0],
            ekycId: user.uid,
            status: 'pending',
            ekycStatus: 'pending_verification',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };
        
        const requestRef = await firestore.collection('videoCallRequests').add(requestData);
        videoCallRequestId = requestRef.id;
        
        console.log('Video call request created:', videoCallRequestId);
        showProfileMessage('Request sent to admin. Waiting for response...', 'info');
        
        // Listen for agent acceptance
        listenForAgentAcceptance(requestRef.id);
        
    } catch (error) {
        console.error('Error requesting video call:', error);
        showProfileMessage('Failed to request video call. Please try again.', 'error');
        closeVideoCallModal();
    }
}

/**
 * Listen for agent acceptance and verification completion
 */
function listenForAgentAcceptance(requestId) {
    if (!firestore) return;
    
    console.log('Listening for agent response on request:', requestId);
    
    videoCallListener = firestore.collection('videoCallRequests').doc(requestId)
        .onSnapshot((doc) => {
            if (!doc.exists) return;
            
            const data = doc.data();
            console.log('Video call request status update:', data.status);
            
            if (data.status === 'accepted' && data.agentId) {
                // Agent accepted, start video call
                console.log('Agent accepted request');
                showProfileMessage('Agent connected! Starting video call...', 'success');
                startVideoCall(data.agentId, requestId);
            } else if (data.status === 'rejected') {
                // Agent rejected
                console.log('Agent rejected request');
                closeVideoCallModal();
                showProfileMessage('Your verification request was rejected. Please try again later.', 'error');
            } else if (data.status === 'completed') {
                // Verification completed by admin
                console.log('Video call completed');
                if (data.ekycStatus === 'verified') {
                    console.log('eKYC verified by admin');
                    showProfileMessage('Your eKYC has been verified! Closing video call...', 'success');
                    setTimeout(() => {
                        closeVideoCallModal();
                        // Refresh eKYC status to show verified state
                        checkEKYCStatus();
                    }, 2000);
                } else if (data.ekycStatus === 'rejected') {
                    console.log('eKYC rejected by admin');
                    closeVideoCallModal();
                    showProfileMessage('Your eKYC was rejected. Reason: ' + (data.rejectionReason || 'Not provided'), 'error');
                    // Refresh status
                    setTimeout(() => {
                        checkEKYCStatus();
                    }, 1000);
                }
            }
        }, (error) => {
            console.error('Error listening for agent acceptance:', error);
        });
}

/**
 * Start video call with agent
 */
async function startVideoCall(agentId, requestId) {
    try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfiguration);
        
        // Add local stream tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
            }
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Convert RTCIceCandidate to plain JSON (Firestore can't store complex objects)
                const candidateData = {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    usernameFragment: event.candidate.usernameFragment
                };
                firestore.collection('videoCallRequests').doc(requestId).update({
                    iceCandidate: candidateData,
                    updatedAt: new Date().toISOString()
                });
            }
        };
        
        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer to agent
        await firestore.collection('videoCallRequests').doc(requestId).update({
            offer: offer,
            status: 'connecting',
            updatedAt: new Date().toISOString()
        });
        
        // Show video interface
        document.getElementById('waitingForAgent').style.display = 'none';
        document.getElementById('videoCallInterface').style.display = 'block';
        
        // Listen for answer from agent
        listenForAgentAnswer(requestId);
        
    } catch (error) {
        console.error('Error starting video call:', error);
        showEKYCMessage('Failed to start video call. Please check camera and microphone permissions.', 'error');
        closeVideoCallModal();
    }
}

/**
 * Listen for answer from agent
 */
let answerProcessed = false;  // Flag to prevent duplicate answer processing
function listenForAgentAnswer(requestId) {
    if (!firestore) return;
    
    const answerListener = firestore.collection('videoCallRequests').doc(requestId)
        .onSnapshot(async (doc) => {
            if (!doc.exists) return;
            
            const data = doc.data();
            
            // Process answer only once and only when NOT in stable state (have-local-offer)
            if (data.answer && !answerProcessed && peerConnection && peerConnection.signalingState === 'have-local-offer') {
                try {
                    console.log('Processing answer from agent, current state:', peerConnection.signalingState);
                    answerProcessed = true;  // Mark as processed
                    
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log('Answer remote description set, state:', peerConnection.signalingState);
                } catch (error) {
                    console.error('Error setting remote description:', error);
                    answerProcessed = false;  // Reset flag on error
                }
            }
            
            if (data.agentIceCandidate && peerConnection) {
                try {
                    console.log('Adding ICE candidate from agent');
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.agentIceCandidate));
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            }
        });
}

/**
 * Toggle mute
 */
function toggleMute() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.classList.toggle('muted', !audioTracks[0].enabled);
        }
    }
}

/**
 * Toggle video
 */
function toggleVideo() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        const videoBtn = document.getElementById('videoBtn');
        if (videoBtn) {
            videoBtn.classList.toggle('disabled', !videoTracks[0].enabled);
        }
    }
}

/**
 * End video call
 */
async function endVideoCall() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Reset flags
    answerProcessed = false;
    
    // Update request status
    if (videoCallRequestId && firestore) {
        try {
            await firestore.collection('videoCallRequests').doc(videoCallRequestId).update({
                status: 'ended',
                endedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error ending video call:', error);
        }
    }
    
    // Remove listeners
    if (videoCallListener) {
        videoCallListener();
        videoCallListener = null;
    }
    
    videoCallRequestId = null;
}

/**
 * Close video call modal
 */
function closeVideoCallModal() {
    const modal = document.getElementById('videoCallModal');
    if (!modal) return;
    
    // End call if active
    if (localStream || peerConnection) {
        endVideoCall();
    }
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Reset UI
    document.getElementById('waitingForAgent').style.display = 'block';
    document.getElementById('videoCallInterface').style.display = 'none';
    document.getElementById('callEnded').style.display = 'none';
    
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
}

// ============================================
// INSURANCE MODULE
// ============================================

const insurancePortDirectory = {
  AE: {
    label: "United Arab Emirates",
    ports: [
      { slug: "dubai", label: "Jebel Ali, Dubai (AEDXB)" },
      { slug: "abu-dhabi", label: "Abu Dhabi (AEAUH)" },
      { slug: "jebel-ali", label: "Jebel Ali (AEJEA)" },
    ],
  },
  AU: {
    label: "Australia",
    ports: [
      { slug: "melbourne", label: "Melbourne (AUMEL)" },
      { slug: "sydney", label: "Sydney (AUSYD)" },
    ],
  },
  BE: {
    label: "Belgium",
    ports: [
      { slug: "antwerp", label: "Antwerp (BEANR)" },
      { slug: "zeebrugge", label: "Zeebrugge (BEZEE)" },
    ],
  },
  BR: {
    label: "Brazil",
    ports: [
      { slug: "santos", label: "Santos (BRSSZ)" },
      { slug: "rio-de-janeiro", label: "Rio de Janeiro (BRRIO)" },
    ],
  },
  CN: {
    label: "China",
    ports: [
      { slug: "shanghai", label: "Shanghai (CNSHA)" },
      { slug: "tianjin", label: "Tianjin (CNTJG)" },
      { slug: "ningbo", label: "Ningbo (CNNGB)" },
    ],
  },
  DE: {
    label: "Germany",
    ports: [
      { slug: "hamburg", label: "Hamburg (DEHAM)" },
      { slug: "bremerhaven", label: "Bremerhaven (DEBRV)" },
    ],
  },
  ES: {
    label: "Spain",
    ports: [
      { slug: "valencia", label: "Valencia (ESVLC)" },
      { slug: "barcelona", label: "Barcelona (ESBCN)" },
    ],
  },
  IN: {
    label: "India",
    ports: [
      { slug: "mumbai", label: "Mumbai (INBOM)" },
      { slug: "chennai", label: "Chennai (INMAA)" },
      { slug: "vizag", label: "Visakhapatnam (INVTZ)" },
      { slug: "kolkata", label: "Kolkata (INCCU)" },
    ],
  },
  LK: {
    label: "Sri Lanka",
    ports: [{ slug: "colombo", label: "Colombo (LKCMB)" }],
  },
  MY: {
    label: "Malaysia",
    ports: [
      { slug: "tanjung-pelepas", label: "Tanjung Pelepas (MYTPP)" },
      { slug: "port-klang", label: "Port Klang (MYPKG)" },
    ],
  },
  NL: {
    label: "Netherlands",
    ports: [
      { slug: "rotterdam", label: "Rotterdam (NLRTM)" },
      { slug: "amsterdam", label: "Amsterdam (NLAMS)" },
    ],
  },
  OM: {
    label: "Oman",
    ports: [{ slug: "salalah", label: "Salalah (OMSLL)" }],
  },
  SG: {
    label: "Singapore",
    ports: [{ slug: "singapore", label: "Singapore (SGSIN)" }],
  },
  US: {
    label: "United States",
    ports: [
      { slug: "los-angeles", label: "Los Angeles (USLAX)" },
      { slug: "long-beach", label: "Long Beach (USLGB)" },
      { slug: "new-york", label: "New York / NJ (USNYC)" },
      { slug: "miami", label: "Miami (USMIA)" },
      { slug: "chicago", label: "Chicago (USCHI)" },
    ],
  },
  ZA: {
    label: "South Africa",
    ports: [
      { slug: "durban", label: "Durban (ZADUR)" },
      { slug: "cape-town", label: "Cape Town (ZACPT)" },
    ],
  },
};

const insuranceFallbackCountries = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "AU", label: "Australia" },
  { value: "BE", label: "Belgium" },
  { value: "BR", label: "Brazil" },
  { value: "CN", label: "China" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "IN", label: "India" },
  { value: "LK", label: "Sri Lanka" },
  { value: "MY", label: "Malaysia" },
  { value: "NL", label: "Netherlands" },
  { value: "OM", label: "Oman" },
  { value: "SG", label: "Singapore" },
  { value: "US", label: "United States" },
  { value: "ZA", label: "South Africa" },
];

const insuranceCatalogue = [
  {
    id: "atlas-icc-a",
    provider: "Atlas Marine Mutual",
    product: "Blue Shield ICC (A)",
    url: "https://www.agcs.allianz.com/solutions/marine-cargo-insurance.html",
    coverage: ["ICC A", "War", "SRCC", "Temperature", "High-Value"],
    supportedGoods: ["electronics", "pharmaceuticals", "perishables", "machinery"],
    minValue: 50000,
    maxValue: 5000000,
    appetite: {
      ports: ["singapore", "rotterdam", "dubai", "mumbai", "los-angeles", "new-york"],
      modes: ["sea", "air"],
    },
    basePremiumRate: 0.42,
    rating: 4.7,
    notes: "Prefers high-value electronics and pharma with airtight packaging proof.",
  },
  {
    id: "harborline-tier2",
    provider: "HarborLine Syndicate",
    product: "Tier 2 Global Cargo (ICC B)",
    url: "https://www.lloyds.com/solutions/marine",
    coverage: ["ICC B", "General Average", "War"],
    supportedGoods: ["machinery", "automotive", "textiles", "bulk"],
    minValue: 20000,
    maxValue: 2500000,
    appetite: {
      ports: ["antwerp", "hamburg", "chennai", "tanjung-pelepas", "long-beach"],
      modes: ["sea", "rail"],
    },
    basePremiumRate: 0.28,
    rating: 4.3,
    notes: "Competitive for industrial cargo, requires survey for >USD 2M.",
  },
  {
    id: "aerosecure-air",
    provider: "AeroSecure Underwriting",
    product: "Just-in-Time Air Hull",
    url: "https://www.chubb.com/us-en/businesses/resources/aerospace-insurance.html",
    coverage: ["ICC Air", "High-Value", "Delay"],
    supportedGoods: ["electronics", "pharmaceuticals", "automotive"],
    minValue: 10000,
    maxValue: 1500000,
    appetite: { ports: ["dubai", "hamburg", "chicago", "shanghai"], modes: ["air"] },
    basePremiumRate: 0.65,
    rating: 4.8,
    notes: "Includes expedited claims on temp-controlled air freight.",
  },
  {
    id: "evertrust-perishables",
    provider: "Evertrust",
    product: "ColdLink ICC (A) + TempGuard",
    url: "https://www.msig.com.sg/business/solutions/marine/marine-cargo-insurance",
    coverage: ["ICC A", "Temperature", "Contamination"],
    supportedGoods: ["perishables", "pharmaceuticals", "bulk"],
    minValue: 15000,
    maxValue: 1200000,
    appetite: {
      ports: ["valencia", "rotterdam", "miami", "jebel-ali", "melbourne"],
      modes: ["sea", "air", "road"],
    },
    basePremiumRate: 0.58,
    rating: 4.6,
    notes: "Requires IoT telemetry for temp excursions coverage to apply.",
  },
  {
    id: "terra-icc-c",
    provider: "Terra Assurance",
    product: "Economy ICC (C)",
    url: "https://axaxl.com/insurance/coverages/marine-cargo",
    coverage: ["ICC C", "General Average"],
    supportedGoods: ["bulk", "textiles", "machinery"],
    minValue: 5000,
    maxValue: 800000,
    appetite: {
      ports: ["colombo", "salalah", "vizag", "durban", "santos"],
      modes: ["sea", "road"],
    },
    basePremiumRate: 0.14,
    rating: 3.9,
    notes: "Value option for shippers with higher deductible appetite.",
  },
];

/**
 * Initialize insurance module when insurance tab is opened
 */
function initializeInsuranceModule() {
    const insuranceForm = document.getElementById('shipment-form');
    if (!insuranceForm) return;
    
    loadInsuranceCountryOptions();
    setupInsuranceEventListeners();
}

/**
 * Load country options for insurance form
 */
async function loadInsuranceCountryOptions() {
    try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
        if (!response.ok) throw new Error("Country fetch failed");
        const payload = await response.json();
        const countries = payload
            .map((country) => ({
                value: country.cca2,
                label: country.name?.common ?? country.cca2,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
        populateInsuranceCountrySelects(countries);
    } catch (error) {
        console.warn("Using fallback country list for insurance", error);
        populateInsuranceCountrySelects(insuranceFallbackCountries);
    }
}

/**
 * Populate insurance country selects
 */
function populateInsuranceCountrySelects(countries) {
    const countrySelects = document.querySelectorAll('[data-port-target*="insurance"]');
    countrySelects.forEach((select) => {
        const options = countries.map(({ value, label }) => `<option value="${value}">${label}</option>`).join("");
        select.insertAdjacentHTML("beforeend", options);
    });
    
    setupInsurancePortHandlers();
}

/**
 * Setup insurance port handlers
 */
function setupInsurancePortHandlers() {
    const originCountrySelect = document.getElementById('insurance-origin-country');
    const destinationCountrySelect = document.getElementById('insurance-destination-country');
    
    if (originCountrySelect) {
        originCountrySelect.addEventListener('change', (e) => {
            updateInsurancePortOptions('insurance-origin-port', e.target.value);
        });
    }
    
    if (destinationCountrySelect) {
        destinationCountrySelect.addEventListener('change', (e) => {
            updateInsurancePortOptions('insurance-destination-port', e.target.value);
        });
    }
}

/**
 * Update insurance port options based on country
 */
function updateInsurancePortOptions(portSelectId, countryKey) {
    const portSelect = document.getElementById(portSelectId);
    if (!portSelect) return;
    
    portSelect.innerHTML = '<option value="">Select port</option>';
    portSelect.disabled = true;
    resetInsurancePortInput(portSelectId);
    
    if (!countryKey) return;
    
    const directory = insurancePortDirectory[countryKey];
    const ports = directory?.ports || [];
    
    ports.forEach((port) => {
        const option = document.createElement('option');
        option.value = port.slug;
        option.textContent = port.label;
        portSelect.appendChild(option);
    });
    
    const manualOption = document.createElement('option');
    manualOption.value = '__manual';
    manualOption.textContent = 'Other / not listed';
    portSelect.appendChild(manualOption);
    
    portSelect.disabled = false;
    
    portSelect.addEventListener('change', (e) => {
        if (e.target.value === '__manual') {
            toggleInsuranceManualPort(portSelectId, true);
        } else {
            toggleInsuranceManualPort(portSelectId, false);
        }
    });
}

/**
 * Toggle insurance manual port input
 */
function toggleInsuranceManualPort(portSelectId, active) {
    const manualInputId = portSelectId + '-manual';
    const manualInput = document.getElementById(manualInputId);
    const portSelect = document.getElementById(portSelectId);
    
    if (!manualInput) return;
    
    if (active) {
        manualInput.hidden = false;
        manualInput.required = true;
        portSelect.required = false;
    } else {
        manualInput.hidden = true;
        manualInput.required = false;
        manualInput.value = '';
        portSelect.required = true;
    }
}

/**
 * Reset insurance port input
 */
function resetInsurancePortInput(portSelectId) {
    const manualInputId = portSelectId + '-manual';
    const manualInput = document.getElementById(manualInputId);
    
    if (manualInput) {
        manualInput.hidden = true;
        manualInput.required = false;
        manualInput.value = '';
    }
}

/**
 * Resolve insurance port selection
 */
function resolveInsurancePortSelection(portSelectId) {
    const portSelect = document.getElementById(portSelectId);
    const manualInputId = portSelectId + '-manual';
    const manualInput = document.getElementById(manualInputId);
    
    if (portSelect && portSelect.value && portSelect.value !== '__manual') {
        return {
            value: portSelect.value,
            label: portSelect.selectedOptions[0]?.textContent || '',
        };
    }
    
    if (manualInput && !manualInput.hidden && manualInput.value.trim()) {
        const label = manualInput.value.trim();
        return {
            value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            label: label,
        };
    }
    
    return { value: '', label: '' };
}

/**
 * Score insurance based on shipment profile
 */
function scoreInsuranceProduct(shipment, product) {
    let score = 0;
    const reasons = [];
    
    if (product.supportedGoods.includes(shipment.goodsType)) {
        score += 25;
        reasons.push("Commodity appetite aligned.");
    }
    
    if (shipment.shipmentValue >= product.minValue && shipment.shipmentValue <= product.maxValue) {
        score += 20;
        reasons.push("Declared value within underwriting band.");
    } else if (shipment.shipmentValue <= product.maxValue * 1.2) {
        score += 8;
        reasons.push("Value slightly outside band; manual approval likely.");
    }
    
    const lanes = product.appetite.ports;
    const matchedPorts = [];
    if (shipment.originPort && lanes.includes(shipment.originPort)) {
        matchedPorts.push(shipment.originPortLabel || "origin port");
    }
    if (shipment.destinationPort && lanes.includes(shipment.destinationPort)) {
        matchedPorts.push(shipment.destinationPortLabel || "destination port");
    }
    if (matchedPorts.length) {
        score += matchedPorts.length === 2 ? 20 : 15;
        reasons.push(`Known trade lane via ${matchedPorts.join(" & ")}.`);
    }
    
    if (product.appetite.modes.includes(shipment.transportMode)) {
        score += 15;
        reasons.push("Supports selected transport mode.");
    }
    
    if (shipment.riskProfile === "conservative" && product.coverage.includes("ICC A")) {
        score += 10;
        reasons.push("High-coverage clause for conservative posture.");
    }
    
    if (shipment.riskProfile === "aggressive" && product.basePremiumRate < 0.4) {
        score += 10;
        reasons.push("Lean rate aligns with cost-focused approach.");
    }
    
    score += Math.min(15, product.rating * 3);
    score = Math.min(100, score);
    
    return {
        product,
        score,
        reasons,
        estimatedPremium: ((shipment.shipmentValue * product.basePremiumRate) / 100).toFixed(2),
    };
}

/**
 * Classify insurance score
 */
function classifyInsuranceScore(score) {
    if (score >= 80) return "high";
    if (score >= 60) return "medium";
    return "low";
}

/**
 * Set insurance submit button loading state
 */
function setInsuranceSubmitLoading(isLoading) {
    const submitBtn = document.getElementById('insurance-submit-btn');
    if (!submitBtn) return;
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Scanning markets...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Find best-fit insurance';
    }
}

/**
 * Render insurance results
 */
function renderInsuranceResults(recommendations) {
    const resultsContainer = document.getElementById('insurance-results');
    if (!resultsContainer) return;
    
    if (!recommendations.length) {
        resultsContainer.classList.add('empty');
        resultsContainer.innerHTML = '<p>No strong matches yet. Try adjusting commodity or shipment value.</p>';
        return;
    }
    
    resultsContainer.classList.remove('empty');
    resultsContainer.innerHTML = recommendations
        .map(({ product, score, reasons, estimatedPremium }) => {
            const badges = product.coverage.map(c => `<span class="insurance-tag">${c}</span>`).join('');
            const reasons_html = reasons.map(r => `<li>${r}</li>`).join('');
            
            return `
                <article class="insurance-result-card">
                    <header>
                        <div>
                            <h3>${product.product}</h3>
                            <p>${product.provider}</p>
                        </div>
                        <span class="insurance-score-badge ${classifyInsuranceScore(score)}">Score ${Math.round(score)}/100</span>
                    </header>
                    <div class="insurance-tag-row">
                        ${badges}
                        <span class="insurance-tag">Premium ≈ $${estimatedPremium}</span>
                        <span class="insurance-tag">Rating: ${product.rating}</span>
                    </div>
                    <a class="insurance-result-link" href="${product.url}" target="_blank" rel="noopener">
                        View policy deck ↗
                    </a>
                    <ul>
                        ${reasons_html}
                    </ul>
                    <p>${product.notes}</p>
                </article>
            `;
        })
        .join('');
}

/**
 * Handle insurance form submission
 */
function handleInsuranceSubmit(event) {
    event.preventDefault();
    setInsuranceSubmitLoading(true);
    
    const form = document.getElementById('shipment-form');
    const formData = new FormData(form);
    
    const originPortInfo = resolveInsurancePortSelection('insurance-origin-port');
    const destinationPortInfo = resolveInsurancePortSelection('insurance-destination-port');
    
    const shipment = {
        goodsType: formData.get('goodsType'),
        shipmentValue: Number(formData.get('shipmentValue')),
        originCountry: formData.get('originCountry'),
        originPort: originPortInfo.value,
        originPortLabel: originPortInfo.label,
        destinationCountry: formData.get('destinationCountry'),
        destinationPort: destinationPortInfo.value,
        destinationPortLabel: destinationPortInfo.label,
        transportMode: formData.get('transportMode'),
        riskProfile: formData.get('riskProfile'),
        notes: formData.get('notes'),
    };
    
    const recommendations = insuranceCatalogue
        .map((product) => scoreInsuranceProduct(shipment, product))
        .filter((rec) => rec.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    renderInsuranceResults(recommendations);
    
    const resultsContainer = document.getElementById('insurance-results');
    if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setInsuranceSubmitLoading(false);
}

/**
 * Export insurance results
 */
function exportInsuranceResults() {
    const resultsContainer = document.getElementById('insurance-results');
    const cards = resultsContainer ? [...resultsContainer.querySelectorAll('.insurance-result-card')] : [];
    
    if (!cards.length) {
        alert('No results to export. Please generate recommendations first.');
        return;
    }
    
    const data = cards.map((card) => ({
        policy: card.querySelector('h3').textContent,
        provider: card.querySelector('p').textContent,
        score: card.querySelector('.insurance-score-badge').textContent,
        url: card.querySelector('.insurance-result-link')?.href ?? '',
        details: [...card.querySelectorAll('li')].map((li) => li.textContent),
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'insurance-recommendations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Setup insurance event listeners
 */
function setupInsuranceEventListeners() {
    const insuranceForm = document.getElementById('shipment-form');
    const exportBtn = document.getElementById('insurance-export-btn');
    
    if (insuranceForm) {
        insuranceForm.addEventListener('submit', handleInsuranceSubmit);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportInsuranceResults);
    }
}

// Initialize insurance when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all DOM elements are ready
    setTimeout(() => {
        initializeInsuranceModule();
    }, 100);
});

// ============================================
// PRODUCTS MODULE
// ============================================

let productsCache = [];
let productImageData = {
    base64: '',
    fileName: '',
    fileType: ''
};
let productModuleInitialized = false;

function initializeProductModule() {
    if (productModuleInitialized) return;

    const productForm = document.getElementById('productForm');
    const productImageInput = document.getElementById('productImage');

    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    if (productImageInput) {
        productImageInput.addEventListener('change', handleProductImageChange);
    }

    productModuleInitialized = true;
    
    // Attempt initial load (will no-op if not authenticated yet)
    setTimeout(() => {
        loadProductsFromFirebase();
    }, 150);
}

function showProductMessage(message, type = 'success') {
    const messageEl = document.getElementById('productFormMessage');
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = 'product-message active';
    if (type) {
        messageEl.classList.add(type);
    }
}

function resetProductMessage() {
    const messageEl = document.getElementById('productFormMessage');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'product-message';
    }
}

function resetProductImagePreview() {
    const preview = document.getElementById('productImagePreview');
    const imageInput = document.getElementById('productImage');
    productImageData = { base64: '', fileName: '', fileType: '' };
    if (preview) {
        preview.innerHTML = '<span>No image selected</span>';
    }
    if (imageInput) {
        imageInput.value = '';
    }
}

async function handleProductImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showProductMessage('Image size should be less than 5 MB.', 'error');
        event.target.value = '';
        return;
    }

    try {
        const base64 = await fileToBase64(file);
        productImageData = {
            base64,
            fileName: file.name,
            fileType: file.type
        };

        const preview = document.getElementById('productImagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${base64}" alt="${file.name}">`;
        }

        showProductMessage('Image processed securely and ready to upload.', 'success');
    } catch (error) {
        console.error('Error converting product image:', error);
        showProductMessage('Unable to process the image. Please try a different file.', 'error');
    }
}

function escapeHTML(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return entities[char] || char;
    });
}

function formatProductPrice(product) {
    if (product && Number.isFinite(Number(product.priceValue))) {
        const currency = product.priceCurrency || 'USD';
        const amount = Number(product.priceValue).toLocaleString(undefined, { maximumFractionDigits: 2 });
        return `${escapeHTML(currency)} ${amount}`;
    }
    return 'On request';
}

function formatProductDate(value) {
    if (!value) return 'Recently updated';
    try {
        return new Date(value).toLocaleDateString();
    } catch (error) {
        return 'Recently updated';
    }
}

async function handleProductSubmit(event) {
    event.preventDefault();
    resetProductMessage();

    const user = auth?.currentUser;
    if (!user || !database) {
        showProductMessage('Please login to add products.', 'error');
        return;
    }

    const submitBtn = document.getElementById('productSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    const priceValueInput = document.getElementById('priceValue')?.value;
    const parsedPrice = priceValueInput ? parseFloat(priceValueInput) : null;

    const payload = {
        name: document.getElementById('productName')?.value?.trim(),
        category: document.getElementById('productCategory')?.value || '',
        hsCode: document.getElementById('hsCodeLookup')?.value?.trim() || '',
        targetMarkets: document.getElementById('targetMarkets')?.value?.trim() || '',
        incoterm: document.getElementById('incoterm')?.value || '',
        priceCurrency: document.getElementById('priceCurrency')?.value || 'USD',
        priceValue: Number.isFinite(parsedPrice) ? parsedPrice : null,
        minOrderQty: document.getElementById('minOrderQty')?.value?.trim() || '',
        productionCapacity: document.getElementById('productionCapacity')?.value?.trim() || '',
        leadTime: document.getElementById('leadTime')?.value?.trim() || '',
        certifications: document.getElementById('certifications')?.value?.trim() || '',
        complianceNotes: document.getElementById('complianceNotes')?.value?.trim() || '',
        description: document.getElementById('productDescription')?.value?.trim(),
        specs: document.getElementById('productSpecs')?.value?.trim() || '',
        packagingDetails: document.getElementById('packagingDetails')?.value?.trim() || '',
        image: productImageData.base64 || '',
        imageFileName: productImageData.fileName || '',
        imageFileType: productImageData.fileType || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (!payload.name) {
        showProductMessage('Product name is required.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
        return;
    }

    if (!payload.description) {
        showProductMessage('Please add a short sales description.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
        return;
    }

    try {
        const userProductsRef = database.ref(`users/${user.uid}/products`);
        const productRef = userProductsRef.push();
        const productId = productRef.key;

        const userName = user.displayName || user.email || 'Exporter';
        const catalogPayload = {
            ...payload,
            productId,
            userId: user.uid,
            exporterName: userName
        };

        await productRef.set(payload);
        await syncProductCatalog(productId, catalogPayload);
        showProductMessage('Product saved successfully.', 'success');
        event.target.reset();
        resetProductImagePreview();
        await loadProductsFromFirebase();
    } catch (error) {
        console.error('Error saving product:', error);
        showProductMessage('Failed to save product. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
    }
}

async function syncProductCatalog(productId, payload) {
    if (!productId || !payload || !database) return;
    try {
        await database.ref(`productCatalog/${productId}`).set(payload);
    } catch (error) {
        console.warn('Product catalog sync skipped:', error?.code || error?.message || error);
    }
}

async function loadProductsFromFirebase() {
    const listEl = document.getElementById('productList');
    const emptyEl = document.getElementById('productListEmpty');
    const badgeEl = document.getElementById('productCountBadge');

    if (!listEl || !emptyEl) return;

    const user = auth?.currentUser;
    if (!user || !database) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = '<p>Please login to manage your product catalog.</p>';
        if (badgeEl) badgeEl.textContent = '0 items';
        return;
    }

    listEl.innerHTML = '<div class="product-loading">Loading products...</div>';

    try {
        const snapshot = await database.ref(`users/${user.uid}/products`).once('value');
        const data = snapshot.val() || {};

        const products = Object.entries(data).map(([id, value]) => ({
            id,
            ...value
        })).sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
        });

        productsCache = products;
        renderProductList(products);
        if (badgeEl) {
            badgeEl.textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
        }
    } catch (error) {
        console.error('Error loading products:', error);
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = '<p>Unable to load products right now. Please try again later.</p>';
        if (badgeEl) badgeEl.textContent = '0 items';
    }
}

function renderProductList(products = []) {
    const listEl = document.getElementById('productList');
    const emptyEl = document.getElementById('productListEmpty');
    if (!listEl || !emptyEl) return;

    if (!products.length) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    const randomId = () => Math.random().toString(36).substring(2, 9);

    listEl.innerHTML = products
        .map((product) => buildProductCard(product, {
            summaryId: `productSummary-${product.id || randomId()}`,
            contentId: `productContent-${product.id || randomId()}`,
        }))
        .join('');

    const summaryToggles = listEl.querySelectorAll('.product-card-summary');
    summaryToggles.forEach((summaryEl) => {
        summaryEl.addEventListener('click', toggleProductContent);
    });
}

function toggleProductContent(event) {
    const summaryEl = event.currentTarget;
    const cardEl = summaryEl.closest('.product-card');
    const contentEl = cardEl?.querySelector('.product-card-content');
    const iconEl = summaryEl.querySelector('.product-card-toggle-icon');

    if (!contentEl) return;

    const isExpanded = contentEl.classList.contains('active');
    const nextState = !isExpanded;
    contentEl.classList.toggle('active', nextState);
    contentEl.hidden = !nextState;
    summaryEl.setAttribute('aria-expanded', String(nextState));

    if (iconEl) {
        iconEl.classList.toggle('expanded', nextState);
    }
}

async function deleteProduct(productId) {
    if (!productId) return;

    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    const user = auth?.currentUser;
    if (!user || !database) {
        showProductMessage('Please login to manage products.', 'error');
        return;
    }

    try {
        await database.ref(`users/${user.uid}/products/${productId}`).remove();
        await removeProductFromCatalog(productId);
        showProductMessage('Product removed from your catalog.', 'success');
        await loadProductsFromFirebase();
    } catch (error) {
        console.error('Error deleting product:', error);
        showProductMessage('Unable to delete product. Please try again.', 'error');
    }
}

async function removeProductFromCatalog(productId) {
    if (!productId || !database) return;
    try {
        await database.ref(`productCatalog/${productId}`).remove();
    } catch (error) {
        console.warn('Product catalog removal skipped:', error?.code || error?.message || error);
    }
}

function buildProductCard(product, ids = {}) {
    const safeName = escapeHTML(product.name || 'Untitled Product');
    const categoryLabel = escapeHTML(product.category || 'General');
    const description = escapeHTML(product.description || 'No description shared.');
    const price = formatProductPrice(product);
    const incoterm = escapeHTML(product.incoterm ? product.incoterm.toUpperCase() : 'Flexible');
    const moq = escapeHTML(product.minOrderQty || 'On request');
    const capacity = escapeHTML(product.productionCapacity || 'Custom');
    const leadTime = escapeHTML(product.leadTime || 'To be confirmed');
    const hsCode = escapeHTML(product.hsCode || '—');
    const packaging = escapeHTML(product.packagingDetails || 'Standard export-ready packaging available.');
    const compliance = escapeHTML(product.complianceNotes || 'Complies with buyer / destination requirements.');
    const updatedDate = formatProductDate(product.updatedAt || product.createdAt);

    const specItems = parseListInput(product.specs);
    const marketItems = parseListInput(product.targetMarkets);
    const certificationItems = parseListInput(product.certifications);

    const specListHtml = specItems.length ? `
        <div class="product-card-section">
            <h5>Key Specifications</h5>
            <ul class="product-spec-list">
                ${specItems.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    const marketChips = marketItems.length ? `
        <div class="product-chip-group">
            <span>Target Markets</span>
            <div class="product-chip-wrapper">
                ${marketItems.map(item => `<span class="product-chip">${escapeHTML(item)}</span>`).join('')}
            </div>
        </div>
    ` : '';

    const certificationChips = certificationItems.length ? `
        <div class="product-chip-group">
            <span>Certifications</span>
            <div class="product-chip-wrapper">
                ${certificationItems.map(item => `<span class="product-chip neutral">${escapeHTML(item)}</span>`).join('')}
            </div>
        </div>
    ` : '';

    const metrics = [
        { label: 'HS Code', value: hsCode },
        { label: 'Incoterm', value: incoterm },
        { label: 'Price', value: price },
        { label: 'MOQ', value: moq },
        { label: 'Capacity', value: capacity },
        { label: 'Lead Time', value: leadTime }
    ];

    const metricsHtml = metrics.map(metric => `
        <div class="product-metric">
            <span>${metric.label}</span>
            <strong>${metric.value}</strong>
        </div>
    `).join('');

    const summaryId = ids.summaryId || `productSummary-${product.id}`;
    const contentId = ids.contentId || `productContent-${product.id}`;

    return `
        <article class="product-card" aria-labelledby="${summaryId}">
            <div class="product-card-media">
                ${product.image
                    ? `<img src="${product.image}" alt="${safeName}">`
                    : `<div class="product-card-placeholder">Image pending</div>`
                }
                <span class="product-card-badge">${categoryLabel}</span>
            </div>
            <button
                id="${summaryId}"
                class="product-card-summary"
                aria-expanded="false"
                aria-controls="${contentId}"
            >
                <div>
                    <h4>${safeName}</h4>
                    <p>${price}</p>
                </div>
                <span class="product-card-toggle-icon" aria-hidden="true"></span>
            </button>

            <div id="${contentId}" class="product-card-content" hidden>
                <p class="product-card-subtitle">${description}</p>
                <div class="product-card-info-grid">
                    ${metricsHtml}
                </div>
                ${specListHtml}
                ${marketChips}
                ${certificationChips}
                <div class="product-card-notes">
                    <div class="product-card-note">
                        <span>Packaging & Labelling</span>
                        <p>${packaging}</p>
                    </div>
                    <div class="product-card-note">
                        <span>Compliance Notes</span>
                        <p>${compliance}</p>
                    </div>
                </div>
                <div class="product-card-footer">
                    <small>Updated ${updatedDate}</small>
                    <div class="product-card-actions">
                        <button type="button" class="product-card-action delete" onclick="deleteProduct('${product.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function parseListInput(value = '') {
    if (!value) return [];
    return value
        .split(/[\n,;•]+/)
        .map(item => item.trim())
        .filter(Boolean);
}

// ============================================
// SUPPORT MODULE
// ============================================

const supportFaqData = [
    {
        question: 'How do I complete my eKYC?',
        answer: 'Open the Documents tab and click “Complete eKYC”. Upload your Aadhaar/PAN/Passport along with business and bank proofs, then submit the video verification request.'
    },
    {
        question: 'Which documents are required for Indian exporters?',
        answer: 'Typically IEC certificate, GST certificate, PAN, address proof, bank letter/cancelled cheque, and any licenses specific to your product category.'
    },
    {
        question: 'Which documents are required for international exporters?',
        answer: 'Common documents include Certificate of Origin, commercial invoice, packing list, inspection certificates, insurance policy, and destination-specific compliance certificates.'
    },
    {
        question: 'How to upload ID proof or business proof?',
        answer: 'Go to the Profile modal → Compliance tab and upload the respective files. They are stored securely in Firebase with Base64 encoding.'
    },
    {
        question: 'What is currency protection / forward contract?',
        answer: 'Forward Contracts lock in an exchange rate for a future date so your export receivables aren’t impacted by FX fluctuations. See the Forward Contracts tab for details.'
    },
    {
        question: 'How does QR shipment documentation work?',
        answer: 'All shipment documents are digitised, stored against your account, and can be shared via QR codes with logistics partners for faster verification.'
    },
    {
        question: 'How to track my shipment?',
        answer: 'Use the Dashboard or Insurance tab to see live shipment milestones once tracking IDs are added. We send alerts for exceptions automatically.'
    },
    {
        question: 'How to contact support?',
        answer: 'Use this chat window or email support@globalguardexports.com. When an admin is online you can start a live session.'
    }
];

const supportBotKnowledge = [
    {
        keywords: ['kyc', 'verification', 'video call', 'ekyc', 'id proof'],
        answer: 'You can complete eKYC from the Documents tab. Upload Aadhaar/PAN/Passport plus business/bank proofs, submit for review, and request a video verification slot.'
    },
    {
        keywords: ['document', 'upload', 'storage', 'where are my documents', 'doc'],
        answer: 'All uploaded documents are stored securely in Firebase Realtime Database and appear inside your Document Library. You can preview, download, or delete them anytime.'
    },
    {
        keywords: ['shipment', 'track', 'tracking'],
        answer: 'Shipment tracking lives in the Dashboard insights and Insurance tab. Add your tracking IDs and we’ll surface live milestones plus risk alerts.'
    },
    {
        keywords: ['forward contract', 'currency', 'fx', 'hedge'],
        answer: 'A Forward Contract locks in an exchange rate for a future payout. Use the Forward Contracts tab to simulate rates and share details with your bank.'
    },
    {
        keywords: ['insurance', 'risk', 'coverage'],
        answer: 'Our Insurance panel compares marine policies, coverage adequacy, and appetite for your corridor. Complete the shipment questionnaire to get matched policies instantly.'
    },
    {
        keywords: ['support', 'human', 'agent'],
        answer: 'I am always available. If an admin agent is online you’ll also see “Chat with Admin (Live)” in this window for real-time help.'
    }
];

let supportModuleInitialized = false;
let supportMessagesQuery = null;
let supportMessagesRendered = new Set();
let supportMessagesCurrentUserId = null;
let supportAdminStatusUnsub = null;
let supportAdminOnline = false;
let supportLastAdminStatus = null;
let supportBotTypingTimer = null;

function initializeSupportModule() {
    if (!supportModuleInitialized) {
        const form = document.getElementById('supportChatForm');
        const input = document.getElementById('supportMessageInput');
        if (!form || !input) return;

        form.addEventListener('submit', handleSupportFormSubmit);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSupportFormSubmit(event);
            }
        });

        renderSupportFaq();
        listenForSupportAdminStatus();
        supportModuleInitialized = true;
    }

    ensureSupportChatListeners();
}

function listenForSupportAdminStatus() {
    if (!database) return;
    if (supportAdminStatusUnsub) {
        supportAdminStatusUnsub();
        supportAdminStatusUnsub = null;
    }

    const statusRef = database.ref('supportStatus/admin');
    const handleStatusValue = (snapshot) => {
        const data = snapshot.val() || {};
        const isOnline = data.status === 'online';
        updateSupportAdminStatus(isOnline);
    };

    statusRef.on('value', handleStatusValue, (error) => {
        console.error('Support status listener error:', error);
    });

    supportAdminStatusUnsub = () => statusRef.off('value', handleStatusValue);
}

function updateSupportAdminStatus(isOnline) {
    supportAdminOnline = !!isOnline;
    const statusIndicator = document.getElementById('supportStatusIndicator');
    const statusLabel = document.getElementById('supportStatusLabel');
    const liveBadge = document.getElementById('supportLiveBadge');
    const liveBadgeText = document.getElementById('supportLiveBadgeText');

    if (statusIndicator && statusLabel) {
        const dot = statusIndicator.querySelector('.status-dot');
        statusLabel.textContent = isOnline ? 'Admin Online · Live chat available' : 'Admin Offline · Bot assisting';
        if (dot) {
            dot.classList.toggle('online', isOnline);
        }
    }

    if (liveBadge && liveBadgeText) {
        liveBadge.classList.toggle('live', isOnline);
        liveBadgeText.textContent = isOnline ? 'Admin Live' : 'Bot Assisting';
    }

    const helperText = document.getElementById('supportChatHelperText');
    if (helperText) {
        helperText.textContent = isOnline
            ? 'Admin is online — your messages will reach our agent in real time.'
            : 'Admin is currently offline. Our support bot will assist you.';
    }

    if (supportLastAdminStatus !== null && supportLastAdminStatus && !isOnline) {
        appendSupportSystemMessage('Admin is currently offline. Our support bot will assist you.');
    }
    supportLastAdminStatus = isOnline;
}

async function ensureSupportChatListeners() {
    const user = auth?.currentUser;
    if (!user || !database) return;
    if (supportMessagesCurrentUserId === user.uid && supportMessagesQuery) return;
    await listenForSupportMessages();
}

async function listenForSupportMessages() {
    const user = auth?.currentUser;
    if (!user || !database) return;

    if (supportMessagesQuery) {
        supportMessagesQuery.off();
        supportMessagesQuery = null;
    }
    supportMessagesRendered.clear();
    supportMessagesCurrentUserId = user.uid;

    const messagesRef = database.ref(`supportChat/${user.uid}/messages`);
    const snapshot = await messagesRef.once('value');
    if (!snapshot.exists()) {
        await pushSupportMessage('bot', 'Hi! I’m your support assistant. How can I help you today?');
    }

    supportMessagesQuery = messagesRef.limitToLast(200);
    supportMessagesQuery.on('child_added', (childSnapshot) => {
        const message = childSnapshot.val();
        const messageId = childSnapshot.key;
        if (!messageId || supportMessagesRendered.has(messageId)) return;
        supportMessagesRendered.add(messageId);
        appendSupportMessage({ id: messageId, ...message });
    });
}

async function handleSupportFormSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('supportMessageInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    await pushSupportMessage('user', text);

    if (!supportAdminOnline) {
        queueSupportBotResponse(text);
    }
}

async function pushSupportMessage(sender, text) {
    const user = auth?.currentUser;
    if (!user || !database) return;
    const messageRef = database.ref(`supportChat/${user.uid}/messages`).push();
    await messageRef.set({
        sender,
        text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function appendSupportMessage(message) {
    const container = document.getElementById('supportMessages');
    if (!container || !message) return;

    const wrap = document.createElement('div');
    wrap.className = `support-message ${message.sender || 'system'}`;

    const bubble = document.createElement('div');
    bubble.className = 'support-bubble';
    bubble.textContent = message.text || '';
    wrap.appendChild(bubble);

    const timestamp = document.createElement('small');
    const date = message.timestamp
        ? new Date(message.timestamp)
        : new Date();
    timestamp.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    wrap.appendChild(timestamp);

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function appendSupportSystemMessage(text) {
    const container = document.getElementById('supportMessages');
    if (!container) return;

    const wrap = document.createElement('div');
    wrap.className = 'support-message bot';
    const bubble = document.createElement('div');
    bubble.className = 'support-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function queueSupportBotResponse(userQuery) {
    showSupportBotTyping(true);
    const response = getSupportBotResponse(userQuery);
    const delay = Math.min(Math.max(userQuery.length * 30, 600), 2000);

    if (supportBotTypingTimer) {
        clearTimeout(supportBotTypingTimer);
    }

    supportBotTypingTimer = setTimeout(async () => {
        showSupportBotTyping(false);
        await pushSupportMessage('bot', response);
    }, delay);
}

function getSupportBotResponse(query = '') {
    const normalized = query.toLowerCase();
    const knowledge = supportBotKnowledge.find(entry =>
        entry.keywords.some(keyword => normalized.includes(keyword))
    );

    if (knowledge) {
        return knowledge.answer;
    }

    return 'I’ve shared this with our team. In the meantime, you can explore the FAQs or provide more details so I can assist better!';
}

function showSupportBotTyping(isTyping) {
    const typingEl = document.getElementById('supportBotTyping');
    if (!typingEl) return;
    typingEl.style.display = isTyping ? 'flex' : 'none';
}

function detachSupportChatListeners() {
    if (supportMessagesQuery) {
        supportMessagesQuery.off();
        supportMessagesQuery = null;
    }
    supportMessagesRendered.clear();
    supportMessagesCurrentUserId = null;
    if (supportAdminStatusUnsub) {
        supportAdminStatusUnsub();
        supportAdminStatusUnsub = null;
    }
}

function renderSupportFaq() {
    const container = document.getElementById('supportFaqList');
    if (!container) return;
    container.innerHTML = '';

    supportFaqData.forEach((faq, index) => {
        const item = document.createElement('div');
        item.className = 'support-faq-item';

        const button = document.createElement('button');
        button.className = 'support-faq-trigger';
        button.type = 'button';
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = `
            <span>${faq.question}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;

        const answer = document.createElement('div');
        answer.className = 'support-faq-answer';
        answer.textContent = faq.answer;

        button.addEventListener('click', () => {
            const isOpen = answer.classList.toggle('active');
            button.classList.toggle('active', isOpen);
            button.setAttribute('aria-expanded', String(isOpen));
        });

        item.appendChild(button);
        item.appendChild(answer);
        container.appendChild(item);
    });
}

// ============================================
// ANALYTICS MODULE
// ============================================

let analyticsInitialized = false;

function initializeAnalyticsModule() {
    if (analyticsInitialized) return;

    const refreshBtn = document.getElementById('analyticsRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAnalyticsFromFirebase(true));
    }

    analyticsInitialized = true;
    setTimeout(() => {
        loadAnalyticsFromFirebase();
    }, 200);
}

async function loadAnalyticsFromFirebase(fromRefreshButton = false) {
    const loadingEl = document.getElementById('analyticsLoading');
    const emptyEl = document.getElementById('analyticsEmpty');
    const contentEl = document.getElementById('analyticsContent');

    if (!loadingEl || !emptyEl || !contentEl) return;

    loadingEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    contentEl.style.display = 'none';

    const user = auth?.currentUser;
    if (!user || !database) {
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'flex';
        emptyEl.querySelector('p').textContent = 'Please login to view analytics.';
        return;
    }

    try {
        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val() || {};
        const productsData = userData.products || {};
        const documentsData = userData.documents || {};

        const products = Object.entries(productsData).map(([id, product]) => ({
            id,
            ...product
        }));

        const documentTypes = collectDocumentTypes(documentsData);
        const productCount = products.length;
        const documentCount = documentTypes.length;
        const hasData = productCount > 0 || documentCount > 0;

        if (!hasData) {
            emptyEl.style.display = 'flex';
            emptyEl.querySelector('p').textContent = 'Add products or documents to unlock analytics.';
            contentEl.style.display = 'none';
            return;
        }

        const metrics = buildAnalyticsMetrics(products, documentTypes, userData);
        renderAnalytics(metrics);
        emptyEl.style.display = 'none';
        contentEl.style.display = 'flex';
    } catch (error) {
        console.error('Error loading analytics:', error);
        emptyEl.style.display = 'flex';
        emptyEl.querySelector('p').textContent = 'Unable to load analytics right now. Please try again.';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function buildAnalyticsMetrics(products = [], documentTypes = [], userData = {}) {
    const priceEntries = [];
    const incotermCounts = {};
    const marketEntries = [];
    const certificationEntries = [];

    products.forEach((product) => {
        const priceValue = Number(product.priceValue);
        const currency = (product.priceCurrency || 'USD').toUpperCase();
        if (Number.isFinite(priceValue)) {
            priceEntries.push({ amount: priceValue, currency });
        }

        const incoterm = (product.incoterm || 'UNSPECIFIED').toUpperCase();
        incotermCounts[incoterm] = (incotermCounts[incoterm] || 0) + 1;

        parseListInput(product.targetMarkets).forEach((market) => {
            if (!market) return;
            marketEntries.push(market);
        });

        parseListInput(product.certifications).forEach((cert) => {
            if (!cert) return;
            certificationEntries.push(cert);
        });
    });

    const priceSummary = summarizePrices(priceEntries);
    const markets = summarizeList(marketEntries, 5);
    const incoterms = Object.entries(incotermCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const recentProducts = [...products]
        .sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
        })
        .slice(0, 4)
        .map((product) => ({
            name: product.name || 'Untitled Product',
            incoterm: (product.incoterm || 'Unspecified').toUpperCase(),
            updatedAt: formatProductDate(product.updatedAt || product.createdAt)
        }));

    const complianceStatus = documentTypes.length >= 3
        ? 'Documents look healthy'
        : 'Add more compliance docs';

    return {
        productCount: products.length,
        documentCount: documentTypes.length,
        catalogValueLabel: priceSummary.catalogValue,
        avgPriceLabel: priceSummary.avgPrice,
        priceRangeLabel: priceSummary.range,
        topIncotermLabel: incoterms[0]?.name || 'Add incoterms',
        complianceStatus,
        documentCoverageLabel: documentTypes.length ? `${documentTypes.length} document type(s)` : 'No documents yet',
        markets,
        incoterms,
        documentTypes,
        recentProducts,
        lastRefreshed: new Date()
    };
}

function renderAnalytics(data) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('analyticsProductCount', data.productCount);
    setText('analyticsDocumentCount', data.documentCount);
    setText('analyticsCatalogValue', `Catalog value: ${data.catalogValueLabel}`);
    setText('analyticsAvgPrice', data.avgPriceLabel);
    setText('analyticsPriceRange', `Range: ${data.priceRangeLabel}`);
    setText('analyticsTopIncoterm', data.topIncotermLabel);
    setText('analyticsComplianceStatus', data.complianceStatus);
    setText('analyticsDocumentCoverage', data.documentCoverageLabel);

    const timestampEl = document.getElementById('analyticsLastRefreshed');
    if (timestampEl && data.lastRefreshed) {
        timestampEl.textContent = `Updated ${data.lastRefreshed.toLocaleString()}`;
    }

    renderAnalyticsList('analyticsMarketList', data.markets, (item) =>
        `<li><strong>${escapeHTML(item.name)}</strong><span>${item.count} listing${item.count === 1 ? '' : 's'}</span></li>`
    );

    renderAnalyticsList('analyticsIncotermList', data.incoterms, (item) =>
        `<li><strong>${escapeHTML(item.name)}</strong><span>${item.count} listing${item.count === 1 ? '' : 's'}</span></li>`
    );

    renderAnalyticsList('analyticsDocumentList', data.documentTypes, (item) => {
        const label = documentTypeMap[item]?.name || item;
        return `<li><strong>${escapeHTML(label)}</strong><span>On file</span></li>`;
    });

    renderAnalyticsList('analyticsRecentProducts', data.recentProducts, (item) =>
        `<li><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.updatedAt)} · ${escapeHTML(item.incoterm)}</span></li>`
    );
}

function renderAnalyticsList(elementId, rows, template) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!rows || !rows.length) {
        el.innerHTML = '<li><strong>—</strong><span>No data yet</span></li>';
        return;
    }

    el.innerHTML = rows.map(template).join('');
}

function summarizePrices(entries = []) {
    if (!entries.length) {
        return {
            catalogValue: '—',
            avgPrice: '—',
            range: '—'
        };
    }

    const currencySet = new Set(entries.map(item => item.currency));
    if (currencySet.size > 1) {
        return {
            catalogValue: 'Multi-currency catalog',
            avgPrice: 'Mixed currencies',
            range: 'Mixed currencies'
        };
    }

    const currency = entries[0].currency;
    const amounts = entries.map(item => item.amount);
    const total = amounts.reduce((sum, value) => sum + value, 0);
    const avg = total / amounts.length;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    return {
        catalogValue: formatCurrencyValue(total, currency),
        avgPrice: formatCurrencyValue(avg, currency),
        range: `${formatCurrencyValue(min, currency)} – ${formatCurrencyValue(max, currency)}`
    };
}

function summarizeList(items = [], limit = 5) {
    const counts = {};
    items.forEach(item => {
        const key = item || 'Unspecified';
        counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function formatCurrencyValue(amount, currency = 'USD') {
    if (!Number.isFinite(amount)) return '—';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function collectDocumentTypes(documents = {}) {
    const types = new Set();
    Object.keys(documents).forEach((key) => {
        if (key.endsWith('FileName') || key.endsWith('FileType')) return;
        const value = documents[key];
        if (!value) return;
        types.add(key);
    });
    return Array.from(types);
}

// ============================================
// DOCUMENTS MODULE
// ============================================

let documentsCache = [];
let currentDocument = null;

const documentTypeMap = {
    'iecCertificate': { name: 'IEC Certificate', category: 'iec', icon: '📋' },
    'gstCertificate': { name: 'GST Certificate', category: 'gst', icon: '📋' },
    'companyRegistration': { name: 'Company Registration', category: 'company', icon: '🏢' },
    'ownerIdProof': { name: 'Owner ID Proof', category: 'idproof', icon: '🪪' },
    'addressProof': { name: 'Address Proof', category: 'addressproof', icon: '📮' },
    'profilePhoto': { name: 'Profile Photo', category: 'profile', icon: '👤' },
    'identityProof': { name: 'Identity Proof', category: 'compliance', icon: '🪪' },
    'businessProof': { name: 'Business Proof', category: 'compliance', icon: '🏢' },
    'bankProof': { name: 'Bank Proof', category: 'finance', icon: '🏦' },
    'selfie': { name: 'Verification Selfie', category: 'verification', icon: '🤳' },
};

const DOCUMENT_MODES = ['sea', 'air', 'imports', 'exports'];

const countryDocumentMatrix = [
    {
        id: 'india',
        name: 'India',
        corridor: 'Nhava Sheva (JNPT), Mundra, Chennai',
        modes: ['sea', 'air', 'exports'],
        quickChecklist: [
            'Commercial Invoice with HS and GST compliance – see ICEGATE valuation guidance.',
            'Packing List carton-wise for customs inspection.',
            'Shipping Bill submitted electronically via ICEGATE before port entry.',
            'Carrier issued Bill of Lading or Air Waybill for proof of shipment.',
            'Certificate of Origin from DGFT/chamber for FTA benefits (e-COO portal).',
            'Export Declaration (GR/SDF equivalents) filed with Authorized Dealer bank per RBI rules.',
        ],
        requirements: [
            { document: 'Commercial Invoice', use: 'Customs valuation, buyer payment documentation', issuer: 'Exporter / Company', linkLabel: 'ICEGATE Guidelines', linkUrl: 'https://icegate.gov.in' },
            { document: 'Packing List', use: 'Physical examination & load planning', issuer: 'Exporter / Company', linkLabel: 'CBIC Export Procedures', linkUrl: 'https://www.cbic.gov.in' },
            { document: 'Shipping Bill', use: 'Primary export declaration at port', issuer: 'Indian Customs via broker/exporter', linkLabel: 'ICEGATE – Shipping Bill', linkUrl: 'https://icegate.gov.in' },
            { document: 'Bill of Lading / Air Waybill', use: 'Title transfer & shipment proof', issuer: 'Shipping line / Freight forwarder / Airline', linkLabel: 'Directorate General of Shipping', linkUrl: 'https://www.dgshipping.gov.in' },
            { document: 'Certificate of Origin', use: 'Claim preferential duty at destination', issuer: 'DGFT / Chamber of Commerce', linkLabel: 'DGFT e-COO Portal', linkUrl: 'https://coo.dgft.gov.in' },
            { document: 'Export Declaration (GR/SDF)', use: 'Foreign exchange compliance with RBI', issuer: 'Authorized Dealer Bank & Exporter', linkLabel: 'RBI Export FAQs', linkUrl: 'https://rbi.org.in' },
        ],
    },
    {
        id: 'united-states',
        name: 'United States',
        corridor: 'Ports: New York/New Jersey, Los Angeles, Savannah',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice with value, terms, HS code (CBP).',
            'Packing List for CBP inspection and terminal handling.',
            'Carrier Bill of Lading or Air Waybill for arrival notice.',
            'ISF 10+2 security filing for ocean shipments before loading.',
            'CBP Entry (3461/7501) filed via customs broker in ACE.',
            'Partner agency filings (FDA/USDA) when applicable.',
        ],
        requirements: [
            { document: 'Commercial Invoice', use: 'CBP customs entry & duty assessment', issuer: 'Exporter / Foreign Supplier', linkLabel: 'US CBP', linkUrl: 'https://www.cbp.gov' },
            { document: 'Packing List', use: 'CBP inspection & deconsolidation', issuer: 'Exporter / Foreign Supplier', linkLabel: 'CBP Trade', linkUrl: 'https://www.cbp.gov/trade' },
            { document: 'Bill of Lading / Air Waybill', use: 'Arrival notice & cargo release', issuer: 'Carrier / NVOCC / Airline', linkLabel: 'Federal Maritime Commission', linkUrl: 'https://www.fmc.gov' },
            { document: 'ISF 10+2', use: 'Security filing for ocean cargo', issuer: 'US Importer / Customs Broker', linkLabel: 'CBP ISF 10+2', linkUrl: 'https://www.cbp.gov/border-security/ports-entry/cargo-security/importer-security-filing-102' },
            { document: 'Customs Entry (CBP 3461/7501)', use: 'Formal import clearance', issuer: 'US Customs Broker / Importer', linkLabel: 'CBP Basic Importing', linkUrl: 'https://www.cbp.gov/trade/basic-import-export' },
            { document: 'FDA / USDA / Partner Agency Docs', use: 'Regulatory clearance for controlled goods', issuer: 'US FDA / USDA / Relevant agency', linkLabel: 'US FDA Import Basics', linkUrl: 'https://www.fda.gov/industry/import-basics' },
        ],
    },
    {
        id: 'european-union',
        name: 'European Union',
        corridor: 'Ports: Rotterdam, Hamburg, Antwerp',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List for customs declaration/VAT.',
            'Carrier Bill of Lading or Air Waybill for delivery order.',
            'ENS / ICS2 security filing before arrival.',
            'EU SAD customs declaration lodged via broker.',
            'EUR.1 / REX / Certificate of origin for preferential duty.',
            'Product specific certificates (health, phytosanitary, CE).',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'Customs declaration base, VAT & duty calc', issuer: 'Exporter', linkLabel: 'EU Taxation & Customs', linkUrl: 'https://taxation-customs.ec.europa.eu' },
            { document: 'Bill of Lading / Air Waybill', use: 'Proof of shipment, release at port', issuer: 'Carrier / Freight Forwarder', linkLabel: 'Port of Rotterdam', linkUrl: 'https://www.portofrotterdam.com' },
            { document: 'ENS (ICS2)', use: 'Pre-arrival safety/security filing', issuer: 'Carrier / Representative', linkLabel: 'ICS2 Security Filing', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/customs-security/import-control-system-2-ics2_en' },
            { document: 'EU Customs Declaration (SAD)', use: 'Release into free circulation or regimes', issuer: 'Customs Broker / Importer', linkLabel: 'EU Customs Procedures', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/customs-procedures_en' },
            { document: 'Certificates (EUR.1 / REX / Origin)', use: 'Preferential duty & FTA claims', issuer: 'Exporter / Competent authority', linkLabel: 'EU Preferential Origin', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/preferential-origins_en' },
            { document: 'Product-Specific Certificates', use: 'Health/phytosanitary/CE compliance', issuer: 'Competent Authorities / Labs', linkLabel: 'EU Sanitary Rules', linkUrl: 'https://ec.europa.eu/info/food-farming-fisheries/farming/international-cooperation/trade_en' },
        ],
    },
    {
        id: 'united-kingdom',
        name: 'United Kingdom',
        corridor: 'Ports: Felixstowe, Southampton, London Gateway',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List per HMRC guidance.',
            'Bill of Lading/AWB for UK Border Force release.',
            'CDS customs declaration via broker/trader.',
            'UK Certificate of Origin / EUR.1 from chamber when required.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'UK customs declaration data', issuer: 'Exporter', linkLabel: 'HMRC Customs Declaration Guidance', linkUrl: 'https://www.gov.uk/guidance/filling-in-your-customs-declaration' },
            { document: 'Bill of Lading / Air Waybill', use: 'Evidence of carriage & release', issuer: 'Carrier / Freight Forwarder', linkLabel: 'UK Border Force', linkUrl: 'https://www.gov.uk/government/organisations/border-force' },
            { document: 'CDS Customs Declaration', use: 'Entry into HMRC CDS system', issuer: 'Customs broker / Importer', linkLabel: 'Get access to CDS', linkUrl: 'https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service' },
            { document: 'Certificate of Origin / EUR.1', use: 'Preferential duty or buyer requirement', issuer: 'British Chambers of Commerce', linkLabel: 'British Chambers Export Docs', linkUrl: 'https://www.britishchambers.org.uk/page/export-documentation' },
        ],
    },
    {
        id: 'canada',
        name: 'Canada',
        corridor: 'Ports: Vancouver, Prince Rupert, Montreal',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice or Canada Customs Invoice (CBSA).',
            'Packing List for CBSA / CFIA inspection.',
            'Carrier Bill of Lading or Air Waybill.',
            'Customs Declaration (B3) filed via broker/importer in CARM.',
            'CUSMA/phytosanitary certificates when commodity requires.',
        ],
        requirements: [
            { document: 'Commercial Invoice / Canada Customs Invoice', use: 'Import valuation & CBSA assessment', issuer: 'Exporter / Importer', linkLabel: 'CBSA Importing', linkUrl: 'https://www.cbsa-asfc.gc.ca/import/menu-eng.html' },
            { document: 'Packing List', use: 'Inspection & de-stuffing', issuer: 'Exporter', linkLabel: 'CBSA Programs', linkUrl: 'https://www.cbsa-asfc.gc.ca/prog/ccp-pcc/menu-eng.html' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest & release', issuer: 'Carrier', linkLabel: 'Port of Vancouver', linkUrl: 'https://www.portvancouver.com' },
            { document: 'Customs Declaration (B3)', use: 'Entry into Canada (CARM/CCS)', issuer: 'Customs broker / Importer', linkLabel: 'CBSA CARM', linkUrl: 'https://www.cbsa-asfc.gc.ca/prog/carm-gcra/menu-eng.html' },
            { document: 'Certificates (CUSMA, Phyto, CFIA)', use: 'Reduced duty or sanitary clearance', issuer: 'Authorized bodies / CFIA', linkLabel: 'CFIA Import Guidance', linkUrl: 'https://inspection.canada.ca' },
        ],
    },
    {
        id: 'australia',
        name: 'Australia',
        corridor: 'Ports: Sydney, Melbourne, Brisbane',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List (Australian Border Force).',
            'Bill of Lading or Air Waybill for ICS filing.',
            'Import Declaration (N10/N20) via Integrated Cargo System.',
            'Biosecurity treatment or phytosanitary certificates (DAFF).',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'ABF import declaration', issuer: 'Exporter', linkLabel: 'Australian Border Force', linkUrl: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest submission & delivery order', issuer: 'Carrier', linkLabel: 'Integrated Cargo System', linkUrl: 'https://www.abf.gov.au/help-and-support/ics' },
            { document: 'Import Declaration (ICS)', use: 'Formal entry (N10/N20)', issuer: 'Customs broker / Importer', linkLabel: 'ICS Lodgement', linkUrl: 'https://www.abf.gov.au/help-and-support/ics' },
            { document: 'Biosecurity Certificates', use: 'DAFF clearance (phytosanitary/treatment)', issuer: 'Department of Agriculture / Competent labs', linkLabel: 'DAFF Biosecurity', linkUrl: 'https://www.agriculture.gov.au/biosecurity-trade/import' },
        ],
    },
    {
        id: 'china',
        name: 'China',
        corridor: 'Ports: Shanghai, Ningbo, Shenzhen',
        modes: ['sea', 'air', 'imports', 'exports'],
        quickChecklist: [
            'Commercial Invoice & Packing List aligned with GACC requirements.',
            'Bill of Lading / Air Waybill for manifest & release.',
            'CIQ / GACC declarations for regulated goods.',
            'Import/Export licenses, CCC or product registrations when required.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'GACC customs clearance', issuer: 'Exporter', linkLabel: 'China Customs', linkUrl: 'https://english.customs.gov.cn' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest submission & delivery order', issuer: 'Carrier', linkLabel: 'Port of Shanghai', linkUrl: 'https://www.portshanghai.com.cn/en' },
            { document: 'CIQ / GACC Declaration', use: 'Inspection & quarantine compliance', issuer: 'GACC / CIQ', linkLabel: 'GACC', linkUrl: 'https://www.gacc.gov.cn' },
            { document: 'Import/Export License & CCC certificate', use: 'Market access for regulated goods', issuer: 'MOFCOM / SAMR', linkLabel: 'MOFCOM Trade', linkUrl: 'http://english.mofcom.gov.cn' },
        ],
    },
    {
        id: 'japan',
        name: 'Japan',
        corridor: 'Ports: Tokyo, Yokohama, Osaka',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List per Japan Customs.',
            'Bill of Lading / Air Waybill for NACCS submission.',
            'Import Declaration via NACCS (broker).',
            'Certificates (fumigation, agriculture, PSE) per commodity.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'Japan Customs entry data', issuer: 'Exporter', linkLabel: 'Japan Customs', linkUrl: 'https://www.customs.go.jp/english/index.htm' },
            { document: 'Bill of Lading / Air Waybill', use: 'Transport evidence & NACCS filing', issuer: 'Carrier', linkLabel: 'NACCS', linkUrl: 'https://www.naccs.jp/english/' },
            { document: 'Import Declaration', use: 'Release into Japan via NACCS', issuer: 'Customs broker / Importer', linkLabel: 'NACCS User Guide', linkUrl: 'https://www.naccs.jp/english/service/' },
            { document: 'Certificates (PSE, Phyto, MAFF)', use: 'Commodity-specific compliance', issuer: 'MAFF / METI / Labs', linkLabel: 'MAFF Trade', linkUrl: 'https://www.maff.go.jp/e/index.html' },
        ],
    },
    {
        id: 'singapore',
        name: 'Singapore',
        corridor: 'Port of Singapore & Changi Airfreight Centre',
        modes: ['sea', 'air', 'imports', 'exports'],
        quickChecklist: [
            'Commercial Invoice & Packing List for Singapore Customs.',
            'Bill of Lading / Air Waybill for manifest submission in TradeNet.',
            'Permit applications lodged via TradeNet.',
            'Agency certificates (SFA, IMDA) for restricted goods.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'Baseline customs data', issuer: 'Exporter', linkLabel: 'Singapore Customs', linkUrl: 'https://www.customs.gov.sg' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest & delivery order', issuer: 'Carrier', linkLabel: 'MPA Singapore', linkUrl: 'https://www.mpa.gov.sg' },
            { document: 'TradeNet Permit', use: 'Import/export permit clearance', issuer: 'Trader / Declaring agent', linkLabel: 'TradeNet', linkUrl: 'https://www.customs.gov.sg/businesses/permit-declaration' },
            { document: 'Agency Certificates', use: 'Regulated commodities clearance (SFA, IMDA)', issuer: 'Competent agencies', linkLabel: 'Singapore Food Agency', linkUrl: 'https://www.sfa.gov.sg' },
        ],
    },
    {
        id: 'united-arab-emirates',
        name: 'United Arab Emirates',
        corridor: 'Ports: Jebel Ali, Khalifa Port, Dubai Airport',
        modes: ['sea', 'air', 'imports', 'exports'],
        quickChecklist: [
            'Commercial Invoice & Packing List attested as per UAE customs.',
            'Bill of Lading / Air Waybill for manifest submission.',
            'Import/Export declarations lodged via single window (Dubai Trade).',
            'Certificate of Origin via local chamber portals.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'Customs valuation & inspection', issuer: 'Exporter', linkLabel: 'Dubai Customs', linkUrl: 'https://www.dubaicustoms.gov.ae' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest filing & delivery order', issuer: 'Carrier', linkLabel: 'Dubai Trade', linkUrl: 'https://www.dubaitrade.ae' },
            { document: 'Import/Export Declaration', use: 'Single window clearance', issuer: 'Trader / Broker', linkLabel: 'Dubai Trade Portal', linkUrl: 'https://www.dubaitrade.ae' },
            { document: 'Certificate of Origin', use: 'Destination compliance / duty preference', issuer: 'Dubai Chamber / Local chambers', linkLabel: 'Dubai Chamber', linkUrl: 'https://www.dubaichamber.com' },
        ],
    },
    {
        id: 'saudi-arabia',
        name: 'Saudi Arabia',
        corridor: 'Ports: Jeddah Islamic Port, Dammam, Riyadh Air Cargo',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List registered on FASAH.',
            'Bill of Lading / Air Waybill uploaded through single window.',
            'SABER/SASO certificates for regulated products.',
            'Customs declaration filed via ZATCA.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'FASAH registration & customs valuation', issuer: 'Exporter', linkLabel: 'FASAH', linkUrl: 'https://www.fasah.sa/' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest submission', issuer: 'Carrier', linkLabel: 'Saudi Ports Authority (MAWANI)', linkUrl: 'https://www.mawani.gov.sa' },
            { document: 'SASO / SABER Certificates', use: 'Product conformity', issuer: 'SASO certified bodies', linkLabel: 'SABER Platform', linkUrl: 'https://saber.sa' },
            { document: 'Customs Declaration', use: 'ZATCA clearance & duty payment', issuer: 'Customs broker / Importer', linkLabel: 'ZATCA Customs', linkUrl: 'https://www.zatca.gov.sa/en/RulesRegulations/Taxes/Pages/Customs.aspx' },
        ],
    },
    {
        id: 'brazil',
        name: 'Brazil',
        corridor: 'Ports: Santos, Paranaguá, Rio de Janeiro',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List (Portuguese translation when requested).',
            'Bill of Lading / Air Waybill recorded in Siscomex.',
            'Import Declaration (DI/DUIMP) via Siscomex.',
            'ANVISA/MAPA certificates for regulated goods.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'Receita Federal customs entry', issuer: 'Exporter', linkLabel: 'Receita Federal', linkUrl: 'https://www.gov.br/receitafederal/pt-br' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest record in Siscomex', issuer: 'Carrier', linkLabel: 'Port of Santos', linkUrl: 'https://www.portodesantos.com.br' },
            { document: 'Import Declaration (DI/DUIMP)', use: 'Formal customs clearance', issuer: 'Customs broker / Importer', linkLabel: 'Siscomex', linkUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/siscomex' },
            { document: 'ANVISA / MAPA Certificates', use: 'Health & agriculture compliance', issuer: 'Competent agencies', linkLabel: 'ANVISA', linkUrl: 'https://www.gov.br/anvisa/pt-br' },
        ],
    },
    {
        id: 'mexico',
        name: 'Mexico',
        corridor: 'Ports: Manzanillo, Veracruz, Lazaro Cardenas',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List per SAT guidance.',
            'Bill of Lading / Air Waybill for pedimento filing.',
            'Pedimento customs entry via VUCEM.',
            'NOM/COFEPRIS/SENASICA certificates when applicable.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'SAT customs entry data', issuer: 'Exporter', linkLabel: 'SAT', linkUrl: 'https://www.sat.gob.mx' },
            { document: 'Bill of Lading / Air Waybill', use: 'Pedimento reference & manifest', issuer: 'Carrier', linkLabel: 'Mexican Customs', linkUrl: 'https://www.aduanas.gob.mx' },
            { document: 'Pedimento (Customs Entry)', use: 'Formal clearance via broker', issuer: 'Customs broker / Importer', linkLabel: 'VUCEM', linkUrl: 'https://www.ventanillaunica.gob.mx' },
            { document: 'NOM / COFEPRIS / SENASICA Certificates', use: 'Product conformity & sanitary approvals', issuer: 'Relevant agency', linkLabel: 'COFEPRIS', linkUrl: 'https://www.gob.mx/cofepris' },
        ],
    },
    {
        id: 'south-africa',
        name: 'South Africa',
        corridor: 'Ports: Durban, Cape Town, Port Elizabeth',
        modes: ['sea', 'air', 'imports'],
        quickChecklist: [
            'Commercial Invoice & Packing List aligned with SARS.',
            'Bill of Lading / Air Waybill for manifest & release.',
            'Customs Clearance (DA500/SAD 500) via broker.',
            'Permits/certificates (DAFF, NRCS) for regulated goods.',
        ],
        requirements: [
            { document: 'Commercial Invoice & Packing List', use: 'SARS customs valuation', issuer: 'Exporter', linkLabel: 'SARS Customs & Excise', linkUrl: 'https://www.sars.gov.za/customs-and-excise' },
            { document: 'Bill of Lading / Air Waybill', use: 'Manifest, release & delivery order', issuer: 'Carrier', linkLabel: 'Transnet National Ports Authority', linkUrl: 'https://www.transnetnationalportsauthority.net' },
            { document: 'Customs Clearance (SAD 500)', use: 'Entry into South Africa', issuer: 'Customs broker / Importer', linkLabel: 'SARS Clearance', linkUrl: 'https://www.sars.gov.za/customs-and-excise/importing-exporting' },
            { document: 'Permits / Certificates (DAFF, NRCS)', use: 'Commodity-specific compliance', issuer: 'DAFF / NRCS', linkLabel: 'Department of Agriculture', linkUrl: 'https://www.dalrrd.gov.za' },
        ],
    },
];

let documentRequirementsInitialized = false;
const documentCountryHints = {
    iecCertificate: 'india',
    gstCertificate: 'india',
    companyRegistration: 'india',
    ownerIdProof: 'india',
    addressProof: 'india',
    identityProof: 'united-states',
    businessProof: 'united-states',
    bankProof: 'united-states',
    profilePhoto: 'united-states',
};
const documentModeHints = {
    iecCertificate: 'exports',
    gstCertificate: 'exports',
    companyRegistration: 'exports',
    addressProof: 'exports',
    ownerIdProof: 'exports',
    identityProof: 'imports',
    businessProof: 'imports',
    bankProof: 'imports',
    profilePhoto: 'imports',
};

/**
 * Resolve meta info for a document type
 */
function initializeDocumentRequirementsSection() {
    if (documentRequirementsInitialized) return;

    const countrySelect = document.getElementById('docCountrySelect');
    const modeSelect = document.getElementById('docModeSelect');

    if (!countrySelect || !modeSelect) {
        return;
    }

    populateDocumentCountryOptions(countrySelect);
    populateDocumentModeOptions(modeSelect);

    countrySelect.addEventListener('change', () => {
        updateDocumentRequirementsDisplay();
        resetDocumentChecklistResult();
    });

    modeSelect.addEventListener('change', () => {
        updateDocumentRequirementsDisplay();
        resetDocumentChecklistResult();
    });

    updateDocumentRequirementsDisplay();
    documentRequirementsInitialized = true;
}

function populateDocumentCountryOptions(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = countryDocumentMatrix
        .map(country => `<option value="${country.id}">${country.name}</option>`)
        .join('');
}

function populateDocumentModeOptions(selectEl) {
    if (!selectEl) return;
    const options = ['all', ...DOCUMENT_MODES].map(mode => `<option value="${mode}">${formatModeLabel(mode)}</option>`);
    selectEl.innerHTML = options.join('');
}

function updateDocumentRequirementsDisplay(presetCountryId, presetMode) {
    const countrySelect = document.getElementById('docCountrySelect');
    const modeSelect = document.getElementById('docModeSelect');
    const targetCountryId = presetCountryId || countrySelect?.value || countryDocumentMatrix[0]?.id;
    const targetMode = presetMode || modeSelect?.value || 'all';

    if (countrySelect && targetCountryId) {
        countrySelect.value = targetCountryId;
    }
    if (modeSelect && targetMode) {
        modeSelect.value = targetMode;
    }

    const countryData = getCountryDataById(targetCountryId);
    renderDocumentRequirementsTable(countryData, targetMode);
}

function getCountryDataById(countryId) {
    return countryDocumentMatrix.find(country => country.id === countryId);
}

function renderDocumentRequirementsTable(countryData, mode) {
    const container = document.getElementById('docRequirementsTable');
    if (!container) return;

    if (!countryData) {
        container.innerHTML = `<div class="doc-empty-state">We couldn't find requirements for the selected country yet. Please choose another option.</div>`;
        return;
    }

    if (mode && mode !== 'all' && !countryData.modes.includes(mode)) {
        container.innerHTML = `<div class="doc-empty-state">We haven't mapped ${formatModeLabel(mode)} requirements for ${countryData.name} yet. Try another mode.</div>`;
        return;
    }

    const rows = countryData.requirements.map(req => `
        <tr>
            <td>${req.document}</td>
            <td>${req.use}</td>
            <td>${req.issuer}</td>
            <td>
                ${req.linkUrl ? `<a href="${req.linkUrl}" target="_blank" rel="noopener">${req.linkLabel || 'Official Link'}</a>` : '-'}
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="doc-table-card">
            <div class="doc-table-card-head">
                <div>
                    <h4>${countryData.name}</h4>
                    <p>${countryData.corridor || ''}</p>
                </div>
                <span class="doc-table-badge">${formatModeLabel(mode)}</span>
            </div>
            <div class="doc-requirements-table">
                <table>
                    <thead>
                        <tr>
                            <th>Document</th>
                            <th>Typical Use</th>
                            <th>Issuer</th>
                            <th>Official Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatModeLabel(mode) {
    if (!mode || mode === 'all') return 'All Modes';
    const labels = {
        sea: 'Sea Freight',
        air: 'Air Freight',
        imports: 'Imports',
        exports: 'Exports',
    };
    return labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
}

function resetDocumentChecklistResult() {
    const checklistEl = document.getElementById('docChecklistResult');
    if (checklistEl) {
        checklistEl.classList.remove('active');
        checklistEl.textContent = '';
    }
}

function generateDocumentChecklist() {
    const countrySelect = document.getElementById('docCountrySelect');
    const modeSelect = document.getElementById('docModeSelect');
    const checklistEl = document.getElementById('docChecklistResult');

    if (!countrySelect || !modeSelect || !checklistEl) return;

    const countryData = getCountryDataById(countrySelect.value);
    const selectedMode = modeSelect.value;

    if (!countryData) {
        checklistEl.innerHTML = 'Select a country to see the quick checklist.';
        checklistEl.classList.add('active');
        return;
    }

    if (selectedMode !== 'all' && !countryData.modes.includes(selectedMode)) {
        checklistEl.innerHTML = `We have not mapped ${formatModeLabel(selectedMode)} workflows for ${countryData.name}. Try another mode.`;
        checklistEl.classList.add('active');
        return;
    }

    const items = countryData.quickChecklist || [];
    if (!items.length) {
        checklistEl.innerHTML = 'Checklist will be available soon.';
        checklistEl.classList.add('active');
        return;
    }

    const listHtml = items.map(item => `<li>${item}</li>`).join('');
    checklistEl.innerHTML = `
        <h4>Checklist for ${countryData.name} (${formatModeLabel(selectedMode)})</h4>
        <ul>${listHtml}</ul>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-text-tertiary);">
            Source: Official customs, trade and partner agency portals linked above.
        </p>
    `;
    checklistEl.classList.add('active');
}

function syncDocumentRequirementsContext(doc) {
    if (!doc) return;
    initializeDocumentRequirementsSection();

    const countrySelect = document.getElementById('docCountrySelect');
    const modeSelect = document.getElementById('docModeSelect');

    if (!countrySelect || !modeSelect) return;

    let updated = false;

    const hintedCountry = documentCountryHints[doc.type];
    if (hintedCountry && countrySelect.value !== hintedCountry && getCountryDataById(hintedCountry)) {
        countrySelect.value = hintedCountry;
        updated = true;
    }

    const hintedMode = documentModeHints[doc.type];
    if (hintedMode && modeSelect.value !== hintedMode) {
        modeSelect.value = hintedMode;
        updated = true;
    }

    if (updated) {
        updateDocumentRequirementsDisplay(countrySelect.value, modeSelect.value);
        resetDocumentChecklistResult();
    }
}

function getDocumentTypeInfo(docType, fallbackName = '') {
    return documentTypeMap[docType] || {
        name: fallbackName || docType,
        category: 'other',
        icon: '📄',
    };
}

/**
 * Normalize data URLs/Base64 strings
 */
function extractBase64Components(dataInput = '', fallbackMime = '') {
    if (typeof dataInput !== 'string') {
        return { base64: '', mimeType: fallbackMime };
    }

    if (dataInput.startsWith('data:')) {
        const [meta, base64Payload] = dataInput.split(',');
        const mimeMatch = meta.match(/data:(.*?);base64/);
        return {
            base64: base64Payload || '',
            mimeType: mimeMatch ? mimeMatch[1] : (fallbackMime || ''),
        };
    }

    return { base64: dataInput, mimeType: fallbackMime || '' };
}

/**
 * Build a normalized document record for UI consumption
 */
function createDocumentRecord({
    source = 'realtime',
    docType,
    rawData,
    fileName = '',
    fileType = '',
    uploadedAt,
    fallbackName = '',
    categoryOverride,
    iconOverride,
}) {
    if (!rawData) return null;

    const { base64, mimeType: extractedMime } = extractBase64Components(rawData, fileType);
    if (!base64) return null;

    const typeInfo = getDocumentTypeInfo(docType, fallbackName);
    const resolvedMime = fileType || extractedMime || (getMimeType(base64) !== 'unknown' ? getMimeType(base64) : 'application/octet-stream');

    const record = {
        id: `${source}-${docType}-${uploadedAt || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: docType,
        name: fileName || fallbackName || typeInfo.name,
        category: categoryOverride || typeInfo.category,
        icon: iconOverride || typeInfo.icon,
        data: base64,
        uploadedAt: uploadedAt || new Date().toISOString(),
        size: calculateBase64Size(base64),
        mimeType: resolvedMime,
        source,
        fileName: fileName || fallbackName || typeInfo.name,
    };

    return record;
}

/**
 * Normalize timestamps coming from Firestore/Realtime
 */
function resolveUploadedAt(...values) {
    for (const value of values) {
        if (!value) continue;
        if (typeof value === 'string') return value;
        if (value instanceof Date) return value.toISOString();
        if (typeof value.toDate === 'function') {
            try {
                return value.toDate().toISOString();
            } catch (error) {
                console.warn('Unable to convert Firestore timestamp:', error);
            }
        }
    }
    return new Date().toISOString();
}

/**
 * Collect documents saved in Realtime Database
 */
function collectRealtimeDocuments(userData = {}) {
    if (!userData.documents) return [];

    const documents = [];
    Object.keys(userData.documents).forEach((docKey) => {
        if (docKey.endsWith('FileName') || docKey.endsWith('FileType')) {
            return;
        }

        const rawValue = userData.documents[docKey];
        if (!rawValue) return;

        const normalizedValue = typeof rawValue === 'object' && rawValue.data ? rawValue.data : rawValue;
        const fileName =
            (typeof rawValue === 'object' && rawValue.fileName) ||
            userData.documents[`${docKey}FileName`] ||
            undefined;
        const fileType =
            (typeof rawValue === 'object' && rawValue.fileType) ||
            userData.documents[`${docKey}FileType`] ||
            undefined;
        const uploadedAt = resolveUploadedAt(
            (typeof rawValue === 'object' && rawValue.uploadedAt) || userData[`${docKey}UpdatedAt`]
        );

        const record = createDocumentRecord({
            source: 'realtime',
            docType: docKey,
            rawData: normalizedValue,
            fileName,
            fileType,
            uploadedAt,
        });

        if (record) {
            record.status = 'Uploaded';
            documents.push(record);
        }
    });

    return documents;
}

/**
 * Collect documents stored in Firestore (eKYC payload)
 */
function collectFirestoreDocuments(ekycData = {}) {
    if (!ekycData.documents) return [];

    const documents = [];
    Object.entries(ekycData.documents).forEach(([docType, docValue]) => {
        if (!docValue) return;

        const rawData = docValue.dataUrl || docValue.base64 || docValue.data || '';
        const uploadedAt = resolveUploadedAt(docValue.uploadedAt, ekycData.updatedAt, ekycData.timestamp);

        const record = createDocumentRecord({
            source: 'firestore',
            docType,
            rawData,
            fileName: docValue.fileName,
            fileType: docValue.fileType,
            uploadedAt,
        });

        if (record) {
            record.status = (ekycData.ekycStatus || 'Submitted').toUpperCase();
            documents.push(record);
        }
    });

    return documents;
}

/**
 * Initialize documents module
 */
function initializeDocumentsModule() {
    const documentSearch = document.getElementById('documentSearch');
    const documentFilter = document.getElementById('documentFilter');
    
    if (documentSearch) {
        documentSearch.addEventListener('input', debounce(handleDocumentSearch, 300));
    }
    
    if (documentFilter) {
        documentFilter.addEventListener('change', handleDocumentFilter);
    }

    initializeDocumentRequirementsSection();
}

/**
 * Debounce utility function
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Load documents from Firebase
 */
async function loadDocumentsFromFirebase() {
    const user = auth?.currentUser;
    if (!user || (!database && !firestore)) {
        console.log('User not authenticated or Firebase services not available');
        return;
    }

    const loadingEl = document.getElementById('documentsLoading');
    const emptyEl = document.getElementById('documentsEmpty');
    const gridEl = document.getElementById('documentsGrid');
    
    if (loadingEl) loadingEl.style.display = 'flex';
    if (gridEl) gridEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    try {
        const realtimePromise = database ? database.ref(`users/${user.uid}`).once('value') : Promise.resolve(null);
        const firestorePromise = firestore ? firestore.collection('ekyc').doc(user.uid).get() : Promise.resolve(null);
        const [snapshot, ekycDoc] = await Promise.all([realtimePromise, firestorePromise]);
        
        const userData = snapshot ? snapshot.val() : null;
        const ekycData = ekycDoc && ekycDoc.exists ? ekycDoc.data() : null;

        const documents = [];
        
        if (userData) {
            documents.push(...collectRealtimeDocuments(userData));

            const profilePhotoData = userData.profilePhoto
                ? (typeof userData.profilePhoto === 'object' ? userData.profilePhoto.data : userData.profilePhoto)
                : null;

            if (profilePhotoData) {
                const record = createDocumentRecord({
                    source: 'realtime',
                    docType: 'profilePhoto',
                    rawData: profilePhotoData,
                    fileName: (typeof userData.profilePhoto === 'object' && userData.profilePhoto.fileName) || 'Profile Photo',
                    fileType: (typeof userData.profilePhoto === 'object' && userData.profilePhoto.fileType) || '',
                    uploadedAt: resolveUploadedAt(
                        userData.profilePhoto?.uploadedAt,
                        userData.profilePhotoUpdatedAt,
                        userData.updatedAt
                    ),
                });

                if (record) {
                    record.status = 'Uploaded';
                    documents.push(record);
                }
            }
        }

        if (ekycData) {
            documents.push(...collectFirestoreDocuments(ekycData));
        }

        documentsCache = documents;
        
        if (documents.length === 0) {
            showEmptyDocuments();
        } else {
            renderDocuments(documents);
            updateDocumentsStats(documents);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        documentsCache = [];
        showEmptyDocuments();
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

/**
 * Calculate Base64 size in KB
 */
function calculateBase64Size(base64String) {
    if (!base64String) return 0;
    const padding = (base64String.match(/=/g) || []).length;
    const bytes = Math.ceil((base64String.length * 3) / 4) - padding;
    return (bytes / 1024).toFixed(2);
}

/**
 * Get mime type from Base64 data
 */
function getMimeType(base64String) {
    if (!base64String) return 'unknown';
    
    if (base64String.startsWith('/9j/') || base64String.startsWith('iVBORw0KGgoAAAA')) {
        return 'image/jpeg';
    } else if (base64String.startsWith('iVBORw0KGgo')) {
        return 'image/png';
    } else if (base64String.startsWith('JVBERi0')) {
        return 'application/pdf';
    }
    
    return 'unknown';
}

/**
 * Determine file extension from mime type
 */
function getFileExtension(mimeType) {
    const mimeMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/pdf': 'pdf',
    };
    return mimeMap[mimeType] || 'bin';
}

/**
 * Show empty documents state
 */
function showEmptyDocuments() {
    const emptyEl = document.getElementById('documentsEmpty');
    const gridEl = document.getElementById('documentsGrid');
    const statsEl = document.getElementById('documentsStats');
    
    if (emptyEl) emptyEl.style.display = 'flex';
    if (gridEl) gridEl.style.display = 'none';
    if (statsEl) statsEl.style.display = 'none';
}

/**
 * Render documents to grid
 */
function renderDocuments(documents) {
    const gridEl = document.getElementById('documentsGrid');
    const emptyEl = document.getElementById('documentsEmpty');
    
    if (!gridEl) return;
    
    if (documents.length === 0) {
        showEmptyDocuments();
        return;
    }

    gridEl.style.display = 'grid';
    if (emptyEl) emptyEl.style.display = 'none';

    gridEl.innerHTML = documents.map((doc) => {
        const uploadDate = new Date(doc.uploadedAt);
        const formattedDate = uploadDate.toLocaleDateString();
        const previewHTML = isImageMimeType(doc.mimeType) && doc.data
            ? `<img src="data:${doc.mimeType};base64,${doc.data}" alt="${doc.name}">`
            : `<div class="file-icon">${doc.icon}</div>`;

        return `
            <div class="document-card" onclick="openDocumentDetail('${doc.id}')">
                <div class="document-card-preview">
                    ${previewHTML}
                    <div class="document-card-overlay">
                        <button onclick="event.stopPropagation(); openDocumentDetail('${doc.id}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                        </button>
                        <button onclick="event.stopPropagation(); downloadDocumentDirect('${doc.id}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
                <div class="document-card-content">
                    <div class="document-card-title">${doc.name}</div>
                    <span class="document-card-type">${doc.category}</span>
                    <div class="document-card-meta">
                        <div class="document-card-date">
                            <div>${formattedDate}</div>
                        </div>
                        <div class="document-card-size">${doc.size} KB</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Check if mime type is image
 */
function isImageMimeType(mimeType) {
    return mimeType && mimeType.startsWith('image/');
}

/**
 * Update documents statistics
 */
function updateDocumentsStats(documents) {
    const statsEl = document.getElementById('documentsStats');
    if (!statsEl) return;

    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, doc) => sum + parseFloat(doc.size), 0).toFixed(2);
    const uniqueTypes = new Set(documents.map(doc => doc.category)).size;

    const totalDocsEl = document.getElementById('totalDocuments');
    const totalSizeEl = document.getElementById('totalSize');
    const typeCountEl = document.getElementById('typeCount');

    if (totalDocsEl) totalDocsEl.textContent = totalDocs;
    if (totalSizeEl) totalSizeEl.textContent = `${totalSize} MB`;
    if (typeCountEl) typeCountEl.textContent = uniqueTypes;

    if (totalDocs > 0) {
        statsEl.style.display = 'grid';
    }
}

/**
 * Handle document search
 */
function handleDocumentSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filtered = documentsCache.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm) ||
        doc.category.toLowerCase().includes(searchTerm)
    );
    renderDocuments(filtered);
}

/**
 * Handle document filter
 */
function handleDocumentFilter(event) {
    const filterValue = event.target.value;
    
    if (!filterValue) {
        renderDocuments(documentsCache);
    } else {
        const filtered = documentsCache.filter(doc => doc.category === filterValue);
        renderDocuments(filtered);
    }
}

/**
 * Open document detail modal
 */
function openDocumentDetail(docId) {
    const doc = documentsCache.find(d => d.id === docId);
    if (!doc) return;

    currentDocument = doc;
    syncDocumentRequirementsContext(doc);
    const modal = document.getElementById('documentDetailModal');
    
    if (!modal) return;

    // Update modal content
    const titleEl = document.getElementById('documentDetailTitle');
    const typeEl = document.getElementById('documentDetailType');
    const sizeEl = document.getElementById('documentSize');
    const dateEl = document.getElementById('documentDate');
    const fileTypeEl = document.getElementById('documentFileType');
    const statusEl = document.getElementById('documentStatus');
    const descriptionEl = document.getElementById('documentDescription');
    const deleteBtn = document.getElementById('documentDeleteButton');
    const previewArea = document.getElementById('documentPreviewArea');

    if (titleEl) titleEl.textContent = doc.name;
    if (typeEl) {
        typeEl.textContent = doc.category.toUpperCase();
        typeEl.className = 'document-type-badge';
    }
    if (sizeEl) sizeEl.textContent = `${doc.size} KB`;
    if (dateEl) dateEl.textContent = new Date(doc.uploadedAt).toLocaleDateString();
    if (fileTypeEl) fileTypeEl.textContent = getFileExtension(doc.mimeType).toUpperCase();
    if (statusEl) statusEl.textContent = doc.status || 'Uploaded';
    if (descriptionEl) descriptionEl.textContent = doc.fileName || doc.name;

    if (deleteBtn) {
        if (doc.source === 'firestore') {
            deleteBtn.disabled = true;
            deleteBtn.title = 'Delete is disabled for eKYC submissions';
        } else {
            deleteBtn.disabled = false;
            deleteBtn.title = 'Delete';
        }
    }

    // Show preview
    if (previewArea) {
        if (isImageMimeType(doc.mimeType)) {
            previewArea.innerHTML = `<img src="data:${doc.mimeType};base64,${doc.data}" alt="${doc.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px;">`;
        } else if (doc.mimeType === 'application/pdf') {
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">📄</div>
                    <p style="color: var(--color-text-secondary);">PDF Preview not available</p>
                    <p style="color: var(--color-text-secondary); font-size: 0.9rem;">Click Download to view the full document</p>
                </div>
            `;
        } else {
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">📎</div>
                    <p style="color: var(--color-text-secondary);">Preview not available</p>
                </div>
            `;
        }
    }

    // Open modal
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

/**
 * Close document detail modal
 */
function closeDocumentDetail() {
    const modal = document.getElementById('documentDetailModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentDocument = null;
}

/**
 * Download document
 */
function downloadDocument() {
    if (!currentDocument) return;
    downloadDocumentFile(currentDocument);
    closeDocumentDetail();
}

/**
 * Download document directly from card
 */
function downloadDocumentDirect(docId) {
    const doc = documentsCache.find(d => d.id === docId);
    if (doc) {
        downloadDocumentFile(doc);
    }
}

/**
 * Download document file
 */
function downloadDocumentFile(doc) {
    try {
        const binaryString = atob(doc.data);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: doc.mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const ext = getFileExtension(doc.mimeType);
        const baseName = (doc.fileName || doc.name || 'document').replace(/\.[^/.]+$/, '');
        const fileName = `${baseName.replace(/\s+/g, '_')}.${ext}`;
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading document:', error);
        alert('Error downloading document. Please try again.');
    }
}

/**
 * Delete document
 */
async function deleteDocument() {
    if (!currentDocument) return;

    if (currentDocument.source !== 'realtime') {
        alert('Only documents uploaded via your profile can be deleted here.');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${currentDocument.name}"?`)) {
        return;
    }

    const user = auth?.currentUser;
    if (!user || !database) return;

    try {
        const docType = currentDocument.type;
        await database.ref(`users/${user.uid}/documents/${docType}`).remove();
        
        documentsCache = documentsCache.filter(d => d.id !== currentDocument.id);
        
        closeDocumentDetail();
        loadDocumentsFromFirebase();
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document. Please try again.');
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const documentModal = document.getElementById('documentDetailModal');
        if (documentModal && documentModal.classList.contains('active')) {
            closeDocumentDetail();
        }
    }
});

// Initialize catalog modules after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeDocumentsModule();
        initializeProductModule();
        initializeAnalyticsModule();
        initializeSupportModule();
        
        const originalSwitchTab = window.switchTab;
        window.switchTab = function(tabName) {
            originalSwitchTab(tabName);
            
            if (tabName === 'documents') {
                loadDocumentsFromFirebase();
            }
            
            if (tabName === 'products') {
                loadProductsFromFirebase();
            }

            if (tabName === 'analytics') {
                loadAnalyticsFromFirebase();
            }

            if (tabName === 'support') {
                initializeSupportModule();
                listenForSupportMessages();
            }
            
            if (tabName === 'payments') {
                loadForwardContractsInPayments();
            }
        };
        
        const initialTab = window.location.hash.substring(1);
        if (initialTab === 'documents') {
            loadDocumentsFromFirebase();
        } else if (initialTab === 'products') {
            loadProductsFromFirebase();
        } else if (initialTab === 'analytics') {
            loadAnalyticsFromFirebase();
        } else if (initialTab === 'support') {
            initializeSupportModule();
        } else if (initialTab === 'cart') {
            loadExporterCart();
        }
    }, 100);
});

// ============================================
// CART MANAGEMENT
// ============================================

/**
 * Load cart from Firebase
 */
async function loadExporterCart() {
    const user = auth?.currentUser;
    if (!user || !database) {
        showEmptyCart();
        return;
    }

    try {
        const snapshot = await database.ref(`users/${user.uid}/cart`).once('value');
        const cartData = snapshot.val();
        
        let cart = [];
        if (cartData) {
            if (Array.isArray(cartData)) {
                cart = cartData;
            } else {
                cart = Object.values(cartData);
            }
        }

        renderExporterCart(cart);
        updateCartBadge(cart);
    } catch (error) {
        console.error('Error loading cart:', error);
        showEmptyCart();
    }
}

/**
 * Render cart items
 */
function renderExporterCart(cart) {
    const cartContent = document.getElementById('exporterCartContent');
    const cartFooter = document.getElementById('exporterCartFooter');
    const cartTotal = document.getElementById('exporterCartTotal');
    const cartBadge = document.getElementById('exporterCartBadge');

    if (!cartContent) return;

    if (cart.length === 0) {
        showEmptyCart();
        if (cartFooter) cartFooter.style.display = 'none';
        if (cartBadge) cartBadge.style.display = 'none';
        return;
    }

    cartContent.innerHTML = cart.map(item => createCartItemHTML(item)).join('');
    
    if (cartFooter) cartFooter.style.display = 'block';
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currency = cart[0]?.currency || 'USD';
    if (cartTotal) {
        cartTotal.textContent = `${currency} ${total.toLocaleString()}`;
    }

    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Create cart item HTML
 */
function createCartItemHTML(item) {
    const imageSrc = item.imageBase64 
        ? `data:${item.imageFileType || 'image/jpeg'};base64,${item.imageBase64}`
        : 'https://via.placeholder.com/100x100?text=No+Image';

    return `
        <div class="cart-item" style="display: flex; gap: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 12px; margin-bottom: 1rem;">
            <img src="${imageSrc}" alt="${item.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="font-weight: 600; color: #333; font-size: 1rem;">${item.name || 'Unnamed Product'}</div>
                <div style="color: #667eea; font-weight: 600; font-size: 1.1rem;">${item.currency || 'USD'} ${(item.price * item.quantity).toLocaleString()}</div>
                ${item.exporterName ? `<div style="color: #666; font-size: 0.9rem;">From: ${item.exporterName}</div>` : ''}
                <div style="display: flex; align-items: center; gap: 1rem; margin-top: auto;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; background: white; border: 2px solid #e0e0e0; border-radius: 6px; padding: 0.25rem 0.5rem;">
                        <button onclick="updateExporterCartQuantity('${item.id}', -1)" style="background: none; border: none; cursor: pointer; color: #667eea; font-weight: 600; padding: 0.25rem 0.5rem;">-</button>
                        <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                        <button onclick="updateExporterCartQuantity('${item.id}', 1)" style="background: none; border: none; cursor: pointer; color: #667eea; font-weight: 600; padding: 0.25rem 0.5rem;">+</button>
                    </div>
                    <button onclick="removeExporterCartItem('${item.id}')" style="background: #ff4757; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show empty cart
 */
function showEmptyCart() {
    const cartContent = document.getElementById('exporterCartContent');
    if (cartContent) {
        cartContent.innerHTML = `
            <div class="cart-empty" style="text-align: center; padding: 3rem 1rem; color: #666;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
                <h3 style="color: #333; margin-bottom: 0.5rem;">Your cart is empty</h3>
                <p>Add products from the marketplace to see them here</p>
                <a href="../marketplace/marketplace.html" target="_blank" class="btn-primary" style="margin-top: 1rem; display: inline-block;">
                    Go to Marketplace
                </a>
            </div>
        `;
    }
}

/**
 * Update cart quantity
 */
async function updateExporterCartQuantity(productId, change) {
    const user = auth?.currentUser;
    if (!user || !database) return;

    try {
        const snapshot = await database.ref(`users/${user.uid}/cart`).once('value');
        const cartData = snapshot.val();
        
        let cart = [];
        if (cartData) {
            if (Array.isArray(cartData)) {
                cart = cartData;
            } else {
                cart = Object.values(cartData);
            }
        }

        const item = cart.find(item => item.id === productId);
        if (!item) return;

        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        }

        await database.ref(`users/${user.uid}/cart`).set(cart);
        renderExporterCart(cart);
        updateCartBadge(cart);
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

/**
 * Remove cart item
 */
async function removeExporterCartItem(productId) {
    const user = auth?.currentUser;
    if (!user || !database) return;

    try {
        const snapshot = await database.ref(`users/${user.uid}/cart`).once('value');
        const cartData = snapshot.val();
        
        let cart = [];
        if (cartData) {
            if (Array.isArray(cartData)) {
                cart = cartData;
            } else {
                cart = Object.values(cartData);
            }
        }

        cart = cart.filter(item => item.id !== productId);
        await database.ref(`users/${user.uid}/cart`).set(cart);
        renderExporterCart(cart);
        updateCartBadge(cart);
    } catch (error) {
        console.error('Error removing cart item:', error);
    }
}

/**
 * Update cart badge
 */
function updateCartBadge(cart) {
    const cartBadge = document.getElementById('exporterCartBadge');
    if (!cartBadge) return;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

/**
 * Proceed to checkout
 */
function proceedExporterCheckout() {
    // For now, just show a message
    alert('Checkout functionality will be implemented soon. Your cart items are saved and will be available for order processing.');
}

// Listen for cart updates from marketplace
window.addEventListener('storage', (e) => {
    if (e.key === 'cartUpdated') {
        loadExporterCart();
    }
});

// Also check cart on page visibility change (when user returns from marketplace)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const currentTab = window.location.hash.substring(1);
        if (currentTab === 'cart') {
            loadExporterCart();
        }
    }
});

// ============================================
// FORWARD CONTRACT NOTE GENERATOR
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forwardContractForm');
    const resultsSection = document.getElementById('forwardContractResults');
    const currencyPairSelect = document.getElementById('forwardContractCurrencyPair');
    const currencyPriceDiv = document.getElementById('forwardContractCurrencyPrice');

    if (!form || !resultsSection || !currencyPairSelect || !currencyPriceDiv) {
        // Elements not found, likely not on contracts page
        return;
    }

    // Fetch real-time currency rate when pair is selected
    currencyPairSelect.addEventListener('change', function() {
        const currencyPair = this.value;
        if (currencyPair) {
            fetchCurrencyRate(currencyPair);
        } else {
            currencyPriceDiv.innerHTML = '';
            currencyPriceDiv.className = 'forward-contract-currency-price';
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const amount = document.getElementById('forwardContractAmount').value;
        const settlementDate = document.getElementById('forwardContractSettlementDate').value;
        const riskTolerance = document.getElementById('forwardContractRiskTolerance').value;
        const currencyPair = document.getElementById('forwardContractCurrencyPair').value;

        // Format settlement date for display
        const formattedDate = new Date(settlementDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Generate fake analysis results
        const idealWindow = generateIdealWindow(riskTolerance);
        const volatility = generateVolatility(currencyPair);
        const recommendation = generateRecommendation(riskTolerance, volatility);

        // Calculate preferred and least preferred lock-in dates
        const settlementDateObj = new Date(settlementDate);
        const lockInDates = calculateLockInDates(settlementDateObj, riskTolerance, volatility, currencyPair);

        // Fetch current rate for results
        let currentRate = null;
        try {
            const [baseCurrency, quoteCurrency] = currencyPair.split('/');
            if (baseCurrency === 'USD') {
                currentRate = await fetchRateFromUSD(quoteCurrency);
            } else if (quoteCurrency === 'USD') {
                const inverseRate = await fetchRateFromUSD(baseCurrency);
                currentRate = 1 / inverseRate;
            } else {
                const baseToUSD = await fetchRateFromUSD(baseCurrency);
                const quoteToUSD = await fetchRateFromUSD(quoteCurrency);
                currentRate = baseToUSD / quoteToUSD;
            }
        } catch (error) {
            console.error('Error fetching rate for results:', error);
        }

        // Calculate estimated rates for preferred and least preferred dates
        let preferredDateRate = null;
        let leastPreferredDateRate = null;
        if (currentRate) {
            const volNum = parseFloat(volatility);
            preferredDateRate = estimateFutureRate(currentRate, volNum, lockInDates.preferredDaysBefore, 'preferred');
            leastPreferredDateRate = estimateFutureRate(currentRate, volNum, lockInDates.leastPreferredDaysBefore, 'leastPreferred');
        }

        // Calculate risk premium and final amounts
        const volNum = parseFloat(volatility);
        const riskPremium = calculateRiskPremium(parseFloat(amount), riskTolerance, volNum);
        
        let preferredFinalAmount = null;
        let leastPreferredFinalAmount = null;
        
        if (preferredDateRate && amount) {
            preferredFinalAmount = calculateFinalAmount(parseFloat(amount), preferredDateRate, riskPremium, 'preferred');
        }
        
        if (leastPreferredDateRate && amount) {
            leastPreferredFinalAmount = calculateFinalAmount(parseFloat(amount), leastPreferredDateRate, riskPremium, 'leastPreferred');
        }

        // Display results
        displayResults({
            amount,
            settlementDate: formattedDate,
            riskTolerance,
            currencyPair,
            idealWindow,
            volatility,
            recommendation,
            currentRate,
            preferredDate: lockInDates.preferred,
            leastPreferredDate: lockInDates.leastPreferred,
            preferredDateFormatted: lockInDates.preferredFormatted,
            leastPreferredDateFormatted: lockInDates.leastPreferredFormatted,
            preferredDateRate: preferredDateRate,
            leastPreferredDateRate: leastPreferredDateRate,
            riskPremium: riskPremium,
            preferredFinalAmount: preferredFinalAmount,
            leastPreferredFinalAmount: leastPreferredFinalAmount
        });
    });

    function generateIdealWindow(riskTolerance) {
        const windows = {
            low: '7-10 days before settlement',
            medium: '10-14 days before settlement',
            high: '14-21 days before settlement'
        };
        return windows[riskTolerance] || '10-14 days before settlement';
    }

    function generateVolatility(currencyPair) {
        const volatilities = {
            'USD/EUR': '2.3%',
            'USD/GBP': '3.1%',
            'USD/JPY': '4.2%',
            'USD/INR': '1.8%',
            'EUR/GBP': '2.7%',
            'EUR/JPY': '3.9%',
            'GBP/JPY': '4.5%'
        };
        return volatilities[currencyPair] || '2.5%';
    }

    function generateRecommendation(riskTolerance, volatility) {
        const riskLevel = riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1);
        const volNum = parseFloat(volatility);
        
        if (riskTolerance === 'low' && volNum > 3) {
            return 'Consider locking in earlier due to higher volatility and your low risk tolerance.';
        } else if (riskTolerance === 'high' && volNum < 2.5) {
            return 'You can afford to wait longer given lower volatility and your high risk tolerance.';
        } else {
            return 'Current market conditions align well with your risk profile.';
        }
    }

    function calculateLockInDates(settlementDate, riskTolerance, volatility, currencyPair) {
        // Get volatility as number
        const volNum = parseFloat(volatility);
        
        // Calculate days before settlement based on risk tolerance and volatility
        let preferredDaysBefore;
        let leastPreferredDaysBefore;
        
        // Base calculation on risk tolerance
        if (riskTolerance === 'low') {
            // Low risk: lock in earlier (more days before)
            preferredDaysBefore = volNum > 3 ? 12 : 10;
            leastPreferredDaysBefore = 3; // Too close to settlement
        } else if (riskTolerance === 'medium') {
            // Medium risk: balanced approach
            preferredDaysBefore = volNum > 3 ? 14 : 12;
            leastPreferredDaysBefore = 2; // Too close to settlement
        } else {
            // High risk: can wait longer
            preferredDaysBefore = volNum < 2.5 ? 18 : 15;
            leastPreferredDaysBefore = 1; // Very close to settlement
        }
        
        // Adjust based on volatility - higher volatility means earlier preferred date
        if (volNum > 4) {
            preferredDaysBefore += 2;
        } else if (volNum < 2) {
            preferredDaysBefore -= 1;
        }
        
        // Calculate preferred date (subtract days from settlement)
        const preferredDate = new Date(settlementDate);
        preferredDate.setDate(preferredDate.getDate() - preferredDaysBefore);
        
        // Ensure preferred date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (preferredDate < today) {
            // If preferred date is in past, set to tomorrow
            preferredDate.setTime(today.getTime() + 24 * 60 * 60 * 1000);
        }
        
        // Calculate least preferred date (very close to settlement)
        const leastPreferredDate = new Date(settlementDate);
        leastPreferredDate.setDate(leastPreferredDate.getDate() - leastPreferredDaysBefore);
        
        // Ensure least preferred date is not before today
        if (leastPreferredDate < today) {
            leastPreferredDate.setTime(today.getTime());
        }
        
        // Format dates
        const preferredFormatted = preferredDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        const leastPreferredFormatted = leastPreferredDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        return {
            preferred: preferredDate,
            leastPreferred: leastPreferredDate,
            preferredFormatted: preferredFormatted,
            leastPreferredFormatted: leastPreferredFormatted,
            preferredDaysBefore: preferredDaysBefore,
            leastPreferredDaysBefore: leastPreferredDaysBefore
        };
    }

    function estimateFutureRate(currentRate, volatility, daysBefore, dateType) {
        // Estimate future rate based on volatility and historical patterns
        // This simulates what the rate might be on that date based on past trends
        
        // Convert volatility percentage to decimal
        const volDecimal = volatility / 100;
        
        // Calculate expected price movement based on volatility
        // Higher volatility = more potential movement
        // Days before settlement affects uncertainty
        const timeFactor = Math.sqrt(daysBefore / 30); // Square root of time for volatility scaling
        const expectedMovement = volDecimal * timeFactor;
        
        // For preferred date: typically more favorable (slight downward movement for exporter benefit)
        // For least preferred: higher uncertainty, potentially unfavorable
        let rateAdjustment;
        
        if (dateType === 'preferred') {
            // Preferred date: Based on historical analysis, rates tend to be more favorable
            // Slight downward adjustment (0.3 to 0.7% better for exporter)
            const favorableAdjustment = -0.005 * (1 + Math.random() * 0.4); // -0.5% to -0.7%
            rateAdjustment = currentRate * favorableAdjustment;
        } else {
            // Least preferred date: Higher uncertainty, potentially unfavorable
            // Could be 0.5% to 1.5% worse due to last-minute volatility
            const unfavorableAdjustment = 0.008 * (1 + Math.random() * 0.5); // +0.8% to +1.2%
            rateAdjustment = currentRate * unfavorableAdjustment;
        }
        
        // Add some random variation based on volatility
        const randomVariation = (Math.random() - 0.5) * currentRate * expectedMovement * 0.3;
        
        // Calculate estimated rate
        const estimatedRate = currentRate + rateAdjustment + randomVariation;
        
        // Ensure rate is positive and reasonable
        return Math.max(estimatedRate, currentRate * 0.95);
    }

    function calculateRiskPremium(amount, riskTolerance, volatility) {
        // Calculate risk premium based on risk tolerance and volatility
        // Higher risk tolerance and volatility = higher premium
        
        let basePremiumRate;
        
        // Base premium rate based on risk tolerance
        if (riskTolerance === 'low') {
            basePremiumRate = 0.0015; // 0.15% for low risk
        } else if (riskTolerance === 'medium') {
            basePremiumRate = 0.0025; // 0.25% for medium risk
        } else {
            basePremiumRate = 0.004; // 0.4% for high risk
        }
        
        // Adjust based on volatility
        const volatilityAdjustment = (volatility / 100) * 0.5; // Additional 0.5% per 1% volatility
        const totalPremiumRate = basePremiumRate + volatilityAdjustment;
        
        // Calculate risk premium amount
        const riskPremium = amount * totalPremiumRate;
        
        return {
            rate: totalPremiumRate,
            amount: riskPremium
        };
    }

    function calculateFinalAmount(baseAmount, exchangeRate, riskPremium, dateType) {
        // Calculate final amount = (base amount * exchange rate) + risk premium
        
        // For preferred date: slightly lower risk premium (better terms)
        // For least preferred: higher risk premium (worse terms)
        let premiumMultiplier = 1;
        
        if (dateType === 'preferred') {
            premiumMultiplier = 0.9; // 10% discount on risk premium for preferred date
        } else {
            premiumMultiplier = 1.2; // 20% increase in risk premium for least preferred date
        }
        
        const adjustedRiskPremium = riskPremium.amount * premiumMultiplier;
        const finalAmount = (baseAmount * exchangeRate) + adjustedRiskPremium;
        
        return {
            baseAmount: baseAmount,
            exchangeRate: exchangeRate,
            riskPremium: adjustedRiskPremium,
            finalAmount: finalAmount,
            premiumMultiplier: premiumMultiplier
        };
    }

    function displayResults(data) {
        const resultHTML = `
            <div class="forward-contract-result-block">
                <h2>Forward Contract Analysis</h2>

                <div class="forward-contract-result-content">
                    <p>Recommended lock-in window: <strong>${data.idealWindow}</strong>.</p>
                    <p>${data.recommendation}</p>
                </div>

                <div class="forward-contract-lockin-dates-section">
                    <div class="forward-contract-date-card">
                        <div class="forward-contract-date-label">Preferred Execution Date</div>
                        <div class="forward-contract-date-value">${data.preferredDateFormatted}</div>
                        <div class="forward-contract-date-info">Estimated Rate: ${data.preferredDateRate ? data.preferredDateRate.toFixed(4) : 'N/A'}</div>
                        ${data.preferredFinalAmount ? `<div class="forward-contract-date-info">Final Amount: ${formatAmount(data.preferredFinalAmount.finalAmount)}</div>` : ''}
                    </div>

                    <div class="forward-contract-date-card">
                        <div class="forward-contract-date-label">Least Preferred Date</div>
                        <div class="forward-contract-date-value">${data.leastPreferredDateFormatted}</div>
                        <div class="forward-contract-date-info">Estimated Rate: ${data.leastPreferredDateRate ? data.leastPreferredDateRate.toFixed(4) : 'N/A'}</div>
                        ${data.leastPreferredFinalAmount ? `<div class="forward-contract-date-info">Final Amount: ${formatAmount(data.leastPreferredFinalAmount.finalAmount)}</div>` : ''}
                    </div>
                </div>

                <div class="forward-contract-result-details">
                    <p><strong>Amount:</strong> ${formatAmount(data.amount)}</p>
                    <p><strong>Settlement:</strong> ${data.settlementDate}</p>
                    <p><strong>Pair:</strong> ${data.currencyPair}</p>
                    <p><strong>Current Rate:</strong> ${data.currentRate ? data.currentRate.toFixed(4) : 'N/A'}</p>
                    <p><strong>Volatility:</strong> ${data.volatility}</p>
                </div>
            </div>
        `;

        resultsSection.innerHTML = resultHTML;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'forward-contract-download-pdf-btn';
        downloadBtn.textContent = 'Download Contract Note PDF';
        downloadBtn.onclick = () => generatePDF(data);
        resultsSection.querySelector('.forward-contract-result-block').appendChild(downloadBtn);
        
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function generatePDF(data) {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please refresh the page.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.text("FORWARD CONTRACT NOTE", pageWidth / 2, y, { align: "center" });
        y += 10;

        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text("Contract Details", margin, y); 
        y += 8;

        doc.setFontSize(10);

        function addRow(label, value) {
            doc.setFont("Helvetica", "bold");
            doc.text(label + ":", margin, y);
            doc.setFont("Helvetica", "normal");
            doc.text(String(value), margin + 60, y);
            y += 6;
        }

        function capitalize(x) {
            return x.charAt(0).toUpperCase() + x.slice(1);
        }

        addRow("Currency Pair", data.currencyPair);
        addRow("Contract Amount", formatAmount(data.amount));
        addRow("Settlement Date", data.settlementDate);
        addRow("Current Market Rate", data.currentRate?.toFixed(4) || "N/A");
        addRow("Risk Tolerance", capitalize(data.riskTolerance));
        addRow("Volatility (30-day)", data.volatility);

        y += 5;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Pricing Summary", margin, y);
        y += 8;
        doc.setFontSize(10);

        if (data.preferredFinalAmount) {
            addRow("Preferred Execution Date", data.preferredDateFormatted);
            addRow("Estimated Rate", data.preferredDateRate.toFixed(4));
            addRow("Final Amount", formatAmount(data.preferredFinalAmount.finalAmount));
            y += 4;
        }

        if (data.leastPreferredFinalAmount) {
            addRow("Least Preferred Date", data.leastPreferredDateFormatted);
            addRow("Estimated Rate", data.leastPreferredDateRate.toFixed(4));
            addRow("Final Amount", formatAmount(data.leastPreferredFinalAmount.finalAmount));
            y += 4;
        }

        y += 5;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Terms & Disclaimers", margin, y);
        y += 8;

        doc.setFontSize(9);

        const terms = [
            "1. All exchange rates stated herein are indicative and subject to market movements.",
            "2. This document does not constitute financial or legal advice.",
            "3. The client must verify contract details prior to execution.",
            "4. The issuer is not liable for market-driven changes post issuance.",
            "5. This document is system-generated and valid without signature."
        ];

        terms.forEach(t => {
            const lines = doc.splitTextToSize(t, pageWidth - margin * 2);
            doc.text(lines, margin, y);
            y += lines.length * 5;
        });

        y += 15;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Authorized Signatory", margin, y);
        y += 20;

        doc.setFont("Helvetica", "normal");
        doc.text("______________________________", margin, y); 
        y += 6;
        doc.text("Treasury Operations", margin, y); 
        y += 6;
        doc.text("Issued: " + new Date().toLocaleDateString("en-US"), margin, y);

        const filename = `Forward_Contract_${data.currencyPair.replace("/", "_")}_${new Date().getTime()}.pdf`;
        
        // Convert PDF to Base64
        const pdfBase64 = doc.output('datauristring');
        const pdfBase64Data = pdfBase64.split(',')[1];
        
        // Save PDF locally
        doc.save(filename);
        
        // Save to Firebase Realtime Database
        if (auth && database && auth.currentUser) {
            const user = auth.currentUser;
            const contractId = `contract_${new Date().getTime()}_${Math.random().toString(36).slice(2, 9)}`;
            
            const contractData = {
                id: contractId,
                amount: data.amount,
                settlementDate: data.settlementDate,
                currencyPair: data.currencyPair,
                currentRate: data.currentRate,
                riskTolerance: data.riskTolerance,
                volatility: data.volatility,
                idealWindow: data.idealWindow,
                recommendation: data.recommendation,
                preferredDate: data.preferredDateFormatted,
                preferredDateRate: data.preferredDateRate,
                preferredFinalAmount: data.preferredFinalAmount ? data.preferredFinalAmount.finalAmount : null,
                leastPreferredDate: data.leastPreferredDateFormatted,
                leastPreferredDateRate: data.leastPreferredDateRate,
                leastPreferredFinalAmount: data.leastPreferredFinalAmount ? data.leastPreferredFinalAmount.finalAmount : null,
                riskPremium: data.riskPremium ? {
                    rate: data.riskPremium.rate,
                    amount: data.riskPremium.amount
                } : null,
                pdfBase64: pdfBase64Data,
                pdfFileName: filename,
                createdAt: new Date().toISOString(),
                status: 'active'
            };
            
            try {
                await database.ref(`users/${user.uid}/forwardContracts/${contractId}`).set(contractData);
                console.log('Forward contract saved to Firebase:', contractId);
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'forward-contract-save-success';
                successMsg.style.cssText = 'margin-top: 15px; padding: 12px; background: #d1fae5; color: #065f46; border-radius: 8px; font-size: 14px;';
                successMsg.textContent = '✅ Contract saved successfully! You can view it in the Payments section.';
                resultsSection.querySelector('.forward-contract-result-block').appendChild(successMsg);
                
                // Refresh payment section if it's currently visible
                if (document.getElementById('paymentsSection') && 
                    document.getElementById('paymentsSection').style.display !== 'none') {
                    loadForwardContractsInPayments();
                }
            } catch (error) {
                console.error('Error saving forward contract to Firebase:', error);
                const errorMsg = document.createElement('div');
                errorMsg.className = 'forward-contract-save-error';
                errorMsg.style.cssText = 'margin-top: 15px; padding: 12px; background: #fee2e2; color: #991b1b; border-radius: 8px; font-size: 14px;';
                errorMsg.textContent = '⚠️ Contract saved locally but failed to save to database. Please try again.';
                resultsSection.querySelector('.forward-contract-result-block').appendChild(errorMsg);
            }
        } else {
            console.warn('Firebase not initialized or user not logged in. Contract saved locally only.');
        }
    }

    function formatAmount(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    async function fetchCurrencyRate(currencyPair) {
        const [baseCurrency, quoteCurrency] = currencyPair.split('/');
        
        currencyPriceDiv.innerHTML = '<span class="rate-label">Loading...</span>';
        currencyPriceDiv.className = 'forward-contract-currency-price loading';

        try {
            let rate;
            
            // If base is USD, fetch directly
            if (baseCurrency === 'USD') {
                rate = await fetchRateFromUSD(quoteCurrency);
            } 
            // If quote is USD, calculate inverse
            else if (quoteCurrency === 'USD') {
                const inverseRate = await fetchRateFromUSD(baseCurrency);
                rate = 1 / inverseRate;
            } 
            // Cross currency pair - calculate from USD rates
            else {
                const baseToUSD = await fetchRateFromUSD(baseCurrency);
                const quoteToUSD = await fetchRateFromUSD(quoteCurrency);
                rate = baseToUSD / quoteToUSD;
            }

            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });

            currencyPriceDiv.innerHTML = `
                <span class="rate-value">${rate.toFixed(4)}</span>
                <span class="rate-label">${currencyPair}</span>
                <span class="refresh-indicator">Updated: ${timestamp}</span>
            `;
            currencyPriceDiv.className = 'forward-contract-currency-price';
        } catch (error) {
            console.error('Error fetching currency rate:', error);
            currencyPriceDiv.innerHTML = '<span class="rate-label">Unable to fetch rate. Please try again.</span>';
            currencyPriceDiv.className = 'forward-contract-currency-price error';
        }
    }

    async function fetchRateFromUSD(currency) {
        // Using exchangerate-api.com free tier (no API key required for basic usage)
        // Fallback to exchangerate.host if first fails
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            
            if (data.rates && data.rates[currency]) {
                return data.rates[currency];
            }
            throw new Error('Currency not found');
        } catch (error) {
            // Fallback to exchangerate.host
            try {
                const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${currency}`);
                if (!response.ok) throw new Error('Fallback API request failed');
                const data = await response.json();
                
                if (data.rates && data.rates[currency]) {
                    return data.rates[currency];
                }
                throw new Error('Currency not found in fallback');
            } catch (fallbackError) {
                throw new Error('Unable to fetch exchange rate');
            }
        }
    }

    /**
     * Load forward contracts from Firebase and display in payments section
     */
    async function loadForwardContractsInPayments() {
        const contractsList = document.getElementById('forwardContractsList');
        const contractsEmpty = document.getElementById('forwardContractsEmpty');
        
        if (!contractsList) return;
        
        if (!auth || !database || !auth.currentUser) {
            contractsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">Please log in to view forward contracts.</div>';
            return;
        }
        
        const user = auth.currentUser;
        
        try {
            contractsList.innerHTML = '<div class="forward-contracts-loading" style="text-align: center; padding: 40px;"><div class="spinner" style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div><p>Loading forward contracts...</p></div>';
            
            const contractsRef = database.ref(`users/${user.uid}/forwardContracts`);
            const snapshot = await contractsRef.once('value');
            
            if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
                contractsList.style.display = 'none';
                if (contractsEmpty) contractsEmpty.style.display = 'block';
                return;
            }
            
            const contracts = snapshot.val();
            const contractsArray = Object.keys(contracts).map(key => ({
                id: key,
                ...contracts[key]
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            contractsList.innerHTML = '';
            contractsList.style.display = 'grid';
            if (contractsEmpty) contractsEmpty.style.display = 'none';
            
            contractsArray.forEach(contract => {
                const contractCard = createForwardContractCard(contract);
                contractsList.appendChild(contractCard);
            });
            
        } catch (error) {
            console.error('Error loading forward contracts:', error);
            contractsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Error loading forward contracts. Please try again.</div>';
        }
    }

    /**
     * Create a forward contract card element
     */
    function createForwardContractCard(contract) {
        const card = document.createElement('div');
        card.className = 'forward-contract-card';
        
        const createdAt = new Date(contract.createdAt);
        const formattedDate = createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const preferredAmount = contract.preferredFinalAmount ? formatAmount(contract.preferredFinalAmount) : 'N/A';
        const settlementDate = contract.settlementDate || 'N/A';
        const currentRate = contract.currentRate ? contract.currentRate.toFixed(4) : 'N/A';
        
        card.innerHTML = `
            <div class="forward-contract-card-header">
                <div>
                    <div class="forward-contract-card-title">Forward Contract - ${contract.currencyPair}</div>
                    <div class="forward-contract-card-date">Created: ${formattedDate}</div>
                </div>
                <span class="forward-contract-card-badge">${contract.status || 'Active'}</span>
            </div>
            <div class="forward-contract-card-details">
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Amount</span>
                    <span class="forward-contract-detail-value">${formatAmount(contract.amount)}</span>
                </div>
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Settlement Date</span>
                    <span class="forward-contract-detail-value">${settlementDate}</span>
                </div>
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Currency Pair</span>
                    <span class="forward-contract-detail-value">${contract.currencyPair}</span>
                </div>
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Current Rate</span>
                    <span class="forward-contract-detail-value">${currentRate}</span>
                </div>
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Preferred Final Amount</span>
                    <span class="forward-contract-detail-value">${preferredAmount}</span>
                </div>
                <div class="forward-contract-detail-item">
                    <span class="forward-contract-detail-label">Risk Tolerance</span>
                    <span class="forward-contract-detail-value">${contract.riskTolerance ? contract.riskTolerance.charAt(0).toUpperCase() + contract.riskTolerance.slice(1) : 'N/A'}</span>
                </div>
            </div>
            <div class="forward-contract-card-actions">
                <button class="forward-contract-action-btn forward-contract-action-btn-primary" onclick="downloadForwardContractPDF('${contract.id}')">
                    <span>📄</span>
                    <span>Download PDF</span>
                </button>
                <button class="forward-contract-action-btn forward-contract-action-btn-secondary" onclick="viewForwardContractDetails('${contract.id}')">
                    <span>👁️</span>
                    <span>View Details</span>
                </button>
            </div>
        `;
        
        return card;
    }

    /**
     * Download forward contract PDF from Firebase
     */
    async function downloadForwardContractPDF(contractId) {
        if (!auth || !database || !auth.currentUser) {
            alert('Please log in to download the contract.');
            return;
        }
        
        const user = auth.currentUser;
        
        try {
            const contractRef = database.ref(`users/${user.uid}/forwardContracts/${contractId}`);
            const snapshot = await contractRef.once('value');
            
            if (!snapshot.exists()) {
                alert('Contract not found.');
                return;
            }
            
            const contract = snapshot.val();
            
            if (!contract.pdfBase64) {
                alert('PDF data not available for this contract.');
                return;
            }
            
            // Convert Base64 to blob and download
            const pdfData = contract.pdfBase64;
            const byteCharacters = atob(pdfData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = contract.pdfFileName || `Forward_Contract_${contractId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Error downloading PDF. Please try again.');
        }
    }

    /**
     * View forward contract details
     */
    async function viewForwardContractDetails(contractId) {
        if (!auth || !database || !auth.currentUser) {
            alert('Please log in to view contract details.');
            return;
        }
        
        const user = auth.currentUser;
        
        try {
            const contractRef = database.ref(`users/${user.uid}/forwardContracts/${contractId}`);
            const snapshot = await contractRef.once('value');
            
            if (!snapshot.exists()) {
                alert('Contract not found.');
                return;
            }
            
            const contract = snapshot.val();
            
            // Create a modal or alert with contract details
            const details = `
Forward Contract Details

Amount: ${formatAmount(contract.amount)}
Settlement Date: ${contract.settlementDate}
Currency Pair: ${contract.currencyPair}
Current Rate: ${contract.currentRate ? contract.currentRate.toFixed(4) : 'N/A'}
Risk Tolerance: ${contract.riskTolerance ? contract.riskTolerance.charAt(0).toUpperCase() + contract.riskTolerance.slice(1) : 'N/A'}
Volatility: ${contract.volatility || 'N/A'}
Ideal Window: ${contract.idealWindow || 'N/A'}
Preferred Date: ${contract.preferredDate || 'N/A'}
Preferred Date Rate: ${contract.preferredDateRate ? contract.preferredDateRate.toFixed(4) : 'N/A'}
Preferred Final Amount: ${contract.preferredFinalAmount ? formatAmount(contract.preferredFinalAmount) : 'N/A'}
Least Preferred Date: ${contract.leastPreferredDate || 'N/A'}
Least Preferred Date Rate: ${contract.leastPreferredDateRate ? contract.leastPreferredDateRate.toFixed(4) : 'N/A'}
Least Preferred Final Amount: ${contract.leastPreferredFinalAmount ? formatAmount(contract.leastPreferredFinalAmount) : 'N/A'}
Risk Premium Rate: ${contract.riskPremium && contract.riskPremium.rate ? (contract.riskPremium.rate * 100).toFixed(2) + '%' : 'N/A'}
Recommendation: ${contract.recommendation || 'N/A'}
Created: ${new Date(contract.createdAt).toLocaleString()}
            `;
            
            alert(details);
            
        } catch (error) {
            console.error('Error viewing contract details:', error);
            alert('Error loading contract details. Please try again.');
        }
    }

    // Make functions globally available
    window.downloadForwardContractPDF = downloadForwardContractPDF;
    window.viewForwardContractDetails = viewForwardContractDetails;
});

