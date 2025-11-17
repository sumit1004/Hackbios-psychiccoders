/**
 * Admin Panel - eKYC Verification Script
 * Handles video call requests, WebRTC connections, and eKYC approval
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
let firebaseApp, auth, database, firestore;
let importerApp, importerDatabase;
try {
    try {
        firebaseApp = firebase.app();
    } catch (e) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth();
    database = firebase.database();
    firestore = firebase.firestore();
    
    // Initialize importer Firebase app
    try {
        importerApp = firebase.initializeApp(importerFirebaseConfig, 'importerApp');
        importerDatabase = importerApp.database();
        console.log('Importer Firebase initialized successfully');
    } catch (e) {
        console.warn('Failed to initialize importer Firebase:', e);
    }
    
    console.log('Firebase initialized successfully for Admin Panel');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

const ADMIN_DEFAULT = {
    name: 'Admin',
    id: 'manual-admin',
    email: 'admin@local'
};

let videoCallRequestsListener = null;
let importerVideoCallRequestsListener = null;
let activeRequestId = null;
let activeUserId = null;
let activeRequestType = null; // 'exporter' or 'importer'
let adminLocalStream = null;
let adminPeerConnection = null;
let ekycData = null;
let isAdminAuthenticated = false;

// Initialize admin panel without requiring authentication
function initializeAdminAuthless() {
    const adminIdentity = {
        displayName: ADMIN_DEFAULT.name,
        email: ADMIN_DEFAULT.email
    };
    loadAdminData(adminIdentity);
    initializeAdminPanel();
    isAdminAuthenticated = true;
}

// Try to authenticate admin
function authenticateAdmin() {
    // First, try anonymous sign-in if enabled
    if (auth?.signInAnonymously) {
        auth.signInAnonymously()
            .then((credential) => {
                const user = credential?.user;
                const adminIdentity = {
                    displayName: ADMIN_DEFAULT.name,
                    email: user?.email || ADMIN_DEFAULT.email
                };
                loadAdminData(adminIdentity);
                initializeAdminPanel();
                isAdminAuthenticated = true;
                console.log('Admin authenticated successfully via anonymous sign-in');
            })
            .catch((error) => {
                console.warn('Anonymous sign-in failed:', error.code, error.message);
                console.log('Falling back to local admin authentication...');
                // If anonymous sign-in fails, use local authentication
                initializeAdminAuthless();
            });
    } else {
        // Anonymous auth not available, use local auth
        initializeAdminAuthless();
    }
}

// Check auth state on load
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            isAdminAuthenticated = true;
            initializeAdminPanel();
        } else {
            // Not authenticated, try to authenticate
            authenticateAdmin();
        }
    });
} else {
    // Firebase not initialized, use local auth
    console.warn('Firebase Auth not available, using local admin authentication');
    initializeAdminAuthless();
}

function loadAdminData(user) {
    const adminName = document.getElementById('adminName');
    if (adminName) {
        adminName.textContent = user.displayName || user.email || 'Admin';
    }
    
    // Update auth status banner
    updateAuthStatus(true, 'Connected to admin services');
}

const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

/**
 * Update auth status banner
 */
function updateAuthStatus(isConnected, message) {
    const statusBanner = document.getElementById('authStatus');
    const statusText = document.getElementById('authStatusText');
    
    if (!statusBanner) return;
    
    if (isConnected) {
        statusBanner.className = 'auth-status-banner success';
        statusText.textContent = message;
        setTimeout(() => {
            statusBanner.style.display = 'none';
        }, 3000);
    } else {
        statusBanner.className = 'auth-status-banner error';
        statusText.textContent = message;
        statusBanner.style.display = 'block';
    }
}

function initializeAdminPanel() {
    // Ensure authentication for both Firebase instances
    if (auth && !auth.currentUser) {
        auth.signInAnonymously().catch(err => {
            console.warn('Exporter Firebase anonymous auth failed:', err);
        });
    }
    
    if (importerApp) {
        const importerAuth = importerApp.auth();
        if (importerAuth && !importerAuth.currentUser) {
            importerAuth.signInAnonymously().catch(err => {
                console.warn('Importer Firebase anonymous auth failed:', err);
            });
        }
    }
    
    listenForVideoCallRequests();
    initializeAdminSupportCenter();
}

/**
 * Listen for pending video call requests (both exporter and importer)
 */
function listenForVideoCallRequests() {
    const requestsList = document.getElementById('videoCallRequestsList');
    if (!requestsList) return;
    
    let allRequests = [];
    
    // Listen to exporter requests (Firestore)
    if (firestore) {
        // Try to authenticate first for better permissions
        if (auth && !auth.currentUser) {
            auth.signInAnonymously().catch(err => {
                console.warn('Anonymous auth failed, continuing without auth:', err);
            });
        }
        
        videoCallRequestsListener = firestore.collection('videoCallRequests')
            .where('status', '==', 'pending')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                allRequests = allRequests.filter(req => req.type !== 'exporter');
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    allRequests.push({
                        id: doc.id,
                        type: 'exporter',
                        data: data
                    });
                });
                
                renderAllRequests(allRequests);
            }, (error) => {
                console.error('Error listening for exporter video call requests:', error);
                if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
                    console.warn('Permission denied for Firestore. Please configure Firestore security rules to allow admin access to videoCallRequests collection.');
                    // Show message in UI
                    const requestsList = document.getElementById('videoCallRequestsList');
                    if (requestsList && !requestsList.querySelector('.permission-error')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'permission-error';
                        errorDiv.style.cssText = 'padding: 16px; background: #fee2e2; color: #991b1b; border-radius: 8px; margin: 8px 0;';
                        errorDiv.innerHTML = '<strong>Permission Error:</strong> Admin needs Firestore read access to videoCallRequests collection. Please configure Firestore security rules.';
                        requestsList.appendChild(errorDiv);
                    }
                }
            });
    }
    
    // Listen to importer requests (Realtime Database)
    if (importerDatabase) {
        // Try to authenticate with importer Firebase for better permissions
        const importerAuth = importerApp?.auth();
        if (importerAuth && !importerAuth.currentUser) {
            importerAuth.signInAnonymously().catch(err => {
                console.warn('Importer anonymous auth failed, continuing:', err);
            });
        }
        
        // Listen to all importers' videoCallRequests
        const importerRequestsRef = importerDatabase.ref('importers');
        importerVideoCallRequestsListener = importerRequestsRef.on('value', (snapshot) => {
            allRequests = allRequests.filter(req => req.type !== 'importer');
            
            if (snapshot.exists()) {
                const importers = snapshot.val();
                Object.keys(importers).forEach(userId => {
                    const userData = importers[userId];
                    if (userData.videoCallRequests) {
                        Object.keys(userData.videoCallRequests).forEach(requestId => {
                            const requestData = userData.videoCallRequests[requestId];
                            if (requestData.status === 'pending') {
                                allRequests.push({
                                    id: requestId,
                                    userId: userId,
                                    type: 'importer',
                                    data: requestData
                                });
                            }
                        });
                    }
                });
            }
            
            renderAllRequests(allRequests);
        }, (error) => {
            console.error('Error listening for importer video call requests:', error);
            if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                console.warn('Permission denied for importer database. Please configure Realtime Database security rules to allow admin access.');
                // Show message in UI
                const requestsList = document.getElementById('videoCallRequestsList');
                if (requestsList && !requestsList.querySelector('.permission-error-importer')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'permission-error-importer';
                    errorDiv.style.cssText = 'padding: 16px; background: #fee2e2; color: #991b1b; border-radius: 8px; margin: 8px 0;';
                    errorDiv.innerHTML = '<strong>Permission Error:</strong> Admin needs Realtime Database read access to /importers path. Please update security rules in firebase-security-rules.json and apply them in Firebase Console.';
                    requestsList.appendChild(errorDiv);
                }
            }
        });
    }
}

/**
 * Render all video call requests (both exporter and importer)
 */
function renderAllRequests(allRequests) {
    const requestsList = document.getElementById('videoCallRequestsList');
    if (!requestsList) return;
    
    requestsList.innerHTML = '';
    
    if (allRequests.length === 0) {
        requestsList.innerHTML = '<div class="empty-state">No pending video call requests</div>';
        return;
    }
    
    // Sort by timestamp (newest first)
    allRequests.sort((a, b) => {
        const timeA = a.data.timestamp || a.data.createdAt || 0;
        const timeB = b.data.timestamp || b.data.createdAt || 0;
        return timeB - timeA;
    });
    
    allRequests.forEach(request => {
        const requestItem = createRequestItem(request.id, request.data, request.type, request.userId);
        requestsList.appendChild(requestItem);
    });
}

// ============================================
// SUPPORT CENTER MODULE
// ============================================

let adminSupportStatusUnsub = null;
let adminSupportThreadsRef = null;
let adminSupportMessagesRef = null;
let adminCurrentSupportUserId = null;

function initializeAdminSupportCenter() {
    setupSupportStatusToggle();
    setupAdminSupportForm();
    listenForSupportThreads();
}

function setupSupportStatusToggle() {
    if (!database) return;
    const toggle = document.getElementById('adminSupportToggle');
    const label = document.getElementById('adminSupportStatusLabel');
    if (!toggle || !label) return;

    // Try to authenticate first
    if (auth && !auth.currentUser) {
        auth.signInAnonymously().catch(err => {
            console.warn('Anonymous auth for support status failed:', err);
        });
    }

    const statusRef = database.ref('supportStatus/admin');

    toggle.addEventListener('change', async () => {
        const status = toggle.checked ? 'online' : 'offline';
        try {
            await statusRef.update({
                status,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            label.textContent = status === 'online' ? 'Online' : 'Offline';
            setAdminSupportFormState(toggle.checked && Boolean(adminCurrentSupportUserId));
        } catch (error) {
            console.error('Unable to update support status:', error);
            if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
                alert('Permission denied. Please configure Realtime Database security rules to allow admin access to /supportStatus/admin');
            }
            toggle.checked = !toggle.checked; // revert
        }
    });

    if (adminSupportStatusUnsub) {
        adminSupportStatusUnsub();
    }

    const handleStatusSnapshot = (snapshot) => {
        const data = snapshot.val() || {};
            const isOnline = data.status === 'online';
            toggle.checked = isOnline;
            label.textContent = isOnline ? 'Online' : 'Offline';
            setAdminSupportFormState(isOnline && Boolean(adminCurrentSupportUserId));
    };

    statusRef.on('value', handleStatusSnapshot, (error) => {
        console.error('Support status listener error:', error);
        if (error.code === 'PERMISSION_DENIED' || error.code === 'permission_denied') {
            console.warn('Permission denied for support status. Please configure Realtime Database security rules.');
            label.textContent = 'Permission Error';
        }
    });

    adminSupportStatusUnsub = () => statusRef.off('value', handleStatusSnapshot);
}

function listenForSupportThreads() {
    if (!database) return;
    const listEl = document.getElementById('adminSupportThreadList');
    if (!listEl) return;

    if (adminSupportThreadsRef) adminSupportThreadsRef.off();

    adminSupportThreadsRef = database.ref('supportChat');
    adminSupportThreadsRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            listEl.innerHTML = '<div class="empty-state">No support conversations yet</div>';
            return;
        }

        const threads = [];
        snapshot.forEach((child) => {
            const userId = child.key;
            const messages = child.child('messages').val();
            if (!messages) return;
            const entries = Object.values(messages).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const last = entries[entries.length - 1];
            threads.push({
                userId,
                lastMessage: last?.text || '',
                timestamp: last?.timestamp || Date.now()
            });
        });

        if (!threads.length) {
            listEl.innerHTML = '<div class="empty-state">No support conversations yet</div>';
            return;
        }

        threads.sort((a, b) => b.timestamp - a.timestamp);
        listEl.innerHTML = threads.map(thread => `
            <div class="admin-support-thread ${thread.userId === adminCurrentSupportUserId ? 'active' : ''}" data-user-id="${thread.userId}">
                <h4>User: ${thread.userId.slice(0, 6)}...</h4>
                <p>${thread.lastMessage}</p>
            </div>
        `).join('');

        listEl.querySelectorAll('.admin-support-thread').forEach((item) => {
            item.addEventListener('click', () => {
                selectSupportThread(item.getAttribute('data-user-id'));
            });
        });
    });
}

function selectSupportThread(userId) {
    if (!userId) return;
    adminCurrentSupportUserId = userId;
    const titleEl = document.getElementById('adminSupportChatUser');
    const infoEl = document.getElementById('adminSupportChatInfo');
    if (titleEl) titleEl.textContent = `Conversation with ${userId}`;
    if (infoEl) infoEl.textContent = 'Replies sync instantly with the exporter.';

    document.querySelectorAll('.admin-support-thread').forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-user-id') === userId);
    });

    loadSupportConversation(userId);
    const toggle = document.getElementById('adminSupportToggle');
    setAdminSupportFormState(Boolean(toggle?.checked));
}

function loadSupportConversation(userId) {
    if (!database || !userId) return;
    const messagesEl = document.getElementById('adminSupportMessages');
    if (!messagesEl) return;
    messagesEl.innerHTML = '';

    if (adminSupportMessagesRef) adminSupportMessagesRef.off();

    adminSupportMessagesRef = database.ref(`supportChat/${userId}/messages`).limitToLast(200);
    adminSupportMessagesRef.on('child_added', (snapshot) => {
        appendAdminSupportMessage(snapshot.val());
    });
}

function appendAdminSupportMessage(message = {}) {
    const messagesEl = document.getElementById('adminSupportMessages');
    if (!messagesEl) return;

    const wrapper = document.createElement('div');
    wrapper.className = `admin-support-message ${message.sender || 'user'}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = message.text || '';
    wrapper.appendChild(bubble);

    if (message.timestamp) {
        const small = document.createElement('small');
        small.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        wrapper.appendChild(small);
    }

    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setupAdminSupportForm() {
    const form = document.getElementById('adminSupportForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await sendAdminSupportMessage();
    });
}

async function sendAdminSupportMessage() {
    const userId = adminCurrentSupportUserId;
    if (!userId || !database) return;
    const input = document.getElementById('adminSupportInput');
    const button = document.querySelector('#adminSupportForm button');
    if (!input || !button) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    button.disabled = true;

    try {
        const messageRef = database.ref(`supportChat/${userId}/messages`).push();
        await messageRef.set({
            sender: 'admin',
            text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Error sending support message:', error);
        alert('Unable to send message. Please try again.');
    } finally {
        button.disabled = false;
    }
}

function setAdminSupportFormState(enabled) {
    const input = document.getElementById('adminSupportInput');
    const button = document.querySelector('#adminSupportForm button');
    if (!input || !button) return;
    input.disabled = !enabled;
    button.disabled = !enabled;
}

/**
 * Create request item element
 */
function createRequestItem(requestId, data, requestType = 'exporter', userId = null) {
    const item = document.createElement('div');
    item.className = 'request-item';
    
    const timestamp = data.createdAt || data.timestamp;
    const timeAgo = getTimeAgo(timestamp);
    const userType = requestType === 'importer' ? 'Importer' : 'Exporter';
    const actualUserId = userId || data.userId;
    
    item.innerHTML = `
        <div class="request-info">
            <h3>${data.userName || 'User'} <span style="font-size: 12px; color: var(--color-primary); font-weight: normal;">(${userType})</span></h3>
            <p>${data.userEmail || ''}</p>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">Requested ${timeAgo}</p>
        </div>
        <div class="request-actions">
            <button class="btn-accept" onclick="acceptVideoCall('${requestId}', '${actualUserId}', '${requestType}')">Accept</button>
            <button class="btn-reject-request" onclick="rejectVideoCallRequest('${requestId}', '${requestType}', '${actualUserId}')">Reject</button>
        </div>
    `;
    
    return item;
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
    if (!timestamp) return 'just now';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

/**
 * Accept video call request
 */
async function acceptVideoCall(requestId, userId, requestType = 'exporter') {
    activeRequestId = requestId;
    activeUserId = userId;
    activeRequestType = requestType;
    
    try {
        if (requestType === 'importer') {
            if (!importerDatabase) {
                alert('Importer database not available');
                return;
            }
            await importerDatabase.ref(`importers/${userId}/videoCallRequests/${requestId}`).update({
                status: 'accepted',
                agentId: ADMIN_DEFAULT.id,
                agentEmail: ADMIN_DEFAULT.email,
                acceptedAt: new Date().toISOString()
            });
        } else {
            if (!firestore) {
                alert('Firestore not available');
                return;
            }
            await firestore.collection('videoCallRequests').doc(requestId).update({
                status: 'accepted',
                agentId: ADMIN_DEFAULT.id,
                agentEmail: ADMIN_DEFAULT.email,
                acceptedAt: new Date().toISOString()
            });
        }
        
        await loadEKYCData(userId, requestType);
        
        document.getElementById('activeCallSection').style.display = 'block';
        
        await startAdminVideoCall(requestId, requestType);
        listenForUserOffer(requestId, requestType);
        
    } catch (error) {
        console.error('Error accepting video call:', error);
        alert('Failed to accept video call. Please try again.');
    }
}

/**
 * Reject video call request
 */
async function rejectVideoCallRequest(requestId, requestType = 'exporter', userId = null) {
    if (!confirm('Are you sure you want to reject this video call request?')) {
        return;
    }
    
    try {
        if (requestType === 'importer') {
            if (!importerDatabase || !userId) {
                alert('Importer database not available');
                return;
            }
            await importerDatabase.ref(`importers/${userId}/videoCallRequests/${requestId}`).update({
                status: 'rejected',
                rejectedAt: new Date().toISOString()
            });
        } else {
            if (!firestore) {
                alert('Firestore not available');
                return;
            }
            await firestore.collection('videoCallRequests').doc(requestId).update({
                status: 'rejected',
                rejectedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error rejecting video call request:', error);
        alert('Failed to reject request. Please try again.');
    }
}

/**
 * Load eKYC data for user
 */
async function loadEKYCData(userId, requestType = 'exporter') {
    try {
        if (requestType === 'importer') {
            if (!importerDatabase) return;
            const ekycRef = importerDatabase.ref(`importers/${userId}/ekyc`);
            const snapshot = await ekycRef.once('value');
            if (snapshot.exists()) {
                ekycData = snapshot.val();
                
                const callUserName = document.getElementById('callUserName');
                const callUserEmail = document.getElementById('callUserEmail');
                
                if (callUserName) {
                    callUserName.textContent = ekycData.userName || 'User';
                }
                if (callUserEmail) {
                    callUserEmail.textContent = ekycData.userEmail || '';
                }
                
                loadDocuments();
            }
        } else {
            if (!firestore) return;
            const ekycDoc = await firestore.collection('ekyc').doc(userId).get();
            if (ekycDoc.exists) {
                ekycData = ekycDoc.data();
                
                const callUserName = document.getElementById('callUserName');
                const callUserEmail = document.getElementById('callUserEmail');
                
                if (callUserName) {
                    callUserName.textContent = ekycData.userName || 'User';
                }
                if (callUserEmail) {
                    callUserEmail.textContent = ekycData.userEmail || '';
                }
                
                loadDocuments();
            }
        }
    } catch (error) {
        console.error('Error loading eKYC data:', error);
    }
}

/**
 * Load documents for review
 */
function loadDocuments() {
    if (!ekycData) return;
    
    const documentsGrid = document.getElementById('documentsGrid');
    if (!documentsGrid) return;
    
    documentsGrid.innerHTML = '';
    
    const documentsData = ekycData.documents || {};
    const documentMap = [
        { key: 'identityProof', label: 'Identity Proof' },
        { key: 'businessProof', label: 'Business Proof' },
        { key: 'bankProof', label: 'Bank Proof' },
        { key: 'selfie', label: 'Selfie' }
    ];
    
    documentMap.forEach(({ key, label }) => {
        const doc = documentsData[key];
        if (!doc || !doc.dataUrl) return;
        
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        
        const isImage = doc.fileType?.startsWith('image/');
        const safeFileName = doc.fileName || `${key}.file`;
        
        docItem.innerHTML = `
            <h4>${label}</h4>
            ${isImage ?
                `<img src="${doc.dataUrl}" alt="${label}" class="document-preview" />` :
                `<div style="padding: 20px; text-align: center; background: var(--color-bg-tertiary); border-radius: 8px; margin-bottom: 8px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <div style="margin-top: 8px; font-size: 12px; color: var(--color-text-secondary);">${safeFileName}</div>
                </div>`
            }
            <a href="${doc.dataUrl}" download="${safeFileName}" class="document-link">Download</a>
        `;
        
        documentsGrid.appendChild(docItem);
    });
}

/**
 * Start admin video call
 */
async function startAdminVideoCall(requestId, requestType = 'exporter') {
    try {
        adminLocalStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const adminLocalVideo = document.getElementById('adminLocalVideo');
        if (adminLocalVideo) {
            adminLocalVideo.srcObject = adminLocalStream;
        }
        
        adminPeerConnection = new RTCPeerConnection(rtcConfiguration);
        
        adminLocalStream.getTracks().forEach(track => {
            adminPeerConnection.addTrack(track, adminLocalStream);
        });
        
        adminPeerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            const adminRemoteVideo = document.getElementById('adminRemoteVideo');
            if (adminRemoteVideo) {
                adminRemoteVideo.srcObject = remoteStream;
            }
        };
        
        adminPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Convert RTCIceCandidate to plain JSON
                const candidateData = {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    usernameFragment: event.candidate.usernameFragment
                };
                
                if (requestType === 'importer') {
                    if (importerDatabase && activeUserId) {
                        importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${requestId}`).update({
                            agentIceCandidate: candidateData,
                            updatedAt: new Date().toISOString()
                        });
                    }
                } else {
                    if (firestore) {
                        firestore.collection('videoCallRequests').doc(requestId).update({
                            agentIceCandidate: candidateData,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            }
        };
        
    } catch (error) {
        console.error('Error starting admin video call:', error);
        alert('Failed to start video call. Please check camera and microphone permissions.');
    }
}

/**
 * Listen for offer from user
 */
let adminOfferProcessed = false;  // Flag to prevent duplicate offer processing
let userOfferListener = null;
function listenForUserOffer(requestId, requestType = 'exporter') {
    // Clean up previous listener
    if (userOfferListener) {
        if (requestType === 'importer' && importerDatabase && activeUserId) {
            importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${requestId}`).off('value', userOfferListener);
        } else if (firestore) {
            // Firestore listeners are automatically cleaned up when replaced
        }
    }
    
    adminOfferProcessed = false; // Reset flag for new call
    
    if (requestType === 'importer') {
        if (!importerDatabase || !activeUserId) return;
        
        const requestRef = importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${requestId}`);
        userOfferListener = requestRef.on('value', async (snapshot) => {
            if (!snapshot.exists()) return;
            
            const data = snapshot.val();
            
            // Process offer only once and only when in stable state
            if (data.offer && !adminOfferProcessed && adminPeerConnection && adminPeerConnection.signalingState === 'stable') {
                try {
                    console.log('Processing offer from importer, current state:', adminPeerConnection.signalingState);
                    adminOfferProcessed = true;
                    
                    await adminPeerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                    console.log('Remote description set, state:', adminPeerConnection.signalingState);
                    
                    const answer = await adminPeerConnection.createAnswer();
                    await adminPeerConnection.setLocalDescription(answer);
                    console.log('Answer created and set, state:', adminPeerConnection.signalingState);
                    
                    await requestRef.update({
                        answer: answer,
                        status: 'connected',
                        updatedAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Error processing offer:', error);
                    adminOfferProcessed = false;
                }
            }
            
            if (data.userIceCandidate && adminPeerConnection) {
                try {
                    console.log('Adding ICE candidate from importer');
                    await adminPeerConnection.addIceCandidate(new RTCIceCandidate(data.userIceCandidate));
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            }
        });
    } else {
        if (!firestore) return;
        
        firestore.collection('videoCallRequests').doc(requestId)
            .onSnapshot(async (doc) => {
                if (!doc.exists) return;
                
                const data = doc.data();
                
                // Process offer only once and only when in stable state
                if (data.offer && !adminOfferProcessed && adminPeerConnection && adminPeerConnection.signalingState === 'stable') {
                    try {
                        console.log('Processing offer from exporter, current state:', adminPeerConnection.signalingState);
                        adminOfferProcessed = true;
                        
                        await adminPeerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        console.log('Remote description set, state:', adminPeerConnection.signalingState);
                        
                        const answer = await adminPeerConnection.createAnswer();
                        await adminPeerConnection.setLocalDescription(answer);
                        console.log('Answer created and set, state:', adminPeerConnection.signalingState);
                        
                        await firestore.collection('videoCallRequests').doc(requestId).update({
                            answer: answer,
                            status: 'connected',
                            updatedAt: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error('Error processing offer:', error);
                        adminOfferProcessed = false;
                    }
                }
                
                if (data.userIceCandidate && adminPeerConnection) {
                    try {
                        console.log('Adding ICE candidate from exporter');
                        await adminPeerConnection.addIceCandidate(new RTCIceCandidate(data.userIceCandidate));
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error);
                    }
                }
            });
    }
}

/**
 * Toggle admin mute
 */
function toggleAdminMute() {
    if (adminLocalStream) {
        const audioTracks = adminLocalStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        const muteBtn = document.getElementById('adminMuteBtn');
        if (muteBtn) {
            muteBtn.classList.toggle('muted', !audioTracks[0].enabled);
        }
    }
}

/**
 * Toggle admin video
 */
function toggleAdminVideo() {
    if (adminLocalStream) {
        const videoTracks = adminLocalStream.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        const videoBtn = document.getElementById('adminVideoBtn');
        if (videoBtn) {
            videoBtn.classList.toggle('disabled', !videoTracks[0].enabled);
        }
    }
}

/**
 * End admin call
 */
async function endAdminCall() {
    if (adminLocalStream) {
        adminLocalStream.getTracks().forEach(track => track.stop());
        adminLocalStream = null;
    }
    
    if (adminPeerConnection) {
        adminPeerConnection.close();
        adminPeerConnection = null;
    }
    
    // Reset flags
    adminOfferProcessed = false;
    
    if (activeRequestId && firestore) {
        try {
            await firestore.collection('videoCallRequests').doc(activeRequestId).update({
                status: 'ended',
                endedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }
    
    document.getElementById('activeCallSection').style.display = 'none';
    
    activeRequestId = null;
    activeUserId = null;
    ekycData = null;
}

/**
 * Approve eKYC
 */
async function approveEKYC() {
    if (!activeUserId) return;
    
    if (!confirm('Approve eKYC for this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('Approving eKYC for user:', activeUserId, 'type:', activeRequestType);
        
        if (activeRequestType === 'importer') {
            if (!importerDatabase) {
                alert('Importer database not available');
                return;
            }
            await importerDatabase.ref(`importers/${activeUserId}/ekyc`).update({
                ekycStatus: 'verified',
                verifiedAt: new Date().toISOString(),
                verifiedBy: ADMIN_DEFAULT.id,
                verifiedByEmail: ADMIN_DEFAULT.email
            });
            
            if (activeRequestId) {
                await importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${activeRequestId}`).update({
                    status: 'completed',
                    ekycStatus: 'verified',
                    completedAt: new Date().toISOString()
                });
            }
        } else {
            if (!firestore) {
                alert('Firestore not available');
                return;
            }
            await firestore.collection('ekyc').doc(activeUserId).update({
                ekycStatus: 'verified',
                verifiedAt: new Date().toISOString(),
                verifiedBy: ADMIN_DEFAULT.id,
                verifiedByEmail: ADMIN_DEFAULT.email
            });
            
            if (activeRequestId) {
                await firestore.collection('videoCallRequests').doc(activeRequestId).update({
                    status: 'completed',
                    ekycStatus: 'verified',
                    completedAt: new Date().toISOString()
                });
            }
        }
        
        console.log('✓ eKYC approved successfully');
        alert('eKYC approved successfully!');
        endAdminCall();
        
    } catch (error) {
        console.error('Error approving eKYC:', error);
        alert('Failed to approve eKYC. Please try again.');
    }
}

/**
 * Reject eKYC
 */
async function rejectEKYC() {
    if (!activeUserId) return;
    
    const reason = prompt('Please enter a reason for rejection:');
    if (!reason) return;
    
    if (!confirm('Reject eKYC for this user?')) {
        return;
    }
    
    try {
        if (activeRequestType === 'importer') {
            if (!importerDatabase) {
                alert('Importer database not available');
                return;
            }
            await importerDatabase.ref(`importers/${activeUserId}/ekyc`).update({
                ekycStatus: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectedBy: ADMIN_DEFAULT.id,
                rejectedByEmail: ADMIN_DEFAULT.email,
                rejectionReason: reason
            });
            
            if (activeRequestId) {
                await importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${activeRequestId}`).update({
                    status: 'completed',
                    ekycStatus: 'rejected',
                    rejectionReason: reason,
                    completedAt: new Date().toISOString()
                });
            }
        } else {
            if (!firestore) {
                alert('Firestore not available');
                return;
            }
            await firestore.collection('ekyc').doc(activeUserId).update({
                ekycStatus: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectedBy: ADMIN_DEFAULT.id,
                rejectedByEmail: ADMIN_DEFAULT.email,
                rejectionReason: reason
            });
            
            if (activeRequestId) {
                await firestore.collection('videoCallRequests').doc(activeRequestId).update({
                    status: 'completed',
                    ekycStatus: 'rejected',
                    rejectionReason: reason,
                    completedAt: new Date().toISOString()
                });
            }
        }
        
        alert('eKYC rejected.');
        endAdminCall();
        
    } catch (error) {
        console.error('Error rejecting eKYC:', error);
        alert('Failed to reject eKYC. Please try again.');
    }
}

/**
 * Refresh admin panel (no login required)
 */
function refreshAdminPanel() {
    if (adminLocalStream || adminPeerConnection) {
        endAdminCall();
    }
    if (videoCallRequestsListener) {
        videoCallRequestsListener();
    }
    if (importerVideoCallRequestsListener && importerDatabase) {
        importerDatabase.ref('importers').off('value', importerVideoCallRequestsListener);
    }
    if (userOfferListener && activeRequestType === 'importer' && importerDatabase && activeUserId && activeRequestId) {
        importerDatabase.ref(`importers/${activeUserId}/videoCallRequests/${activeRequestId}`).off('value', userOfferListener);
    }
    window.location.reload();
}

