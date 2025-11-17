/**
 * Marketplace JavaScript
 * Handles product display, cart management, and Firebase integration
 */

// Firebase Configuration (Exporter Database)
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

// Importer Firebase Config
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
let allProducts = [];
let filteredProducts = [];
let cart = [];
let productsPerPage = 12;
let currentPage = 0;

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

// Check authentication state
auth?.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        currentUserType = 'exporter';
        updateUserDisplay(user);
        loadCart();
    } else {
        // Check importer auth
        importerAuth?.onAuthStateChanged((importerUser) => {
            if (importerUser) {
                currentUser = importerUser;
                currentUserType = 'importer';
                updateUserDisplay(importerUser);
                loadCart();
            } else {
                currentUser = null;
                currentUserType = null;
                updateUserDisplay(null);
            }
        });
    }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeMarketplace();
    setupEventListeners();
    loadProducts();
});

/**
 * Initialize marketplace
 */
function initializeMarketplace() {
    // Check if user is logged in
    const exporterUser = auth?.currentUser;
    const importerUser = importerAuth?.currentUser;
    
    if (exporterUser) {
        currentUser = exporterUser;
        currentUserType = 'exporter';
        updateUserDisplay(exporterUser);
        loadCart();
    } else if (importerUser) {
        currentUser = importerUser;
        currentUserType = 'importer';
        updateUserDisplay(importerUser);
        loadCart();
    } else {
        updateUserDisplay(null);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Filters
    const filterInputs = ['categoryFilter', 'currencyFilter', 'incotermFilter', 'marketFilter', 'minPrice', 'maxPrice'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', handleFilter);
            element.addEventListener('input', debounce(handleFilter, 300));
        }
    });

    // Sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }

    // Close modals on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('product-modal-overlay')) {
            closeProductModal();
        }
        if (e.target.classList.contains('user-dropdown') || !e.target.closest('.user-menu')) {
            closeUserMenu();
        }
    });
}

/**
 * Load products from Firebase
 */
async function loadProducts() {
    const loadingEl = document.getElementById('productsLoading');
    const emptyEl = document.getElementById('productsEmpty');
    const gridEl = document.getElementById('productsGrid');
    const countEl = document.getElementById('productsCount');

    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (gridEl) gridEl.innerHTML = '';

    try {
        // Check if database is initialized
        if (!database) {
            throw new Error('Database not initialized');
        }

        const snapshot = await database.ref('productCatalog').once('value');
        const data = snapshot.val() || {};
        
        allProducts = Object.entries(data)
            .map(([id, product]) => ({
                id,
                ...product
            }))
            .filter(product => product.name && product.description); // Filter out incomplete products

        filteredProducts = [...allProducts];
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (allProducts.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            if (countEl) countEl.textContent = 'No products available';
        } else {
            applyFiltersAndSort();
            if (countEl) countEl.textContent = `${allProducts.length} product${allProducts.length !== 1 ? 's' : ''} available`;
        }
    } catch (error) {
        console.error('Error loading products:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission') || error.message?.includes('permission_denied')) {
                emptyEl.innerHTML = `
                    <div class="empty-icon">🔒</div>
                    <h3>Permission Denied</h3>
                    <p style="margin-bottom: 1rem;">Firebase security rules need to be configured to allow public read access to the product catalog.</p>
                    <div style="background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; text-align: left;">
                        <h4 style="margin-top: 0; color: #333; font-size: 1rem;">📋 Steps to Fix:</h4>
                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666; line-height: 1.8;">
                            <li>Go to <strong>Firebase Console</strong> → Your <strong>Exporter Project</strong></li>
                            <li>Navigate to <strong>Realtime Database</strong> → <strong>Rules</strong> tab</li>
                            <li>Copy the rules from <code style="background: #fff; padding: 0.2rem 0.4rem; border-radius: 3px;">Export-Dashboard/firebase-security-rules.json</code></li>
                            <li>Paste and <strong>Publish</strong> the rules</li>
                        </ol>
                        <div style="margin-top: 1rem; padding: 1rem; background: #fff; border-radius: 4px; border-left: 4px solid #667eea;">
                            <strong style="color: #667eea;">Required Rule:</strong>
                            <pre style="margin: 0.5rem 0 0 0; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 0.85rem;"><code>"productCatalog": {
  ".read": true,
  ".write": "auth != null"
}</code></pre>
                        </div>
                    </div>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
                        Once the rules are updated, refresh this page.
                    </p>
                `;
            } else {
                emptyEl.innerHTML = `
                    <div class="empty-icon">⚠️</div>
                    <h3>Error loading products</h3>
                    <p>${error.message || 'Please try again later'}</p>
                `;
            }
        }
        if (countEl) countEl.textContent = 'Error loading products';
    }
}

/**
 * Apply filters and sort
 */
function applyFiltersAndSort() {
    let filtered = [...allProducts];

    // Search filter
    const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.name?.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm) ||
            product.targetMarkets?.toLowerCase().includes(searchTerm)
        );
    }

    // Category filter
    const category = document.getElementById('categoryFilter')?.value || '';
    if (category) {
        filtered = filtered.filter(product => product.category === category);
    }

    // Currency filter
    const currency = document.getElementById('currencyFilter')?.value || '';
    if (currency) {
        filtered = filtered.filter(product => product.priceCurrency === currency);
    }

    // Incoterm filter
    const incoterm = document.getElementById('incotermFilter')?.value || '';
    if (incoterm) {
        filtered = filtered.filter(product => product.incoterm === incoterm);
    }

    // Market filter
    const market = document.getElementById('marketFilter')?.value.toLowerCase() || '';
    if (market) {
        filtered = filtered.filter(product => 
            product.targetMarkets?.toLowerCase().includes(market)
        );
    }

    // Price filter
    const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    filtered = filtered.filter(product => {
        const price = product.priceValue || 0;
        return price >= minPrice && price <= maxPrice;
    });

    // Sort
    const sortValue = document.getElementById('sortSelect')?.value || 'newest';
    filtered.sort((a, b) => {
        switch (sortValue) {
            case 'newest':
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'oldest':
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'price-low':
                return (a.priceValue || 0) - (b.priceValue || 0);
            case 'price-high':
                return (b.priceValue || 0) - (a.priceValue || 0);
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');
            default:
                return 0;
        }
    });

    filteredProducts = filtered;
    renderProducts();
}

/**
 * Handle search
 */
function handleSearch() {
    applyFiltersAndSort();
}

/**
 * Handle filter
 */
function handleFilter() {
    applyFiltersAndSort();
}

/**
 * Handle sort
 */
function handleSort() {
    applyFiltersAndSort();
}

/**
 * Clear all filters
 */
function clearFilters() {
    document.getElementById('productSearch').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('currencyFilter').value = '';
    document.getElementById('incotermFilter').value = '';
    document.getElementById('marketFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortSelect').value = 'newest';
    applyFiltersAndSort();
}

/**
 * Render products
 */
function renderProducts() {
    const gridEl = document.getElementById('productsGrid');
    const emptyEl = document.getElementById('productsEmpty');
    const loadMoreEl = document.getElementById('loadMoreContainer');

    if (!gridEl) return;

    if (filteredProducts.length === 0) {
        gridEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        if (loadMoreEl) loadMoreEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    const productsToShow = filteredProducts.slice(0, (currentPage + 1) * productsPerPage);
    
    gridEl.innerHTML = productsToShow.map(product => createProductCard(product)).join('');

    // Show load more if there are more products
    if (loadMoreEl) {
        loadMoreEl.style.display = productsToShow.length < filteredProducts.length ? 'block' : 'none';
    }
}

/**
 * Create product card HTML
 */
function createProductCard(product) {
    const imageSrc = product.imageBase64 
        ? `data:${product.imageFileType || 'image/jpeg'};base64,${product.imageBase64}`
        : 'https://via.placeholder.com/300x200?text=No+Image';
    
    const price = product.priceValue 
        ? `${product.priceCurrency || 'USD'} ${product.priceValue.toLocaleString()}`
        : 'Price on request';

    const category = product.category || 'other';
    const incoterm = product.incoterm || 'Not specified';

    return `
        <div class="product-card" onclick="viewProductDetails('${product.id}')">
            <div class="product-image">
                ${product.imageBase64 
                    ? `<img src="${imageSrc}" alt="${product.name || 'Product'}" loading="lazy">`
                    : '<span>📦</span>'
                }
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name || 'Unnamed Product'}</h3>
                <p class="product-description">${product.description || 'No description available'}</p>
                <div class="product-meta">
                    <span>${category}</span>
                    ${incoterm !== 'Not specified' ? `<span>${incoterm}</span>` : ''}
                </div>
                <div class="product-price">${price}</div>
                <div class="product-actions">
                    <button class="btn-view-details" onclick="event.stopPropagation(); viewProductDetails('${product.id}')">
                        View Details
                    </button>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 7h18"></path>
                            <path d="M6 7V3h12v4"></path>
                            <path d="M5 7l1.68 12.06A2 2 0 0 0 8.66 21h6.68a2 2 0 0 0 1.98-1.94L19 7"></path>
                        </svg>
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load more products
 */
function loadMoreProducts() {
    currentPage++;
    renderProducts();
}

/**
 * View product details
 */
async function viewProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }

    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    
    if (!modal || !content) return;

    const imageSrc = product.imageBase64 
        ? `data:${product.imageFileType || 'image/jpeg'};base64,${product.imageBase64}`
        : 'https://via.placeholder.com/600x400?text=No+Image';

    const price = product.priceValue 
        ? `${product.priceCurrency || 'USD'} ${product.priceValue.toLocaleString()}`
        : 'Price on request';

    content.innerHTML = `
        <img src="${imageSrc}" alt="${product.name}" class="product-detail-image">
        <div class="product-detail-info">
            <h2>${product.name || 'Unnamed Product'}</h2>
            <div class="product-detail-price">${price}</div>
            
            <div class="product-detail-section">
                <h3>Description</h3>
                <p>${product.description || 'No description available'}</p>
            </div>

            <div class="product-detail-section">
                <h3>Specifications</h3>
                <div class="product-detail-specs">
                    ${product.category ? `
                        <div class="spec-item">
                            <div class="spec-label">Category</div>
                            <div class="spec-value">${product.category}</div>
                        </div>
                    ` : ''}
                    ${product.hsCode ? `
                        <div class="spec-item">
                            <div class="spec-label">HS Code</div>
                            <div class="spec-value">${product.hsCode}</div>
                        </div>
                    ` : ''}
                    ${product.incoterm ? `
                        <div class="spec-item">
                            <div class="spec-label">Incoterm</div>
                            <div class="spec-value">${product.incoterm}</div>
                        </div>
                    ` : ''}
                    ${product.minOrderQty ? `
                        <div class="spec-item">
                            <div class="spec-label">Min Order Quantity</div>
                            <div class="spec-value">${product.minOrderQty}</div>
                        </div>
                    ` : ''}
                    ${product.leadTime ? `
                        <div class="spec-item">
                            <div class="spec-label">Lead Time</div>
                            <div class="spec-value">${product.leadTime}</div>
                        </div>
                    ` : ''}
                    ${product.productionCapacity ? `
                        <div class="spec-item">
                            <div class="spec-label">Monthly Capacity</div>
                            <div class="spec-value">${product.productionCapacity}</div>
                        </div>
                    ` : ''}
                    ${product.targetMarkets ? `
                        <div class="spec-item">
                            <div class="spec-label">Target Markets</div>
                            <div class="spec-value">${product.targetMarkets}</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${product.specs ? `
                <div class="product-detail-section">
                    <h3>Key Specifications</h3>
                    <p>${product.specs}</p>
                </div>
            ` : ''}

            ${product.packagingDetails ? `
                <div class="product-detail-section">
                    <h3>Packaging & Labelling</h3>
                    <p>${product.packagingDetails}</p>
                </div>
            ` : ''}

            ${product.certifications ? `
                <div class="product-detail-section">
                    <h3>Certifications</h3>
                    <p>${product.certifications}</p>
                </div>
            ` : ''}

            ${product.complianceNotes ? `
                <div class="product-detail-section">
                    <h3>Compliance Notes</h3>
                    <p>${product.complianceNotes}</p>
                </div>
            ` : ''}

            <div class="product-actions" style="margin-top: 2rem;">
                <button class="btn-add-cart" style="width: 100%; justify-content: center;" onclick="addToCart('${product.id}'); closeProductModal();">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7h18"></path>
                        <path d="M6 7V3h12v4"></path>
                        <path d="M5 7l1.68 12.06A2 2 0 0 0 8.66 21h6.68a2 2 0 0 0 1.98-1.94L19 7"></path>
                    </svg>
                    Add to Cart
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Close product modal
 */
function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Add to cart
 */
async function addToCart(productId) {
    if (!currentUser) {
        showToast('Please login to add products to cart', 'error');
        setTimeout(() => {
            window.location.href = '../index.html#login';
        }, 1500);
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }

    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.priceValue || 0,
            currency: product.priceCurrency || 'USD',
            imageBase64: product.imageBase64,
            imageFileType: product.imageFileType,
            quantity: 1,
            exporterId: product.userId,
            exporterName: product.exporterName
        });
    }

    await saveCart();
    updateCartDisplay();
    showToast('Product added to cart', 'success');
}

/**
 * Remove from cart
 */
async function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    await saveCart();
    updateCartDisplay();
    showToast('Product removed from cart', 'success');
}

/**
 * Update cart quantity
 */
async function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        await removeFromCart(productId);
    } else {
        await saveCart();
        updateCartDisplay();
    }
}

/**
 * Save cart to Firebase
 */
async function saveCart() {
    if (!currentUser || !currentUserType) return;

    try {
        const db = currentUserType === 'exporter' ? database : importerDatabase;
        if (!db) {
            console.warn('Database not initialized');
            return;
        }

        const cartPath = `users/${currentUser.uid}/cart`;
        await db.ref(cartPath).set(cart);
    } catch (error) {
        console.error('Error saving cart:', error);
        if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
            console.warn('Cart save permission denied. Make sure Firebase rules allow users to write their own cart.');
            showToast('Unable to save cart. Please check your permissions.', 'error');
        }
    }
}

/**
 * Load cart from Firebase
 */
async function loadCart() {
    if (!currentUser || !currentUserType) {
        cart = [];
        updateCartDisplay();
        return;
    }

    try {
        const db = currentUserType === 'exporter' ? database : importerDatabase;
        if (!db) {
            console.warn('Database not initialized');
            cart = [];
            updateCartDisplay();
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
        
        updateCartDisplay();
    } catch (error) {
        console.error('Error loading cart:', error);
        if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
            console.warn('Cart permission denied. Make sure Firebase rules allow users to read/write their own cart.');
        }
        cart = [];
        updateCartDisplay();
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const badge = document.getElementById('cartBadge');
    const cartContent = document.getElementById('cartContent');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');

    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Update cart content
    if (cartContent) {
        if (cart.length === 0) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <div class="empty-icon">🛒</div>
                    <p>Your cart is empty</p>
                    <p class="cart-empty-subtitle">Add products from the marketplace</p>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';
        } else {
            cartContent.innerHTML = cart.map(item => createCartItemHTML(item)).join('');
            if (cartFooter) cartFooter.style.display = 'block';
        }
    }

    // Update total
    if (cartTotal) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currency = cart[0]?.currency || 'USD';
        cartTotal.textContent = `${currency} ${total.toLocaleString()}`;
    }
}

/**
 * Create cart item HTML
 */
function createCartItemHTML(item) {
    const imageSrc = item.imageBase64 
        ? `data:${item.imageFileType || 'image/jpeg'};base64,${item.imageBase64}`
        : 'https://via.placeholder.com/80x80?text=No+Image';

    return `
        <div class="cart-item">
            <img src="${imageSrc}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.currency} ${(item.price * item.quantity).toLocaleString()}</div>
                <div class="cart-item-actions">
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart('${item.id}')" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle cart sidebar
 */
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('active');
    }
}

/**
 * Toggle filters sidebar
 */
function toggleFilters() {
    const filtersSidebar = document.getElementById('filtersSidebar');
    if (filtersSidebar) {
        filtersSidebar.classList.toggle('active');
    }
}

/**
 * Toggle user menu
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

/**
 * Close user menu
 */
function closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

/**
 * Update user display
 */
function updateUserDisplay(user) {
    const userName = document.getElementById('userName');
    const userInitials = document.getElementById('userInitials');
    const userAvatar = document.getElementById('userAvatar');
    const loginLink = document.getElementById('loginLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const logoutLink = document.getElementById('logoutLink');

    if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'User';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        if (userName) userName.textContent = name;
        if (userInitials) userInitials.textContent = initials;
        
        if (loginLink) loginLink.style.display = 'none';
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
            dashboardLink.href = currentUserType === 'exporter' 
                ? '../Export-Dashboard/export-dashboard.html'
                : '../Impoter-Dashboard/impoter-dashboard.html';
        }
        if (logoutLink) logoutLink.style.display = 'block';
    } else {
        if (userName) userName.textContent = 'Guest';
        if (userInitials) userInitials.textContent = 'G';
        if (loginLink) loginLink.style.display = 'block';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

/**
 * Handle login
 */
function handleLogin() {
    window.location.href = '../index.html';
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        if (currentUserType === 'exporter') {
            await auth.signOut();
        } else {
            await importerAuth.signOut();
        }
        currentUser = null;
        currentUserType = null;
        cart = [];
        updateUserDisplay(null);
        updateCartDisplay();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Error logging out', 'error');
    }
}

/**
 * Go to dashboard
 */
function goToDashboard() {
    if (currentUserType === 'exporter') {
        window.location.href = '../Export-Dashboard/export-dashboard.html';
    } else {
        window.location.href = '../Impoter-Dashboard/impoter-dashboard.html';
    }
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    if (!currentUser) {
        showToast('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        return;
    }

    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    // Redirect to dashboard where cart items will be shown
    goToDashboard();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('marketplaceToast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

/**
 * Debounce function
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

