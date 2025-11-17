/* Importer Dashboard Controller */
(function () {
    'use strict';

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

    const statusClassMap = {
        'In Transit': 'status-in-transit',
        'Arrived at Port': 'status-arrived',
        'Under Customs Check': 'status-customs',
        'Cleared': 'status-cleared',
        'Out for Delivery': 'status-out-for-delivery',
        'Delivered': 'status-delivered'
    };

    const defaultFaqs = [
        'How to download documents?',
        'How to track shipment?',
        'How to make payment?',
        'What to do in case of delay?',
        'How disputes work?'
    ];

    const defaultDocumentTypes = [
        'Commercial Invoice',
        'Packing List',
        'Bill of Lading / Airway Bill',
        'Insurance Certificate',
        'Customs Declaration',
        'Compliance Documents'
    ];

    let importerApp = null;
    let importerAuth = null;
    let importerDatabase = null;
    let currentUser = null;
    let currentUserBasePath = '';
    const realtimeBindings = [];

    function initFirebase() {
        try {
            const existing = firebase.apps.find(app => app.name === 'importerApp');
            importerApp = existing || firebase.initializeApp(importerFirebaseConfig, 'importerApp');
            importerAuth = importerApp.auth();
            importerDatabase = importerApp.database();
        } catch (error) {
            console.warn('Failed to bootstrap importer Firebase app:', error);
        }
    }

    const sectionTitleMap = {
        dashboard: 'Dashboard',
        shipments: 'Shipments',
        documents: 'Documents',
        payments: 'Payments',
        disputes: 'Disputes',
        support: 'Support',
        orders: 'Orders',
        notifications: 'Notifications',
        profile: 'Profile & Settings',
        cart: 'My Cart'
    };

    const DEFAULT_TAB = 'dashboard';
    let activeTab = null;

    function normalizeTab(target) {
        if (!target) return DEFAULT_TAB;
        return sectionTitleMap[target] ? target : DEFAULT_TAB;
    }

    function activateSection(target, options = {}) {
        const normalizedTab = normalizeTab(target);
        const { syncHash = true, force = false } = options;
        if (!force && activeTab === normalizedTab) {
            if (syncHash) {
                const currentUrl = `${window.location.pathname}${window.location.search}#${normalizedTab}`;
                if (window.location.hash !== `#${normalizedTab}`) {
                    window.history.replaceState(null, '', currentUrl);
                }
            }
            return;
        }
        activeTab = normalizedTab;

        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            const isActive = link.dataset.tab === normalizedTab;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-selected', String(isActive));
            link.tabIndex = isActive ? 0 : -1;
            if (isActive && link.id) {
                document.querySelector('.nav-list[role="tablist"]')?.setAttribute('aria-activedescendant', link.id);
            }
        });

        document.querySelectorAll('.content-section[data-section]').forEach(section => {
            const isActive = section.dataset.section === normalizedTab;
            section.classList.toggle('active', isActive);
            section.toggleAttribute('hidden', !isActive);
        });
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = sectionTitleMap[normalizedTab] || sectionTitleMap[DEFAULT_TAB];
        }
        if (syncHash) {
            const newUrl = `${window.location.pathname}${window.location.search}#${normalizedTab}`;
            window.history.replaceState(null, '', newUrl);
        }
        
        // Load documents when documents tab is activated
        if (normalizedTab === 'documents') {
            setTimeout(() => {
                if (typeof loadImporterDocumentsFromFirebase === 'function') {
                    loadImporterDocumentsFromFirebase();
                }
                if (typeof initializeImporterDocumentsModule === 'function') {
                    initializeImporterDocumentsModule();
                }
            }, 100);
        }
        
        // Load cart when cart tab is activated
        if (normalizedTab === 'cart') {
            setTimeout(() => {
                if (typeof loadImporterCart === 'function') {
                    loadImporterCart();
                }
            }, 100);
        }
    }

    function handleTabKeydown(event) {
        const key = event.key;
        const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Spacebar'];
        if (!allowedKeys.includes(key)) return;
        const navLinks = Array.from(document.querySelectorAll('.nav-link[data-tab]'));
        const currentIndex = navLinks.indexOf(event.currentTarget);
        if (currentIndex === -1) return;

        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            activateSection(event.currentTarget.dataset.tab);
            return;
        }

        let nextIndex = currentIndex;
        if (key === 'ArrowUp' || key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + navLinks.length) % navLinks.length;
        } else if (key === 'ArrowDown' || key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % navLinks.length;
        } else if (key === 'Home') {
            nextIndex = 0;
        } else if (key === 'End') {
            nextIndex = navLinks.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        const nextLink = navLinks[nextIndex];
        nextLink?.focus();
        if (nextLink) {
            activateSection(nextLink.dataset.tab);
        }
    }

    function showToast(message) {
        const toast = document.getElementById('importerToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3200);
    }

    function setStatusBadge(text, intent = 'info') {
        const badge = document.getElementById('importerStatusBadge');
        if (!badge) return;
        const intentColors = {
            info: { bg: '#e0f2fe', color: '#075985' },
            success: { bg: '#dcfce7', color: '#166534' },
            warning: { bg: '#fef9c3', color: '#92400e' },
            danger: { bg: '#fee2e2', color: '#991b1b' }
        };
        badge.textContent = text;
        const palette = intentColors[intent] || intentColors.info;
        badge.style.background = palette.bg;
        badge.style.color = palette.color;
    }

    function convertToArray(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data.filter(Boolean);
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    function clearRealtimeBindings() {
        realtimeBindings.forEach(binding => {
            if (binding.errorHandler) {
                binding.ref.off('value', binding.listener, binding.errorHandler);
            } else {
                binding.ref.off('value', binding.listener);
            }
        });
        realtimeBindings.length = 0;
    }

    function bindRealtime(path, handler) {
        if (!importerDatabase) return;
        const ref = importerDatabase.ref(path);
        const listener = snapshot => handler(snapshot.val());
        const errorHandler = error => {
            console.error(`Error binding to ${path}:`, error);
            if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                console.warn(`Permission denied for ${path}. Please configure Firebase security rules.`);
            }
        };
        ref.on('value', listener, errorHandler);
        realtimeBindings.push({ ref, listener, errorHandler });
    }

    function emptyState(message) {
        return `<div class="empty-state">${message}</div>`;
    }

    function renderSummaryCards(data = {}) {
        document.getElementById('summaryActiveShipments').textContent = data.activeShipments ?? 0;
        document.getElementById('summaryPendingPayments').textContent = data.pendingPayments ?? 0;
        document.getElementById('summaryPendingVerification').textContent = data.pendingVerification ?? 0;
        document.getElementById('summaryDeliveredShipments').textContent = data.deliveredShipments ?? 0;
    }

    function renderShipments(data) {
        const container = document.getElementById('shipmentsList');
        if (!container) return;
        container.innerHTML = '';
        const shipments = convertToArray(data);
        if (!shipments.length) {
            container.innerHTML = emptyState('No shipments have been synced yet.');
            return;
        }

        shipments.forEach(item => {
            const statusClass = statusClassMap[item.status] || 'status-in-transit';
            const card = document.createElement('article');
            card.className = 'shipment-card';
            card.innerHTML = `
                <h4>${item.shipmentId || 'Shipment'}</h4>
                <div class="shipment-meta">
                    <span>Exporter: ${item.exporterName || '—'}</span>
                    <span>Origin: ${item.originCountry || '—'}</span>
                    <span>ETA: ${item.eta || '—'}</span>
                </div>
                <span class="shipment-status ${statusClass}">${item.status || 'In Transit'}</span>
                ${item.qrUrl ? `<img src="${item.qrUrl}" alt="Shipment QR" width="120" height="120" loading="lazy">` : ''}
            `;
            container.appendChild(card);
        });
    }

    function renderDocumentsSection(data = {}) {
        const list = document.getElementById('documentsList');
        if (!list) return;
        list.innerHTML = '';

        const viewBtn = document.getElementById('documentsViewBtn');
        const downloadBtn = document.getElementById('documentsDownloadBtn');
        if (viewBtn) viewBtn.dataset.url = data.viewUrl || '';
        if (downloadBtn) downloadBtn.dataset.url = data.downloadUrl || '';

        const documents = convertToArray(data.files);
        const template = documents.length ? documents : defaultDocumentTypes.map(type => ({ type, status: 'Waiting for upload' }));

        template.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card';
            card.innerHTML = `
                <p><strong>${doc.type || doc.name}</strong></p>
                <small>${doc.status || 'Available online'}</small><br>
                ${doc.updatedAt ? `<small>Updated: ${formatDate(doc.updatedAt)}</small>` : ''}
            `;
            list.appendChild(card);
        });
    }

    function renderPaymentPanel(data = {}) {
        const liveRateEl = document.getElementById('paymentLiveRate');
        if (liveRateEl) {
            liveRateEl.textContent = data.liveRate ? `${data.liveRate.value} ${data.liveRate.pair || ''}` : '--';
        }

        const feeBreakdown = document.getElementById('paymentFeeBreakdown');
        if (feeBreakdown) {
            feeBreakdown.innerHTML = '';
            const fees = convertToArray(data.feeBreakdown);
            if (!fees.length) {
                feeBreakdown.innerHTML = '<span>No fee details yet.</span>';
            } else {
                fees.forEach(fee => {
                    const row = document.createElement('div');
                    row.textContent = `${fee.label || 'Fee'}: ${fee.amount || '--'}`;
                    feeBreakdown.appendChild(row);
                });
            }
        }

        const historyList = document.getElementById('paymentHistoryList');
        if (historyList) {
            historyList.innerHTML = '';
            const history = convertToArray(data.history);
            if (!history.length) {
                historyList.innerHTML = emptyState('No payments recorded yet.');
            } else {
                history.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <strong>${entry.amount || '--'} ${entry.currency || ''}</strong>
                        <div>${entry.notes || '—'}</div>
                        <small>${formatDate(entry.createdAt)}</small>
                    `;
                    historyList.appendChild(item);
                });
            }
        }
    }

    function renderDisputeHistory(data = {}) {
        const list = document.getElementById('disputeHistoryList');
        if (!list) return;
        list.innerHTML = '';
        const disputes = convertToArray(data.history);
        if (!disputes.length) {
            list.innerHTML = emptyState('No disputes raised yet.');
            return;
        }
        disputes.forEach(dispute => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <strong>${dispute.type}</strong>
                <div>${dispute.description || ''}</div>
                <small>${formatDate(dispute.createdAt)} • ${dispute.status || 'Open'}</small>
            `;
            list.appendChild(item);
        });
    }

    function renderSupportModule(data = {}) {
        const chatLog = document.getElementById('supportChatLog');
        const faqList = document.getElementById('supportFaqList');

        if (chatLog) {
            chatLog.innerHTML = '';
            const messages = convertToArray(data.messages).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            if (!messages.length) {
                chatLog.innerHTML = emptyState('Chat history will appear here.');
            } else {
                messages.forEach(msg => {
                    const entry = document.createElement('div');
                    entry.className = 'chat-entry';
                    entry.innerHTML = `
                        <strong>${msg.author || 'Support Bot'}</strong>
                        <p>${msg.message || ''}</p>
                        <small>${formatDate(msg.createdAt)}</small>
                    `;
                    chatLog.appendChild(entry);
                });
                chatLog.scrollTop = chatLog.scrollHeight;
            }
        }

        if (faqList) {
            faqList.innerHTML = '';
            const faqs = convertToArray(data.faqs);
            const topics = faqs.length ? faqs.map(item => item.title || item.question) : defaultFaqs;
            topics.forEach(topic => {
                const li = document.createElement('li');
                li.textContent = topic;
                faqList.appendChild(li);
            });
        }
    }

    function renderOrders(data = {}) {
        const list = document.getElementById('ordersList');
        if (!list) return;
        list.innerHTML = '';
        if (!data || !data.items) {
            list.innerHTML = emptyState('No completed imports yet.');
            return;
        }
        const orders = convertToArray(data.items);
        if (!orders.length) {
            list.innerHTML = emptyState('No completed imports yet.');
            return;
        }
        orders.forEach(order => {
            const card = document.createElement('article');
            card.className = 'order-card';
            card.innerHTML = `
                <strong>${order.orderId || 'Order'}</strong>
                <p>Delivered: ${order.deliveryDate || '—'}</p>
                <p>Total Cost: ${order.total || '—'}</p>
                <small>Documents • Invoice • Chat • Receipts</small>
            `;
            list.appendChild(card);
        });
    }

    function renderNotifications(data = {}) {
        const list = document.getElementById('notificationsList');
        if (!list) return;
        list.innerHTML = '';
        if (!data || !data.items) {
            list.innerHTML = emptyState('You are all caught up.');
            return;
        }
        const notifications = convertToArray(data.items);
        if (!notifications.length) {
            list.innerHTML = emptyState('You are all caught up.');
            return;
        }
        notifications
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .forEach(notification => {
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <strong>${notification.title || 'Update'}</strong>
                    <p>${notification.message || ''}</p>
                    <small>${formatDate(notification.createdAt)}</small>
                `;
                list.appendChild(item);
            });
    }

    function renderProfileSection(data = {}) {
        const businessDl = document.getElementById('profileBusinessDetails');
        const addressesUl = document.getElementById('profileAddresses');
        const preferencesDl = document.getElementById('profilePreferences');
        const paymentUl = document.getElementById('profilePaymentMethods');

        if (businessDl) {
            businessDl.innerHTML = '';
            const entries = {
                'Company Name': data.companyName,
                'Registration / IEC': data.registrationId,
                'Primary Contact': data.contactPerson,
                'Email': data.email,
                'Phone': data.phone
            };
            Object.entries(entries).forEach(([label, value]) => {
                const dt = document.createElement('dt');
                const dd = document.createElement('dd');
                dt.textContent = label;
                dd.textContent = value || '—';
                businessDl.append(dt, dd);
            });
        }

        if (addressesUl) {
            addressesUl.innerHTML = '';
            const addresses = data.addresses || [];
            if (!addresses.length) {
                addressesUl.innerHTML = '<li>No saved addresses yet.</li>';
            } else {
                addresses.forEach(address => {
                    const li = document.createElement('li');
                    li.textContent = address;
                    addressesUl.appendChild(li);
                });
            }
        }

        if (preferencesDl) {
            preferencesDl.innerHTML = '';
            const preferences = {
                'Preferred Language': data.language,
                'Default Currency': data.currency,
                'Notifications': data.notificationsEnabled ? 'Enabled' : 'Disabled'
            };
            Object.entries(preferences).forEach(([label, value]) => {
                const dt = document.createElement('dt');
                const dd = document.createElement('dd');
                dt.textContent = label;
                dd.textContent = value || '—';
                preferencesDl.append(dt, dd);
            });
        }

        if (paymentUl) {
            paymentUl.innerHTML = '';
            const methods = data.paymentMethods || [];
            if (!methods.length) {
                paymentUl.innerHTML = '<li>No payment methods saved.</li>';
            } else {
                methods.forEach(method => {
                    const li = document.createElement('li');
                    li.textContent = method;
                    paymentUl.appendChild(li);
                });
            }
        }
    }

    function handlePaymentSubmit(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const amount = parseFloat(form.amount.value);
        const currency = form.currency.value;
        const notes = form.notes.value.trim();
        if (!amount) {
            showToast('Enter a valid amount.');
            return;
        }
        const payload = {
            amount,
            currency,
            notes,
            createdAt: Date.now(),
            status: 'Pending'
        };
        importerDatabase.ref(`${currentUserBasePath}/payments/requests`).push(payload)
            .then(() => {
                form.reset();
                showToast('Payment request stored.');
            })
            .catch(() => showToast('Failed to store payment request.'));
    }

    function handleDisputeSubmit(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const payload = {
            type: form.type.value,
            description: form.description.value,
            status: 'Open',
            createdAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/disputes/history`).push(payload)
            .then(() => {
                form.reset();
                showToast('Dispute submitted.');
            })
            .catch(() => showToast('Failed to submit dispute.'));
    }

    function handleSupportMessageSubmit(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const message = form.message.value.trim();
        if (!message) {
            showToast('Enter a message first.');
            return;
        }
        const payload = {
            message,
            author: currentUser.displayName || currentUser.email || 'Importer',
            createdAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/support/messages`).push(payload)
            .then(() => {
                form.reset();
                showToast('Message sent to support.');
            })
            .catch(() => showToast('Failed to send message.'));
    }

    function handleDocumentAction(event) {
        const url = event.currentTarget.dataset.url;
        if (!url) {
            showToast('Document link not available yet.');
            return;
        }
        window.open(url, '_blank', 'noopener');
    }

    function attachEvents() {
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                activateSection(link.dataset.tab);
                link.focus();
            });
            link.addEventListener('keydown', handleTabKeydown);
        });

        document.getElementById('paymentForm')?.addEventListener('submit', handlePaymentSubmit);
        document.getElementById('disputeForm')?.addEventListener('submit', handleDisputeSubmit);
        document.getElementById('supportMessageForm')?.addEventListener('submit', handleSupportMessageSubmit);
        document.getElementById('documentsViewBtn')?.addEventListener('click', handleDocumentAction);
        document.getElementById('documentsDownloadBtn')?.addEventListener('click', handleDocumentAction);

        document.getElementById('refreshImporterData')?.addEventListener('click', () => {
            setStatusBadge('Syncing…', 'info');
            showToast('Listening for realtime updates.');
        });

        document.getElementById('importerLogoutBtn')?.addEventListener('click', async () => {
            if (!importerAuth) {
                window.location.href = '../index.html';
                return;
            }
            clearRealtimeBindings();
            await importerAuth.signOut();
            window.location.href = '../index.html';
        });

        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const toggleSidebar = () => sidebar?.classList.toggle('open');
        sidebarToggle?.addEventListener('click', toggleSidebar);
        mobileMenuToggle?.addEventListener('click', toggleSidebar);
    }

    function startRealtimeSync(uid) {
        if (!importerDatabase) return;
        currentUserBasePath = `importers/${uid}`;
        clearRealtimeBindings();
        bindRealtime(`${currentUserBasePath}/summary`, renderSummaryCards);
        bindRealtime(`${currentUserBasePath}/shipments`, renderShipments);
        bindRealtime(`${currentUserBasePath}/documents`, renderDocumentsSection);
        bindRealtime(`${currentUserBasePath}/payments`, renderPaymentPanel);
        bindRealtime(`${currentUserBasePath}/disputes`, renderDisputeHistory);
        bindRealtime(`${currentUserBasePath}/support`, renderSupportModule);
        bindRealtime(`${currentUserBasePath}/orders`, renderOrders);
        bindRealtime(`${currentUserBasePath}/notifications`, renderNotifications);
        bindRealtime(`${currentUserBasePath}/profile`, renderProfileSection);
        setStatusBadge('Synced', 'success');
        checkImporterEKYCStatus();
        listenForImporterEKYCStatusChanges();
    }

    function initAuthListener() {
        if (!importerAuth) {
            showToast('Firebase auth not available.');
            return;
        }
        importerAuth.onAuthStateChanged(user => {
            if (!user) {
                clearRealtimeBindings();
                window.location.href = '../index.html';
                return;
            }
            currentUser = user;
            const usernameEl = document.getElementById('importerUserName');
            if (usernameEl) {
                usernameEl.textContent = user.displayName || user.email || 'Importer Workspace';
            }
            startRealtimeSync(user.uid);
        });
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

    let importerUserCountry = null;
    let importerEkycData = null;
    let importerSelfieDataUrl = null;
    let importerCameraStream = null;
    let importerLocalStream = null;
    let importerRemoteStream = null;
    let importerPeerConnection = null;
    let importerVideoCallRequestId = null;
    let importerVideoCallListener = null;

    // WebRTC Configuration
    const importerRtcConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function handleImporterEKYCButtonClick() {
        try {
            openImporterEKYCModal().catch(error => {
                console.error('Async open failed, trying fallback:', error);
                forceOpenImporterEKYCModal();
            });
        } catch (error) {
            console.error('Error in button handler:', error);
            forceOpenImporterEKYCModal();
        }
    }

    async function checkImporterEKYCStatus() {
        if (!currentUser || !importerDatabase) return;

        try {
            const ekycRef = importerDatabase.ref(`${currentUserBasePath}/ekyc`);
            ekycRef.once('value', snapshot => {
                const ekycCard = document.getElementById('importerEkycCard');
                const ekycStatusCard = document.getElementById('importerEkycStatusCard');
                const videoCallRequestCard = document.getElementById('importerVideoCallRequestCard');

                if (!snapshot.exists()) {
                    if (ekycCard) ekycCard.style.display = 'block';
                    if (ekycStatusCard) ekycStatusCard.style.display = 'none';
                    if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
                    return;
                }

                importerEkycData = snapshot.val();
                if (importerEkycData.ekycCompleted !== true) {
                    if (ekycCard) ekycCard.style.display = 'block';
                    if (ekycStatusCard) ekycStatusCard.style.display = 'none';
                    if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
                    return;
                }

                if (ekycCard) ekycCard.style.display = 'none';
                if (ekycStatusCard) ekycStatusCard.style.display = 'block';

                const statusIcon = document.getElementById('importerEkycStatusIcon');
                const statusTitle = document.getElementById('importerEkycStatusTitle');
                const statusMessage = document.getElementById('importerEkycStatusMessage');

                if (statusIcon && statusTitle && statusMessage) {
                    const status = importerEkycData.ekycStatus || 'pending';
                    if (status === 'verified' || status === 'approved') {
                        statusIcon.textContent = '✓';
                        statusIcon.style.color = '#10b981';
                        statusTitle.textContent = 'eKYC Completed';
                        statusMessage.textContent = 'Your eKYC has been verified successfully. You can now access all features.';
                        if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
                    } else if (status === 'rejected') {
                        statusIcon.textContent = '✗';
                        statusIcon.style.color = '#ef4444';
                        statusTitle.textContent = 'eKYC Rejected';
                        statusMessage.textContent = 'Your eKYC verification was rejected. Reason: ' + (importerEkycData.rejectionReason || 'Not provided') + '. Please contact support to resubmit.';
                        if (videoCallRequestCard) videoCallRequestCard.style.display = 'none';
                    } else {
                        statusIcon.textContent = '📹';
                        statusIcon.style.color = '#3b82f6';
                        statusTitle.textContent = 'eKYC Submitted - Awaiting Verification';
                        statusMessage.textContent = 'Your documents have been received. Complete your verification with a video call to finish the process.';
                        if (videoCallRequestCard) videoCallRequestCard.style.display = 'block';
                    }
                }
            }).catch(error => {
                console.error('Error checking eKYC status:', error);
                // Permission errors are expected if rules aren't set up yet
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    console.warn('Permission denied. Please configure Firebase security rules.');
                    // Show eKYC card if permission denied (user hasn't set up rules yet)
                    const ekycCard = document.getElementById('importerEkycCard');
                    if (ekycCard) ekycCard.style.display = 'block';
                }
            });
        } catch (error) {
            console.error('Error checking eKYC status:', error);
        }
    }

    function listenForImporterEKYCStatusChanges() {
        if (!currentUser || !importerDatabase) return;
        const ekycRef = importerDatabase.ref(`${currentUserBasePath}/ekyc`);
        ekycRef.on('value', snapshot => {
            if (snapshot.exists()) {
                importerEkycData = snapshot.val();
                checkImporterEKYCStatus();
            } else {
                importerEkycData = null;
                checkImporterEKYCStatus();
            }
        }, error => {
            console.error('Error listening for eKYC status changes:', error);
            // Permission errors are expected if rules aren't set up yet
            if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                console.warn('Permission denied. Please configure Firebase security rules.');
            }
        });
    }

    async function openImporterEKYCModal() {
        const modal = document.getElementById('importerEkycModal');
        if (!modal) {
            console.error('eKYC modal element not found');
            return;
        }

        if (!currentUser) {
            showToast('Please login to complete eKYC');
            return;
        }

        try {
            if (importerDatabase) {
                const userRef = importerDatabase.ref(`${currentUserBasePath}/profile/address`);
                const snapshot = await userRef.once('value').catch(error => {
                    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                        console.warn('Permission denied. Using default country.');
                        return null;
                    }
                    throw error;
                });
                if (snapshot && snapshot.exists()) {
                    const userData = snapshot.val();
                    importerUserCountry = userData.country || 'India';
                } else {
                    importerUserCountry = 'India';
                }
            } else {
                importerUserCountry = 'India';
            }
        } catch (error) {
            console.error('Error fetching user country:', error);
            importerUserCountry = 'India';
        }

        try {
            if (importerDatabase) {
                const ekycRef = importerDatabase.ref(`${currentUserBasePath}/ekyc`);
                const snapshot = await ekycRef.once('value').catch(error => {
                    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                        console.warn('Permission denied. Proceeding with eKYC form.');
                        return null;
                    }
                    throw error;
                });
                if (snapshot && snapshot.exists()) {
                    importerEkycData = snapshot.val();
                    if (importerEkycData.ekycCompleted === true) {
                        showToast('You have already completed your eKYC.');
                        return;
                    }
                } else {
                    importerEkycData = null;
                }
            }
        } catch (error) {
            console.error('Error checking existing eKYC:', error);
            importerEkycData = null;
        }

        populateImporterEKYCForm();
        if (importerEkycData && importerEkycData.ekycCompleted !== true) {
            prefillImporterEKYCForm();
        }

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function forceOpenImporterEKYCModal() {
        const modal = document.getElementById('importerEkycModal');
        if (!modal) return;
        if (!importerUserCountry) importerUserCountry = 'India';
        populateImporterEKYCForm();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeImporterEKYCModal() {
        const modal = document.getElementById('importerEkycModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        stopImporterCamera();
        importerSelfieDataUrl = null;
        const selfieInput = document.getElementById('importerSelfieFile');
        if (selfieInput) {
            selfieInput.value = '';
            selfieInput.removeAttribute('data-valid');
        }
        const form = document.getElementById('importerEkycForm');
        if (form) {
            form.reset();
            clearImporterFilePreviews();
        }
        const message = document.getElementById('importerEkycMessage');
        if (message) {
            message.textContent = '';
            message.className = 'ekyc-message';
        }
        const submitBtn = document.getElementById('importerEkycSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit eKYC';
        }
    }

    function populateImporterEKYCForm() {
        const isIndia = importerUserCountry && importerUserCountry.toLowerCase() === 'india';

        const identitySelect = document.getElementById('importerIdentityProofType');
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

        const businessSelect = document.getElementById('importerBusinessProofType');
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

        const bankSelect = document.getElementById('importerBankProofType');
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

    function prefillImporterEKYCForm() {
        if (!importerEkycData) return;
        if (importerEkycData.selectedIdentityProof) {
            const select = document.getElementById('importerIdentityProofType');
            if (select) {
                select.value = importerEkycData.selectedIdentityProof;
                select.disabled = true;
            }
        }
        if (importerEkycData.selectedBusinessProof) {
            const select = document.getElementById('importerBusinessProofType');
            if (select) {
                select.value = importerEkycData.selectedBusinessProof;
                select.disabled = true;
            }
        }
        if (importerEkycData.selectedBankProof) {
            const select = document.getElementById('importerBankProofType');
            if (select) {
                select.value = importerEkycData.selectedBankProof;
                select.disabled = true;
            }
        }
    }

    async function startImporterCamera() {
        try {
            const video = document.getElementById('importerCameraVideo');
            const previewContainer = document.getElementById('importerCameraPreviewContainer');
            const startBtn = document.getElementById('importerStartCameraBtn');
            const captureBtn = document.getElementById('importerCaptureBtn');
            const cancelBtn = document.getElementById('importerCancelCameraBtn');

            importerCameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            video.srcObject = importerCameraStream;
            previewContainer.style.display = 'block';
            startBtn.style.display = 'none';
            captureBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
        } catch (error) {
            console.error('Error accessing camera:', error);
            showImporterEKYCMessage('Unable to access camera. Please check permissions.', 'error');
        }
    }

    function captureImporterSelfie() {
        const video = document.getElementById('importerCameraVideo');
        const canvas = document.getElementById('importerCameraCanvas');
        const preview = document.getElementById('importerSelfiePreview');
        const selfieInput = document.getElementById('importerSelfieFile');

        if (!video || !canvas || !importerCameraStream) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        importerSelfieDataUrl = imageUrl;

        preview.innerHTML = `
            <div style="margin-top: 8px;">
                <img src="${imageUrl}" alt="Selfie" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid var(--color-border);" />
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">Selfie captured</div>
            </div>
        `;

        if (selfieInput) {
            selfieInput.value = 'captured';
            selfieInput.setAttribute('data-valid', 'true');
        }
        stopImporterCamera();
        showImporterEKYCMessage('Selfie captured successfully', 'success');
    }

    function stopImporterCamera() {
        if (importerCameraStream) {
            importerCameraStream.getTracks().forEach(track => track.stop());
            importerCameraStream = null;
        }
        const video = document.getElementById('importerCameraVideo');
        const previewContainer = document.getElementById('importerCameraPreviewContainer');
        const startBtn = document.getElementById('importerStartCameraBtn');
        const captureBtn = document.getElementById('importerCaptureBtn');
        const cancelBtn = document.getElementById('importerCancelCameraBtn');
        if (video) video.srcObject = null;
        if (previewContainer) previewContainer.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-block';
        if (captureBtn) captureBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    function handleImporterFilePreview(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        const preview = document.getElementById(`${type}Preview`);
        if (!preview) return;
        if (file.size > 10 * 1024 * 1024) {
            showImporterEKYCMessage(`${type} file size should be less than 10MB`, 'error');
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

    function clearImporterFilePreviews() {
        const previews = ['importerIdentityProofPreview', 'importerBusinessProofPreview', 'importerBankProofPreview', 'importerSelfiePreview'];
        previews.forEach(id => {
            const preview = document.getElementById(id);
            if (preview) preview.innerHTML = '';
        });
    }

    function handleImporterIdentityProofChange() {
        // Additional validation if needed
    }

    async function submitImporterEKYC(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showImporterEKYCMessage('Not connected to Firebase.', 'error');
            return;
        }

        try {
            const ekycRef = importerDatabase.ref(`${currentUserBasePath}/ekyc`);
            const snapshot = await ekycRef.once('value');
            if (snapshot.exists() && snapshot.val().ekycCompleted === true) {
                showImporterEKYCMessage('You have already completed your eKYC', 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking eKYC status:', error);
        }

        const submitBtn = document.getElementById('importerEkycSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        try {
            const identityProofType = document.getElementById('importerIdentityProofType').value;
            const businessProofType = document.getElementById('importerBusinessProofType').value;
            const bankProofType = document.getElementById('importerBankProofType').value;
            const identityProofFile = document.getElementById('importerIdentityProofFile').files[0];
            const businessProofFile = document.getElementById('importerBusinessProofFile').files[0];
            const bankProofFile = document.getElementById('importerBankProofFile').files[0];

            if (!identityProofFile || !businessProofFile || !bankProofFile) {
                showImporterEKYCMessage('Please upload all required documents', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit eKYC';
                }
                return;
            }

            if (!importerSelfieDataUrl) {
                showImporterEKYCMessage('Please capture a live selfie before submitting', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit eKYC';
                }
                return;
            }

            showImporterEKYCMessage('Processing documents...', 'info');

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
                    dataUrl: importerSelfieDataUrl,
                    fileName: `selfie-${Date.now()}.jpg`,
                    fileType: 'image/jpeg',
                    uploadedAt: timestampIso
                }
            };

            const ekycData = {
                ekycStatus: 'pending',
                ekycCompleted: true,
                selectedIdentityProof: identityProofType,
                selectedBusinessProof: businessProofType,
                selectedBankProof: bankProofType,
                country: importerUserCountry || 'India',
                userName: document.getElementById('importerFullName')?.value?.trim() || currentUser.displayName || '',
                userEmail: currentUser.email,
                documents: documentsPayload,
                timestamp: timestampIso,
                updatedAt: timestampIso
            };

            await importerDatabase.ref(`${currentUserBasePath}/ekyc`).set(ekycData).catch(error => {
                console.error('Error saving eKYC data:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showImporterEKYCMessage('Permission denied. Please configure Firebase security rules to allow authenticated users to write their own data.', 'error');
                } else {
                    showImporterEKYCMessage('Failed to submit eKYC. Please try again.', 'error');
                }
                throw error;
            });

            showImporterEKYCMessage('Your eKYC has been submitted successfully. You can now request a video call for verification.', 'success');

            setTimeout(() => {
                closeImporterEKYCModal();
                checkImporterEKYCStatus();
                const videoCallRequestCard = document.getElementById('importerVideoCallRequestCard');
                if (videoCallRequestCard) {
                    videoCallRequestCard.style.display = 'block';
                }
            }, 2000);

        } catch (error) {
            console.error('Error submitting eKYC:', error);
            showImporterEKYCMessage('Failed to submit eKYC. Please try again.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit eKYC';
            }
        }
    }

    function showImporterEKYCMessage(message, type = 'success') {
        const messageEl = document.getElementById('importerEkycMessage');
        if (!messageEl) return;
        messageEl.textContent = message;
        messageEl.className = `ekyc-message ${type} show`;
        if (type !== 'error') {
            setTimeout(() => {
                messageEl.classList.remove('show');
            }, 5000);
        }
    }

    async function requestImporterVideoCall() {
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }

        if (!importerEkycData || importerEkycData.ekycCompleted !== true) {
            showToast('Please complete eKYC submission first');
            return;
        }

        if (importerEkycData.ekycStatus === 'verified') {
            showToast('Your eKYC is already verified!');
            return;
        }

        const modal = document.getElementById('importerVideoCallModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            document.getElementById('importerWaitingForAgent').style.display = 'block';
            document.getElementById('importerVideoCallInterface').style.display = 'none';
            document.getElementById('importerCallEnded').style.display = 'none';
        }

        try {
            const requestData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: currentUser.displayName || currentUser.email.split('@')[0],
                ekycId: currentUser.uid,
                status: 'pending',
                ekycStatus: 'pending_verification',
                timestamp: Date.now(),
                createdAt: new Date().toISOString()
            };

            const requestRef = importerDatabase.ref(`${currentUserBasePath}/videoCallRequests`).push(requestData);
            importerVideoCallRequestId = requestRef.key;
            showToast('Request sent to admin. Waiting for response...');
            listenForImporterAgentAcceptance(importerVideoCallRequestId);
        } catch (error) {
            console.error('Error requesting video call:', error);
            showToast('Failed to request video call. Please try again.');
            closeImporterVideoCallModal();
        }
    }

    function listenForImporterAgentAcceptance(requestId) {
        if (!importerDatabase) return;
        const requestRef = importerDatabase.ref(`${currentUserBasePath}/videoCallRequests/${requestId}`);
        requestRef.on('value', snapshot => {
            if (!snapshot.exists()) return;
            const data = snapshot.val();
            if (data.status === 'accepted' && data.agentId) {
                showToast('Agent connected! Starting video call...');
                startImporterVideoCall(data.agentId, requestId);
            } else if (data.status === 'rejected') {
                closeImporterVideoCallModal();
                showToast('Your verification request was rejected. Please try again later.');
            } else if (data.status === 'completed') {
                if (data.ekycStatus === 'verified') {
                    showToast('Your eKYC has been verified! Closing video call...');
                    setTimeout(() => {
                        closeImporterVideoCallModal();
                        checkImporterEKYCStatus();
                    }, 2000);
                } else if (data.ekycStatus === 'rejected') {
                    closeImporterVideoCallModal();
                    showToast('Your eKYC was rejected. Reason: ' + (data.rejectionReason || 'Not provided'));
                    setTimeout(() => {
                        checkImporterEKYCStatus();
                    }, 1000);
                }
            }
        });
    }

    async function startImporterVideoCall(agentId, requestId) {
        try {
            document.getElementById('importerWaitingForAgent').style.display = 'none';
            document.getElementById('importerVideoCallInterface').style.display = 'block';

            importerLocalStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const localVideo = document.getElementById('importerLocalVideo');
            if (localVideo) {
                localVideo.srcObject = importerLocalStream;
            }

            importerPeerConnection = new RTCPeerConnection(importerRtcConfiguration);

            importerLocalStream.getTracks().forEach(track => {
                importerPeerConnection.addTrack(track, importerLocalStream);
            });

            importerPeerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('importerRemoteVideo');
                if (remoteVideo) {
                    importerRemoteStream = event.streams[0];
                    remoteVideo.srcObject = importerRemoteStream;
                }
            };

            importerPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidateData = {
                        candidate: event.candidate.candidate,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid,
                        usernameFragment: event.candidate.usernameFragment
                    };
                    importerDatabase.ref(`${currentUserBasePath}/videoCallRequests/${requestId}`).update({
                        userIceCandidate: candidateData,
                        updatedAt: new Date().toISOString()
                    });
                }
            };

            const offer = await importerPeerConnection.createOffer();
            await importerPeerConnection.setLocalDescription(offer);

            await importerDatabase.ref(`${currentUserBasePath}/videoCallRequests/${requestId}`).update({
                offer: offer,
                status: 'connecting'
            });

            // Listen for answer from admin
            const requestRef = importerDatabase.ref(`${currentUserBasePath}/videoCallRequests/${requestId}`);
            requestRef.on('value', async (snapshot) => {
                if (!snapshot.exists()) return;
                const data = snapshot.val();
                
                // Process answer
                if (data.answer && importerPeerConnection && importerPeerConnection.signalingState === 'have-local-offer') {
                    try {
                        await importerPeerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        console.log('Answer received and set');
                    } catch (error) {
                        console.error('Error setting remote description:', error);
                    }
                }
                
                // Process ICE candidates from admin
                if (data.agentIceCandidate && importerPeerConnection) {
                    try {
                        await importerPeerConnection.addIceCandidate(new RTCIceCandidate(data.agentIceCandidate));
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error starting video call:', error);
            showToast('Failed to start video call. Please try again.');
        }
    }

    function toggleImporterMute() {
        if (importerLocalStream) {
            const audioTracks = importerLocalStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            const btn = document.getElementById('importerMuteBtn');
            if (btn) {
                btn.classList.toggle('muted', !audioTracks[0].enabled);
            }
        }
    }

    function toggleImporterVideo() {
        if (importerLocalStream) {
            const videoTracks = importerLocalStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            const btn = document.getElementById('importerVideoBtn');
            if (btn) {
                btn.classList.toggle('disabled', !videoTracks[0].enabled);
            }
        }
    }

    function endImporterVideoCall() {
        if (importerLocalStream) {
            importerLocalStream.getTracks().forEach(track => track.stop());
            importerLocalStream = null;
        }
        if (importerPeerConnection) {
            importerPeerConnection.close();
            importerPeerConnection = null;
        }
        document.getElementById('importerVideoCallInterface').style.display = 'none';
        document.getElementById('importerCallEnded').style.display = 'block';
    }

    function closeImporterVideoCallModal() {
        const modal = document.getElementById('importerVideoCallModal');
        if (!modal) return;
        endImporterVideoCall();
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (importerVideoCallListener && importerDatabase) {
            const requestRef = importerDatabase.ref(`${currentUserBasePath}/videoCallRequests/${importerVideoCallRequestId}`);
            requestRef.off('value', importerVideoCallListener);
            importerVideoCallListener = null;
        }
    }

    // Make eKYC functions globally available
    window.handleImporterEKYCButtonClick = handleImporterEKYCButtonClick;
    window.openImporterEKYCModal = openImporterEKYCModal;
    window.closeImporterEKYCModal = closeImporterEKYCModal;
    window.submitImporterEKYC = submitImporterEKYC;
    window.startImporterCamera = startImporterCamera;
    window.captureImporterSelfie = captureImporterSelfie;
    window.stopImporterCamera = stopImporterCamera;
    window.handleImporterFilePreview = handleImporterFilePreview;
    window.handleImporterIdentityProofChange = handleImporterIdentityProofChange;
    window.requestImporterVideoCall = requestImporterVideoCall;
    window.toggleImporterMute = toggleImporterMute;
    window.toggleImporterVideo = toggleImporterVideo;
    window.endImporterVideoCall = endImporterVideoCall;
    window.closeImporterVideoCallModal = closeImporterVideoCallModal;

    // Close eKYC modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('importerEkycModal');
            if (modal && modal.classList.contains('active')) {
                closeImporterEKYCModal();
            }
            const videoModal = document.getElementById('importerVideoCallModal');
            if (videoModal && videoModal.classList.contains('active')) {
                closeImporterVideoCallModal();
            }
        }
    });

    // ============================================
    // PROFILE MODAL FUNCTIONS
    // ============================================

    function openImporterProfileModal() {
        const modal = document.getElementById('importerProfileModal');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        loadImporterProfileData();
    }

    function closeImporterProfileModal() {
        const modal = document.getElementById('importerProfileModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function switchImporterProfileTab(sectionName) {
        const sections = document.querySelectorAll('#importerProfileModal .profile-section');
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) targetSection.classList.add('active');

        const tabs = document.querySelectorAll('#importerProfileModal .profile-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-section') === sectionName) {
                tab.classList.add('active');
            }
        });
    }

    function loadImporterProfileData() {
        if (!currentUser || !importerDatabase) return;
        const profileRef = importerDatabase.ref(`${currentUserBasePath}/profile`);
        profileRef.once('value', snapshot => {
            const data = snapshot.val() || {};
            if (data.basic) {
                document.getElementById('importerFullName').value = data.basic.fullName || '';
                document.getElementById('importerEmail').value = currentUser.email || '';
                document.getElementById('importerPhoneNumber').value = data.basic.phoneNumber || '';
                document.getElementById('importerAlternatePhone').value = data.basic.alternatePhone || '';
                if (data.basic.profilePhoto) {
                    const img = document.getElementById('importerPhotoPreviewImg');
                    img.src = data.basic.profilePhoto;
                    img.style.display = 'block';
                    document.getElementById('importerPhotoPreviewText').style.display = 'none';
                }
            }
            if (data.business) {
                document.getElementById('importerCompanyName').value = data.business.companyName || '';
                document.getElementById('importerBusinessType').value = data.business.businessType || '';
                document.getElementById('importerYearEstablished').value = data.business.yearEstablished || '';
                document.getElementById('importerBusinessCategory').value = data.business.businessCategory || '';
                document.getElementById('importerCompanyWebsite').value = data.business.companyWebsite || '';
                document.getElementById('importerCompanyDescription').value = data.business.companyDescription || '';
            }
            if (data.compliance) {
                document.getElementById('importerIecNumber').value = data.compliance.iecNumber || '';
                document.getElementById('importerGstNumber').value = data.compliance.gstNumber || '';
                document.getElementById('importerPanNumber').value = data.compliance.panNumber || '';
                document.getElementById('importerCinNumber').value = data.compliance.cinNumber || '';
                document.getElementById('importerDgftRegion').value = data.compliance.dgftRegion || '';
            }
            if (data.import) {
                document.getElementById('importerPrimaryProduct').value = data.import.primaryProduct || '';
                document.getElementById('importerProductCategory').value = data.import.productCategory || '';
                document.getElementById('importerHsCode').value = data.import.hsCode || '';
                document.getElementById('importerMonthlyVolume').value = data.import.monthlyVolume || '';
                document.getElementById('importerShippingMethod').value = data.import.shippingMethod || '';
            }
            if (data.address) {
                document.getElementById('importerBusinessAddress').value = data.address.businessAddress || '';
                document.getElementById('importerCity').value = data.address.city || '';
                document.getElementById('importerState').value = data.address.state || '';
                document.getElementById('importerCountry').value = data.address.country || '';
                document.getElementById('importerPincode').value = data.address.pincode || '';
            }
            if (data.banking) {
                document.getElementById('importerBankName').value = data.banking.bankName || '';
                document.getElementById('importerAccountHolderName').value = data.banking.accountHolderName || '';
                document.getElementById('importerAccountNumber').value = data.banking.accountNumber || '';
                document.getElementById('importerIfscCode').value = data.banking.ifscCode || '';
                document.getElementById('importerPaymentMethod').value = data.banking.paymentMethod || '';
            }
        }).catch(error => {
            console.error('Error loading profile data:', error);
            // Permission errors are expected if rules aren't set up yet
            if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                console.warn('Permission denied. Please configure Firebase security rules.');
            }
        });
    }

    function saveImporterBasicInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const data = {
            fullName: form.fullName.value,
            phoneNumber: form.phoneNumber.value,
            alternatePhone: form.alternatePhone.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/basic`).update(data)
            .then(() => showToast('Basic information saved successfully.'))
            .catch(error => {
                console.error('Error saving basic info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save basic information.');
                }
            });
    }

    function saveImporterBusinessInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const data = {
            companyName: form.companyName.value,
            businessType: form.businessType.value,
            yearEstablished: form.yearEstablished.value,
            businessCategory: form.businessCategory.value,
            companyWebsite: form.companyWebsite.value,
            companyDescription: form.companyDescription.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/business`).update(data)
            .then(() => showToast('Business information saved successfully.'))
            .catch(error => {
                console.error('Error saving business info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save business information.');
                }
            });
    }

    function saveImporterComplianceInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const data = {
            iecNumber: form.iecNumber.value,
            gstNumber: form.gstNumber.value,
            panNumber: form.panNumber.value,
            cinNumber: form.cinNumber.value,
            dgftRegion: form.dgftRegion.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/compliance`).update(data)
            .then(() => showToast('Compliance information saved successfully.'))
            .catch(error => {
                console.error('Error saving compliance info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save compliance information.');
                }
            });
    }

    function saveImporterImportInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const selectedCountries = Array.from(form.sourceCountries.selectedOptions).map(opt => opt.value);
        const data = {
            primaryProduct: form.primaryProduct.value,
            productCategory: form.productCategory.value,
            hsCode: form.hsCode.value,
            sourceCountries: selectedCountries,
            monthlyVolume: form.monthlyVolume.value,
            shippingMethod: form.shippingMethod.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/import`).update(data)
            .then(() => showToast('Import information saved successfully.'))
            .catch(error => {
                console.error('Error saving import info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save import information.');
                }
            });
    }

    function saveImporterAddressInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const data = {
            businessAddress: form.businessAddress.value,
            city: form.city.value,
            state: form.state.value,
            country: form.country.value,
            pincode: form.pincode.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/address`).update(data)
            .then(() => showToast('Address information saved successfully.'))
            .catch(error => {
                console.error('Error saving address info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save address information.');
                }
            });
    }

    function saveImporterBankingInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerDatabase) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const data = {
            bankName: form.bankName.value,
            accountHolderName: form.accountHolderName.value,
            accountNumber: form.accountNumber.value,
            ifscCode: form.ifscCode.value,
            paymentMethod: form.paymentMethod.value,
            updatedAt: Date.now()
        };
        importerDatabase.ref(`${currentUserBasePath}/profile/banking`).update(data)
            .then(() => showToast('Banking information saved successfully.'))
            .catch(error => {
                console.error('Error saving banking info:', error);
                if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                    showToast('Permission denied. Please configure Firebase security rules.');
                } else {
                    showToast('Failed to save banking information.');
                }
            });
    }

    function saveImporterDocumentsInfo(event) {
        event.preventDefault();
        showToast('Document upload functionality will be implemented with file storage.');
    }

    function saveImporterSettingsInfo(event) {
        event.preventDefault();
        if (!currentUser || !importerAuth) {
            showToast('Not connected to Firebase.');
            return;
        }
        const form = event.target;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;
        if (newPassword && newPassword !== confirmPassword) {
            showToast('New passwords do not match.');
            return;
        }
        if (newPassword) {
            currentUser.updatePassword(newPassword)
                .then(() => showToast('Password updated successfully.'))
                .catch(() => showToast('Failed to update password.'));
        }
        showToast('Settings saved successfully.');
    }

    function handleImporterPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB for Base64)
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size should be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('importerPhotoPreviewImg');
            img.src = e.target.result;
            img.style.display = 'block';
            document.getElementById('importerPhotoPreviewText').style.display = 'none';
            if (currentUser && importerDatabase) {
                importerDatabase.ref(`${currentUserBasePath}/profile/basic/profilePhoto`).set(e.target.result)
                    .then(() => showToast('Profile photo uploaded successfully.'))
                    .catch(error => {
                        console.error('Error uploading profile photo:', error);
                        if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                            showToast('Permission denied. Please configure Firebase security rules.');
                        } else {
                            showToast('Failed to upload profile photo.');
                        }
                    });
            }
        };
        reader.onerror = function() {
            showToast('Failed to read file.');
        };
        reader.readAsDataURL(file);
    }

    function handleImporterDocumentUpload(event, fieldId) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`${fieldId}Preview`);
            preview.innerHTML = `<small>${file.name} (${(file.size / 1024).toFixed(2)} KB)</small>`;
            showToast('Document uploaded. Click Save Documents to store.');
        };
        reader.readAsDataURL(file);
    }

    function handleImporterLogout() {
        if (!importerAuth) {
            window.location.href = '../index.html';
            return;
        }
        clearRealtimeBindings();
        importerAuth.signOut().then(() => {
            window.location.href = '../index.html';
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('importerProfileModal');
            if (modal && modal.classList.contains('active')) {
                closeImporterProfileModal();
            }
        }
    });

    // ============================================
    // DOCUMENTS MODULE
    // ============================================
    let importerDocumentsCache = [];
    let importerCurrentDocument = null;
    let importerDocumentRequirementsInitialized = false;

    const importerDocumentTypeMap = {
        'iecCertificate': { name: 'IEC Certificate', category: 'iec', icon: '📋' },
        'gstCertificate': { name: 'GST Certificate', category: 'gst', icon: '📋' },
        'companyRegistration': { name: 'Company Registration', category: 'company', icon: '🏢' },
        'ownerIdProof': { name: 'Owner ID Proof', category: 'idproof', icon: '🪪' },
        'addressProof': { name: 'Address Proof', category: 'addressproof', icon: '📮' },
        'profilePhoto': { name: 'Profile Photo', category: 'profile', icon: '👤' },
        'identityProof': { name: 'Identity Proof', category: 'idproof', icon: '🪪' },
        'businessProof': { name: 'Business Proof', category: 'company', icon: '🏢' },
        'bankProof': { name: 'Bank Proof', category: 'bankstatement', icon: '🏦' },
        'selfie': { name: 'Verification Selfie', category: 'other', icon: '🤳' },
    };

    const IMPORTER_DOCUMENT_MODES = ['sea', 'air', 'imports', 'exports'];

    const importerCountryDocumentMatrix = [
        {
            id: 'india',
            name: 'India',
            corridor: 'Nhava Sheva (JNPT), Mundra, Chennai, Delhi Airport',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice with HS code, value, and terms (GST compliant).',
                'Packing List with detailed item-wise breakdown for customs examination.',
                'Bill of Entry (BOE) filed electronically via ICEGATE before cargo arrival.',
                'Bill of Lading (BOL) or Air Waybill (AWB) from carrier.',
                'Import License / Registration Certificate for restricted items (DGFT).',
                'Certificate of Origin if claiming preferential duty rates.',
                'Insurance Certificate covering shipment value.',
                'GST Registration Certificate (GSTIN) for importer.',
            ],
            requirements: [
                { document: 'Commercial Invoice', use: 'Customs valuation, duty calculation & GST compliance', issuer: 'Foreign Exporter / Supplier', linkLabel: 'ICEGATE Import Guidelines', linkUrl: 'https://icegate.gov.in' },
                { document: 'Packing List', use: 'Physical examination, cargo verification & load planning', issuer: 'Foreign Exporter / Supplier', linkLabel: 'CBIC Import Procedures', linkUrl: 'https://www.cbic.gov.in' },
                { document: 'Bill of Entry (BOE)', use: 'Primary import declaration & customs clearance at port', issuer: 'Indian Importer / Customs Broker via ICEGATE', linkLabel: 'ICEGATE Bill of Entry', linkUrl: 'https://icegate.gov.in' },
                { document: 'Bill of Lading / Air Waybill', use: 'Proof of shipment, cargo release & title transfer', issuer: 'Shipping Line / Airline / Freight Forwarder', linkLabel: 'Directorate General of Shipping', linkUrl: 'https://www.dgshipping.gov.in' },
                { document: 'Import License / Registration', use: 'Required for restricted/prohibited items per ITC-HS', issuer: 'DGFT / Competent Authority', linkLabel: 'DGFT Import Licensing', linkUrl: 'https://dgft.gov.in' },
                { document: 'Certificate of Origin', use: 'Preferential duty claims under FTAs (ASEAN, SAFTA, etc.)', issuer: 'Chamber of Commerce / Authorized Body in Exporting Country', linkLabel: 'DGFT e-COO', linkUrl: 'https://coo.dgft.gov.in' },
                { document: 'Insurance Certificate', use: 'Cargo insurance coverage during transit', issuer: 'Insurance Company', linkLabel: 'IRDA Insurance', linkUrl: 'https://www.irdai.gov.in' },
                { document: 'GST Registration (GSTIN)', use: 'GST compliance & input tax credit for importer', issuer: 'GST Department', linkLabel: 'GST Portal', linkUrl: 'https://www.gst.gov.in' },
            ],
        },
        {
            id: 'united-states',
            name: 'United States',
            corridor: 'Ports: New York/New Jersey, Los Angeles/Long Beach, Savannah, Houston',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice with detailed product description, HS code, and value.',
                'Packing List showing contents, weights, and dimensions.',
                'Bill of Lading (BOL) or Air Waybill (AWB) from carrier.',
                'Importer Security Filing (ISF 10+2) for ocean shipments (24 hours before loading).',
                'CBP Entry (Form 3461/7501) filed via customs broker in ACE system.',
                'IRS Number (EIN or SSN) for customs bond and duty payment.',
                'Customs Bond (Single Entry or Continuous) to guarantee duty payment.',
                'FDA/USDA/Partner Agency Certifications for regulated products.',
            ],
            requirements: [
                { document: 'Commercial Invoice', use: 'CBP customs entry, duty assessment & valuation', issuer: 'Foreign Exporter / Supplier', linkLabel: 'US CBP Import Requirements', linkUrl: 'https://www.cbp.gov/trade/basic-import-export' },
                { document: 'Packing List', use: 'CBP inspection, cargo examination & deconsolidation', issuer: 'Foreign Exporter / Supplier', linkLabel: 'CBP Trade Documentation', linkUrl: 'https://www.cbp.gov/trade' },
                { document: 'Bill of Lading / Air Waybill', use: 'Arrival notice, cargo release & delivery order', issuer: 'Carrier / NVOCC / Airline', linkLabel: 'Federal Maritime Commission', linkUrl: 'https://www.fmc.gov' },
                { document: 'Importer Security Filing (ISF 10+2)', use: 'Mandatory security filing for ocean cargo (24hrs before loading)', issuer: 'US Importer / Customs Broker', linkLabel: 'CBP ISF 10+2 Requirements', linkUrl: 'https://www.cbp.gov/border-security/ports-entry/cargo-security/importer-security-filing-102' },
                { document: 'CBP Entry (Form 3461/7501)', use: 'Formal import clearance & duty payment via ACE', issuer: 'US Customs Broker / Importer', linkLabel: 'CBP ACE System', linkUrl: 'https://www.cbp.gov/trade/automated' },
                { document: 'IRS Number (EIN/SSN)', use: 'Customs bond requirement & duty payment identification', issuer: 'Internal Revenue Service (IRS)', linkLabel: 'IRS EIN Application', linkUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-ein' },
                { document: 'Customs Bond', use: 'Guarantee for duty payment & compliance (Single/Continuous)', issuer: 'Surety Company / Customs Broker', linkLabel: 'CBP Customs Bonds', linkUrl: 'https://www.cbp.gov/trade/finance/bonds' },
                { document: 'FDA/USDA/Partner Agency Docs', use: 'Regulatory clearance for food, drugs, agriculture, electronics', issuer: 'FDA / USDA / Relevant Agency', linkLabel: 'FDA Import Basics', linkUrl: 'https://www.fda.gov/industry/import-basics' },
            ],
        },
        {
            id: 'european-union',
            name: 'European Union',
            corridor: 'Ports: Rotterdam, Hamburg, Antwerp, Felixstowe, Le Havre',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice & Packing List with detailed product information.',
                'Bill of Lading or Air Waybill from carrier.',
                'Entry Summary Declaration (ENS/ICS2) filed before arrival (24-48hrs).',
                'EU Single Administrative Document (SAD) for customs declaration.',
                'EORI Number (Economic Operators Registration) for EU importer.',
                'VAT Registration Number for VAT payment and recovery.',
                'Certificate of Origin / EUR.1 for preferential duty rates.',
                'Product-specific certificates (CE marking, health, phytosanitary).',
            ],
            requirements: [
                { document: 'Commercial Invoice & Packing List', use: 'Customs declaration base data, VAT calculation & duty assessment', issuer: 'Foreign Exporter / Supplier', linkLabel: 'EU Customs & Taxation', linkUrl: 'https://taxation-customs.ec.europa.eu' },
                { document: 'Bill of Lading / Air Waybill', use: 'Proof of shipment, cargo release at port & delivery order', issuer: 'Carrier / Freight Forwarder', linkLabel: 'Port of Rotterdam', linkUrl: 'https://www.portofrotterdam.com' },
                { document: 'Entry Summary Declaration (ENS/ICS2)', use: 'Pre-arrival security/safety filing (24-48hrs before arrival)', issuer: 'Carrier / Authorized Representative', linkLabel: 'ICS2 Security Filing', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/customs-security/import-control-system-2-ics2_en' },
                { document: 'EU Customs Declaration (SAD)', use: 'Formal import clearance, duty payment & release into free circulation', issuer: 'EU Customs Broker / Importer', linkLabel: 'EU Customs Procedures', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/customs-procedures_en' },
                { document: 'EORI Number', use: 'Economic Operators Registration for all EU customs transactions', issuer: 'EU Member State Customs Authority', linkLabel: 'EORI Registration', linkUrl: 'https://ec.europa.eu/taxation_customs/business/customs-procedures-import-and-export/customs-procedures/economic-operators-registration-identification-number-eori_en' },
                { document: 'VAT Registration Number', use: 'VAT payment on import & input tax credit recovery', issuer: 'EU Member State Tax Authority', linkLabel: 'EU VAT Information', linkUrl: 'https://ec.europa.eu/taxation_customs/business/vat_en' },
                { document: 'Certificate of Origin / EUR.1', use: 'Preferential duty rates under EU FTAs & GSP schemes', issuer: 'Chamber of Commerce / Competent Authority', linkLabel: 'EU Preferential Origin', linkUrl: 'https://taxation-customs.ec.europa.eu/customs-4/preferential-origins_en' },
                { document: 'Product Certificates (CE, Health, Phyto)', use: 'Compliance with EU product safety, health & phytosanitary standards', issuer: 'Competent Authorities / Testing Labs', linkLabel: 'EU Product Compliance', linkUrl: 'https://ec.europa.eu/growth/single-market/ce-marking_en' },
            ],
        },
        {
            id: 'united-kingdom',
            name: 'United Kingdom',
            corridor: 'Ports: Felixstowe, Southampton, London Gateway, Heathrow Airport',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice & Packing List per UK customs requirements.',
                'Bill of Lading or Air Waybill for cargo release.',
                'UK Customs Declaration (CDS) filed via customs broker.',
                'EORI Number for UK importer (post-Brexit requirement).',
                'VAT Registration Number for VAT payment.',
                'Certificate of Origin if claiming preferential rates.',
                'Health/Phytosanitary certificates for regulated goods.',
            ],
            requirements: [
                { document: 'Commercial Invoice & Packing List', use: 'UK customs declaration data & HMRC assessment', issuer: 'Foreign Exporter / Supplier', linkLabel: 'HMRC Import Guidelines', linkUrl: 'https://www.gov.uk/guidance/filling-in-your-customs-declaration' },
                { document: 'Bill of Lading / Air Waybill', use: 'Cargo release & delivery order at UK port', issuer: 'Carrier / Freight Forwarder', linkLabel: 'UK Border Force', linkUrl: 'https://www.gov.uk/government/organisations/border-force' },
                { document: 'UK Customs Declaration (CDS)', use: 'Import clearance via Customs Declaration Service', issuer: 'UK Customs Broker / Importer', linkLabel: 'CDS Access', linkUrl: 'https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service' },
                { document: 'EORI Number', use: 'Economic Operators Registration for UK customs', issuer: 'HMRC', linkLabel: 'EORI Registration UK', linkUrl: 'https://www.gov.uk/eori' },
                { document: 'VAT Registration', use: 'VAT payment on import & recovery', issuer: 'HMRC', linkLabel: 'UK VAT Registration', linkUrl: 'https://www.gov.uk/vat-registration' },
                { document: 'Certificate of Origin', use: 'Preferential duty under UK trade agreements', issuer: 'Chamber of Commerce', linkLabel: 'UK Trade Agreements', linkUrl: 'https://www.gov.uk/guidance/check-your-goods-meet-the-rules-of-origin' },
            ],
        },
        {
            id: 'canada',
            name: 'Canada',
            corridor: 'Ports: Vancouver, Prince Rupert, Montreal, Toronto Airport',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice or Canada Customs Invoice (CBSA format).',
                'Packing List for CBSA inspection.',
                'Bill of Lading or Air Waybill.',
                'Customs Declaration (B3) filed via broker in CARM system.',
                'Business Number (BN) and Import/Export Account from CRA.',
                'CUSMA/Phytosanitary certificates when applicable.',
            ],
            requirements: [
                { document: 'Commercial Invoice / Canada Customs Invoice', use: 'CBSA import valuation & duty assessment', issuer: 'Foreign Exporter / Supplier', linkLabel: 'CBSA Importing', linkUrl: 'https://www.cbsa-asfc.gc.ca/import/menu-eng.html' },
                { document: 'Packing List', use: 'CBSA inspection & cargo examination', issuer: 'Foreign Exporter / Supplier', linkLabel: 'CBSA Programs', linkUrl: 'https://www.cbsa-asfc.gc.ca/prog/ccp-pcc/menu-eng.html' },
                { document: 'Bill of Lading / Air Waybill', use: 'Manifest & cargo release at Canadian port', issuer: 'Carrier', linkLabel: 'Port of Vancouver', linkUrl: 'https://www.portvancouver.com' },
                { document: 'Customs Declaration (B3)', use: 'Formal import clearance via CARM/CCS', issuer: 'Canadian Customs Broker / Importer', linkLabel: 'CBSA CARM', linkUrl: 'https://www.cbsa-asfc.gc.ca/prog/carm-gcra/menu-eng.html' },
                { document: 'Business Number (BN) & Import Account', use: 'CRA registration for duty payment & GST', issuer: 'Canada Revenue Agency (CRA)', linkLabel: 'CRA Business Number', linkUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/registering-your-business/register.html' },
                { document: 'CUSMA / Phytosanitary Certificates', use: 'Preferential duty & CFIA clearance for regulated goods', issuer: 'CFIA / Authorized Bodies', linkLabel: 'CFIA Import Guidance', linkUrl: 'https://inspection.canada.ca' },
            ],
        },
        {
            id: 'australia',
            name: 'Australia',
            corridor: 'Ports: Sydney, Melbourne, Brisbane, Perth',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice & Packing List (Australian Border Force format).',
                'Bill of Lading or Air Waybill.',
                'Import Declaration (N10/N20) via Integrated Cargo System (ICS).',
                'ABN (Australian Business Number) for importer.',
                'Biosecurity treatment or phytosanitary certificates (DAFF).',
            ],
            requirements: [
                { document: 'Commercial Invoice & Packing List', use: 'ABF import declaration & duty assessment', issuer: 'Foreign Exporter / Supplier', linkLabel: 'Australian Border Force', linkUrl: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing' },
                { document: 'Bill of Lading / Air Waybill', use: 'Manifest submission & delivery order', issuer: 'Carrier', linkLabel: 'Integrated Cargo System', linkUrl: 'https://www.abf.gov.au/help-and-support/ics' },
                { document: 'Import Declaration (ICS)', use: 'Formal entry (N10/N20) via ICS', issuer: 'Australian Customs Broker / Importer', linkLabel: 'ICS Lodgement', linkUrl: 'https://www.abf.gov.au/help-and-support/ics' },
                { document: 'ABN (Australian Business Number)', use: 'Business registration for GST & import clearance', issuer: 'Australian Taxation Office (ATO)', linkLabel: 'ABN Registration', linkUrl: 'https://www.abr.gov.au/business-super-funds/ applying-abn' },
                { document: 'Biosecurity Certificates', use: 'DAFF clearance for agriculture, food & plant products', issuer: 'Department of Agriculture / Competent Labs', linkLabel: 'DAFF Biosecurity', linkUrl: 'https://www.agriculture.gov.au/biosecurity-trade/import' },
            ],
        },
        {
            id: 'united-arab-emirates',
            name: 'United Arab Emirates',
            corridor: 'Ports: Jebel Ali, Khalifa Port, Dubai Airport, Abu Dhabi Airport',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice & Packing List attested as per UAE customs.',
                'Bill of Lading / Air Waybill for manifest submission.',
                'Import/Export declarations lodged via Dubai Trade single window.',
                'Certificate of Origin via local chamber portals.',
                'Insurance Certificate covering shipment value.',
            ],
            requirements: [
                { document: 'Commercial Invoice & Packing List', use: 'UAE customs valuation & inspection', issuer: 'Foreign Exporter / Supplier', linkLabel: 'Dubai Customs', linkUrl: 'https://www.dubaicustoms.gov.ae' },
                { document: 'Bill of Lading / Air Waybill', use: 'Manifest filing & delivery order', issuer: 'Carrier', linkLabel: 'Dubai Trade', linkUrl: 'https://www.dubaitrade.ae' },
                { document: 'Import Declaration', use: 'Single window clearance via Dubai Trade', issuer: 'UAE Importer / Customs Broker', linkLabel: 'Dubai Trade Portal', linkUrl: 'https://www.dubaitrade.ae' },
                { document: 'Certificate of Origin', use: 'Destination compliance & duty preference', issuer: 'Dubai Chamber / Local Chambers', linkLabel: 'Dubai Chamber', linkUrl: 'https://www.dubaichamber.com' },
                { document: 'Insurance Certificate', use: 'Cargo insurance for transit coverage', issuer: 'Insurance Company', linkLabel: 'UAE Insurance Authority', linkUrl: 'https://www.ia.gov.ae' },
            ],
        },
        {
            id: 'china',
            name: 'China',
            corridor: 'Ports: Shanghai, Ningbo, Shenzhen, Beijing Airport',
            modes: ['sea', 'air', 'imports'],
            quickChecklist: [
                'Commercial Invoice & Packing List aligned with GACC requirements.',
                'Bill of Lading / Air Waybill for manifest & release.',
                'CIQ / GACC declarations for regulated goods.',
                'Import License / Registration for restricted items.',
                'Certificate of Origin for preferential duty.',
            ],
            requirements: [
                { document: 'Commercial Invoice & Packing List', use: 'GACC customs clearance & duty assessment', issuer: 'Foreign Exporter / Supplier', linkLabel: 'China Customs', linkUrl: 'https://english.customs.gov.cn' },
                { document: 'Bill of Lading / Air Waybill', use: 'Manifest submission & delivery order', issuer: 'Carrier', linkLabel: 'Port of Shanghai', linkUrl: 'https://www.portshanghai.com.cn/en' },
                { document: 'CIQ / GACC Declaration', use: 'Inspection & quarantine compliance', issuer: 'GACC / CIQ', linkLabel: 'GACC', linkUrl: 'https://www.gacc.gov.cn' },
                { document: 'Import License / Registration', use: 'Market access for regulated goods', issuer: 'MOFCOM / SAMR', linkLabel: 'MOFCOM Trade', linkUrl: 'http://english.mofcom.gov.cn' },
                { document: 'Certificate of Origin', use: 'Preferential duty under China FTAs', issuer: 'Chamber of Commerce', linkLabel: 'China FTA Network', linkUrl: 'http://fta.mofcom.gov.cn' },
            ],
        },
    ];

    function getImporterDocumentTypeInfo(docType, fallbackName = '') {
        return importerDocumentTypeMap[docType] || {
            name: fallbackName || docType,
            category: 'other',
            icon: '📄',
        };
    }

    function extractImporterBase64Components(dataInput = '', fallbackMime = '') {
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

    function getImporterMimeType(base64String) {
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

    function calculateImporterBase64Size(base64String) {
        if (!base64String) return 0;
        const padding = (base64String.match(/=/g) || []).length;
        const bytes = Math.ceil((base64String.length * 3) / 4) - padding;
        return (bytes / 1024).toFixed(2);
    }

    function resolveImporterUploadedAt(...values) {
        for (const value of values) {
            if (!value) continue;
            if (typeof value === 'string') return value;
            if (value instanceof Date) return value.toISOString();
            if (typeof value.toDate === 'function') {
                try {
                    return value.toDate().toISOString();
                } catch (error) {
                    console.warn('Unable to convert timestamp:', error);
                }
            }
        }
        return new Date().toISOString();
    }

    function createImporterDocumentRecord({
        source = 'realtime',
        docType,
        rawData,
        fileName = '',
        fileType = '',
        uploadedAt,
        fallbackName = '',
    }) {
        if (!rawData) return null;

        const { base64, mimeType: extractedMime } = extractImporterBase64Components(rawData, fileType);
        if (!base64) return null;

        const typeInfo = getImporterDocumentTypeInfo(docType, fallbackName);
        const resolvedMime = fileType || extractedMime || (getImporterMimeType(base64) !== 'unknown' ? getImporterMimeType(base64) : 'application/octet-stream');

        const record = {
            id: `${source}-${docType}-${uploadedAt || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: docType,
            name: fileName || fallbackName || typeInfo.name,
            category: typeInfo.category,
            icon: typeInfo.icon,
            data: base64,
            uploadedAt: uploadedAt || new Date().toISOString(),
            size: calculateImporterBase64Size(base64),
            mimeType: resolvedMime,
            source,
            fileName: fileName || fallbackName || typeInfo.name,
        };

        return record;
    }

    function collectImporterRealtimeDocuments(userData = {}) {
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
            const uploadedAt = resolveImporterUploadedAt(
                (typeof rawValue === 'object' && rawValue.uploadedAt) || userData[`${docKey}UpdatedAt`]
            );

            const record = createImporterDocumentRecord({
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

    function collectImporterEKYCDocuments(ekycData = {}) {
        if (!ekycData.documents) return [];

        const documents = [];
        Object.entries(ekycData.documents).forEach(([docType, docValue]) => {
            if (!docValue) return;

            const rawData = docValue.dataUrl || docValue.base64 || docValue.data || '';
            const uploadedAt = resolveImporterUploadedAt(docValue.uploadedAt, ekycData.updatedAt, ekycData.timestamp);

            const record = createImporterDocumentRecord({
                source: 'realtime',
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

    async function loadImporterDocumentsFromFirebase() {
        if (!currentUser || !importerDatabase) {
            console.log('User not authenticated or database not available');
            return;
        }

        const loadingEl = document.getElementById('importerDocumentsLoading');
        const emptyEl = document.getElementById('importerDocumentsEmpty');
        const gridEl = document.getElementById('importerDocumentsGrid');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (gridEl) gridEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        try {
            const snapshot = await importerDatabase.ref(`${currentUserBasePath}`).once('value');
            const userData = snapshot.val() || {};

            const documents = [];
            
            if (userData.documents) {
                documents.push(...collectImporterRealtimeDocuments(userData));
            }

            if (userData.profilePhoto) {
                const profilePhotoData = typeof userData.profilePhoto === 'object' ? userData.profilePhoto.data : userData.profilePhoto;
                if (profilePhotoData) {
                    const record = createImporterDocumentRecord({
                        source: 'realtime',
                        docType: 'profilePhoto',
                        rawData: profilePhotoData,
                        fileName: (typeof userData.profilePhoto === 'object' && userData.profilePhoto.fileName) || 'Profile Photo',
                        fileType: (typeof userData.profilePhoto === 'object' && userData.profilePhoto.fileType) || '',
                        uploadedAt: resolveImporterUploadedAt(
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

            if (userData.ekyc && userData.ekyc.documents) {
                documents.push(...collectImporterEKYCDocuments(userData.ekyc));
            }

            importerDocumentsCache = documents;
            
            if (documents.length === 0) {
                showImporterEmptyDocuments();
            } else {
                renderImporterDocuments(documents);
                updateImporterDocumentsStats(documents);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            importerDocumentsCache = [];
            showImporterEmptyDocuments();
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    function showImporterEmptyDocuments() {
        const emptyEl = document.getElementById('importerDocumentsEmpty');
        const gridEl = document.getElementById('importerDocumentsGrid');
        const statsEl = document.getElementById('importerDocumentsStats');
        
        if (emptyEl) emptyEl.style.display = 'flex';
        if (gridEl) gridEl.style.display = 'none';
        if (statsEl) statsEl.style.display = 'none';
    }

    function renderImporterDocuments(documents) {
        const gridEl = document.getElementById('importerDocumentsGrid');
        const emptyEl = document.getElementById('importerDocumentsEmpty');
        
        if (!gridEl) return;
        
        if (documents.length === 0) {
            showImporterEmptyDocuments();
            return;
        }

        gridEl.style.display = 'grid';
        if (emptyEl) emptyEl.style.display = 'none';

        gridEl.innerHTML = documents.map((doc) => {
            const uploadDate = new Date(doc.uploadedAt);
            const formattedDate = uploadDate.toLocaleDateString();
            const previewHTML = isImporterImageMimeType(doc.mimeType) && doc.data
                ? `<img src="data:${doc.mimeType};base64,${doc.data}" alt="${doc.name}">`
                : `<div class="file-icon">${doc.icon}</div>`;

            return `
                <div class="document-card" onclick="openImporterDocumentDetail('${doc.id}')">
                    <div class="document-card-preview">
                        ${previewHTML}
                        <div class="document-card-overlay">
                            <button onclick="event.stopPropagation(); openImporterDocumentDetail('${doc.id}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                View
                            </button>
                            <button onclick="event.stopPropagation(); downloadImporterDocumentDirect('${doc.id}')">
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

    function isImporterImageMimeType(mimeType) {
        return mimeType && mimeType.startsWith('image/');
    }

    function updateImporterDocumentsStats(documents) {
        const statsEl = document.getElementById('importerDocumentsStats');
        if (!statsEl) return;

        const totalDocs = documents.length;
        const totalSize = documents.reduce((sum, doc) => sum + parseFloat(doc.size), 0).toFixed(2);
        const uniqueTypes = new Set(documents.map(doc => doc.category)).size;

        const totalDocsEl = document.getElementById('importerTotalDocuments');
        const totalSizeEl = document.getElementById('importerTotalSize');
        const typeCountEl = document.getElementById('importerTypeCount');

        if (totalDocsEl) totalDocsEl.textContent = totalDocs;
        if (totalSizeEl) totalSizeEl.textContent = `${(totalSize / 1024).toFixed(2)} MB`;
        if (typeCountEl) typeCountEl.textContent = uniqueTypes;

        if (totalDocs > 0) {
            statsEl.style.display = 'grid';
        }
    }

    function debounceImporter(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function handleImporterDocumentSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const filtered = importerDocumentsCache.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm) ||
            doc.category.toLowerCase().includes(searchTerm)
        );
        renderImporterDocuments(filtered);
    }

    function handleImporterDocumentFilter(event) {
        const filterValue = event.target.value;
        
        if (!filterValue) {
            renderImporterDocuments(importerDocumentsCache);
        } else {
            const filtered = importerDocumentsCache.filter(doc => doc.category === filterValue);
            renderImporterDocuments(filtered);
        }
    }

    function openImporterDocumentDetail(docId) {
        const doc = importerDocumentsCache.find(d => d.id === docId);
        if (!doc) return;
        importerCurrentDocument = doc;
        alert(`Document: ${doc.name}\nType: ${doc.category}\nSize: ${doc.size} KB\n\nFull preview functionality can be added here.`);
    }

    function downloadImporterDocumentDirect(docId) {
        const doc = importerDocumentsCache.find(d => d.id === docId);
        if (!doc || !doc.data) return;

        const mimeType = doc.mimeType || 'application/octet-stream';
        const extension = mimeType.includes('pdf') ? 'pdf' : (mimeType.includes('png') ? 'png' : 'jpg');
        const blob = base64ToBlob(doc.data, mimeType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.fileName || doc.name}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    function initializeImporterDocumentRequirementsSection() {
        if (importerDocumentRequirementsInitialized) return;

        const countrySelect = document.getElementById('importerDocCountrySelect');
        const modeSelect = document.getElementById('importerDocModeSelect');

        if (!countrySelect || !modeSelect) {
            return;
        }

        populateImporterDocumentCountryOptions(countrySelect);
        populateImporterDocumentModeOptions(modeSelect);

        countrySelect.addEventListener('change', () => {
            updateImporterDocumentRequirementsDisplay();
            resetImporterDocumentChecklistResult();
        });

        modeSelect.addEventListener('change', () => {
            updateImporterDocumentRequirementsDisplay();
            resetImporterDocumentChecklistResult();
        });

        updateImporterDocumentRequirementsDisplay();
        importerDocumentRequirementsInitialized = true;
    }

    function populateImporterDocumentCountryOptions(selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = importerCountryDocumentMatrix
            .map(country => `<option value="${country.id}">${country.name}</option>`)
            .join('');
    }

    function populateImporterDocumentModeOptions(selectEl) {
        if (!selectEl) return;
        const options = ['all', ...IMPORTER_DOCUMENT_MODES].map(mode => `<option value="${mode}">${formatImporterModeLabel(mode)}</option>`);
        selectEl.innerHTML = options.join('');
    }

    function formatImporterModeLabel(mode) {
        if (!mode || mode === 'all') return 'All Modes';
        const labels = {
            sea: 'Sea Freight',
            air: 'Air Freight',
            imports: 'Imports',
            exports: 'Exports',
        };
        return labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    function updateImporterDocumentRequirementsDisplay(presetCountryId, presetMode) {
        const countrySelect = document.getElementById('importerDocCountrySelect');
        const modeSelect = document.getElementById('importerDocModeSelect');
        const targetCountryId = presetCountryId || countrySelect?.value || importerCountryDocumentMatrix[0]?.id;
        const targetMode = presetMode || modeSelect?.value || 'all';

        if (countrySelect && targetCountryId) {
            countrySelect.value = targetCountryId;
        }
        if (modeSelect && targetMode) {
            modeSelect.value = targetMode;
        }

        const countryData = getImporterCountryDataById(targetCountryId);
        renderImporterDocumentRequirementsTable(countryData, targetMode);
    }

    function getImporterCountryDataById(countryId) {
        return importerCountryDocumentMatrix.find(country => country.id === countryId);
    }

    function renderImporterDocumentRequirementsTable(countryData, mode) {
        const container = document.getElementById('importerDocRequirementsTable');
        if (!container) return;

        if (!countryData) {
            container.innerHTML = `<div class="doc-empty-state">We couldn't find requirements for the selected country yet. Please choose another option.</div>`;
            return;
        }

        if (mode && mode !== 'all' && !countryData.modes.includes(mode)) {
            container.innerHTML = `<div class="doc-empty-state">We haven't mapped ${formatImporterModeLabel(mode)} requirements for ${countryData.name} yet. Try another mode.</div>`;
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
                    <span class="doc-table-badge">${formatImporterModeLabel(mode)}</span>
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

    function resetImporterDocumentChecklistResult() {
        const checklistEl = document.getElementById('importerDocChecklistResult');
        if (checklistEl) {
            checklistEl.classList.remove('active');
            checklistEl.textContent = '';
        }
    }

    function generateImporterDocumentChecklist() {
        const countrySelect = document.getElementById('importerDocCountrySelect');
        const modeSelect = document.getElementById('importerDocModeSelect');
        const checklistEl = document.getElementById('importerDocChecklistResult');

        if (!countrySelect || !modeSelect || !checklistEl) return;

        const countryData = getImporterCountryDataById(countrySelect.value);
        const selectedMode = modeSelect.value;

        if (!countryData) {
            checklistEl.innerHTML = 'Select a country to see the quick checklist.';
            checklistEl.classList.add('active');
            return;
        }

        if (selectedMode !== 'all' && !countryData.modes.includes(selectedMode)) {
            checklistEl.innerHTML = `We have not mapped ${formatImporterModeLabel(selectedMode)} workflows for ${countryData.name}. Try another mode.`;
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
            <h4>Checklist for ${countryData.name} (${formatImporterModeLabel(selectedMode)})</h4>
            <ul>${listHtml}</ul>
            <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-text-tertiary);">
                Source: Official customs, trade and partner agency portals linked above.
            </p>
        `;
        checklistEl.classList.add('active');
    }

    function initializeImporterDocumentsModule() {
        const documentSearch = document.getElementById('importerDocumentSearch');
        const documentFilter = document.getElementById('importerDocumentFilter');
        
        if (documentSearch) {
            documentSearch.addEventListener('input', debounceImporter(handleImporterDocumentSearch, 300));
        }
        
        if (documentFilter) {
            documentFilter.addEventListener('change', handleImporterDocumentFilter);
        }

        initializeImporterDocumentRequirementsSection();
    }

    // Make functions globally available
    window.openImporterProfileModal = openImporterProfileModal;
    window.closeImporterProfileModal = closeImporterProfileModal;
    window.switchImporterProfileTab = switchImporterProfileTab;
    window.saveImporterBasicInfo = saveImporterBasicInfo;
    window.saveImporterBusinessInfo = saveImporterBusinessInfo;
    window.saveImporterComplianceInfo = saveImporterComplianceInfo;
    window.saveImporterImportInfo = saveImporterImportInfo;
    window.saveImporterAddressInfo = saveImporterAddressInfo;
    window.saveImporterBankingInfo = saveImporterBankingInfo;
    window.saveImporterDocumentsInfo = saveImporterDocumentsInfo;
    window.saveImporterSettingsInfo = saveImporterSettingsInfo;
    window.handleImporterPhotoUpload = handleImporterPhotoUpload;
    window.handleImporterDocumentUpload = handleImporterDocumentUpload;
    window.handleImporterLogout = handleImporterLogout;
    window.openImporterDocumentDetail = openImporterDocumentDetail;
    window.downloadImporterDocumentDirect = downloadImporterDocumentDirect;
    window.generateImporterDocumentChecklist = generateImporterDocumentChecklist;

    document.addEventListener('DOMContentLoaded', () => {
        initFirebase();
        const initialTab = normalizeTab(window.location.hash.replace('#', ''));
        activateSection(initialTab, { syncHash: false, force: true });
        attachEvents();
        initAuthListener();
        
        // Load cart badge on init
        if (currentUser) {
            setTimeout(() => {
                if (typeof loadImporterCart === 'function') {
                    loadImporterCart();
                }
            }, 500);
        }
    });
})();

// ============================================
// CART MANAGEMENT
// ============================================

/**
 * Load cart from Firebase
 */
async function loadImporterCart() {
    const user = importerAuth?.currentUser;
    if (!user || !importerDatabase) {
        showEmptyImporterCart();
        return;
    }

    try {
        const snapshot = await importerDatabase.ref(`users/${user.uid}/cart`).once('value');
        const cartData = snapshot.val();
        
        let cart = [];
        if (cartData) {
            if (Array.isArray(cartData)) {
                cart = cartData;
            } else {
                cart = Object.values(cartData);
            }
        }

        renderImporterCart(cart);
        updateImporterCartBadge(cart);
    } catch (error) {
        console.error('Error loading cart:', error);
        showEmptyImporterCart();
    }
}

/**
 * Render cart items
 */
function renderImporterCart(cart) {
    const cartContent = document.getElementById('importerCartContent');
    const cartFooter = document.getElementById('importerCartFooter');
    const cartTotal = document.getElementById('importerCartTotal');
    const cartBadge = document.getElementById('importerCartBadge');

    if (!cartContent) return;

    if (cart.length === 0) {
        showEmptyImporterCart();
        if (cartFooter) cartFooter.style.display = 'none';
        if (cartBadge) cartBadge.style.display = 'none';
        return;
    }

    cartContent.innerHTML = cart.map(item => createImporterCartItemHTML(item)).join('');
    
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
function createImporterCartItemHTML(item) {
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
                        <button onclick="updateImporterCartQuantity('${item.id}', -1)" style="background: none; border: none; cursor: pointer; color: #667eea; font-weight: 600; padding: 0.25rem 0.5rem;">-</button>
                        <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                        <button onclick="updateImporterCartQuantity('${item.id}', 1)" style="background: none; border: none; cursor: pointer; color: #667eea; font-weight: 600; padding: 0.25rem 0.5rem;">+</button>
                    </div>
                    <button onclick="removeImporterCartItem('${item.id}')" style="background: #ff4757; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
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
function showEmptyImporterCart() {
    const cartContent = document.getElementById('importerCartContent');
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
async function updateImporterCartQuantity(productId, change) {
    const user = importerAuth?.currentUser;
    if (!user || !importerDatabase) return;

    try {
        const snapshot = await importerDatabase.ref(`users/${user.uid}/cart`).once('value');
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

        await importerDatabase.ref(`users/${user.uid}/cart`).set(cart);
        renderImporterCart(cart);
        updateImporterCartBadge(cart);
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

/**
 * Remove cart item
 */
async function removeImporterCartItem(productId) {
    const user = importerAuth?.currentUser;
    if (!user || !importerDatabase) return;

    try {
        const snapshot = await importerDatabase.ref(`users/${user.uid}/cart`).once('value');
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
        await importerDatabase.ref(`users/${user.uid}/cart`).set(cart);
        renderImporterCart(cart);
        updateImporterCartBadge(cart);
    } catch (error) {
        console.error('Error removing cart item:', error);
    }
}

/**
 * Update cart badge
 */
function updateImporterCartBadge(cart) {
    const cartBadge = document.getElementById('importerCartBadge');
    if (!cartBadge) return;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

/**
 * Proceed to checkout
 */
function proceedImporterCheckout() {
    // For now, just show a message
    alert('Checkout functionality will be implemented soon. Your cart items are saved and will be available for order processing.');
}

// Make functions globally available
window.updateImporterCartQuantity = updateImporterCartQuantity;
window.removeImporterCartItem = removeImporterCartItem;
window.proceedImporterCheckout = proceedImporterCheckout;

// Listen for cart updates from marketplace
window.addEventListener('storage', (e) => {
    if (e.key === 'cartUpdated') {
        loadImporterCart();
    }
});

// Also check cart on page visibility change (when user returns from marketplace)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const currentTab = window.location.hash.substring(1);
        if (currentTab === 'cart') {
            loadImporterCart();
        }
    }
});

