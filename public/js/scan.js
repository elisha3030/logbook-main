// Scanner Module — offline-first, all data via REST API
import { loadSystemSettings, applyThemeFromStorage } from './settings.js';
import OfflineRegistry from './offline-registry.js';

// Apply saved theme immediately on page load
applyThemeFromStorage();

class ScannerManager {
    constructor() {
        this.isScanning = false;
        this.currentStudent = null;
        this.currentLogId = null;
        this.activeLogEntries = []; // Store multiple active logs
        this.officeId = 'engineering-office'; // default, overridden by settings
        this.rfidBuffer = '';
        this.barcodeBuffer = '';
        this.lastBarcodeKeyTime = 0;
        this.rfidTimeout = null;
        this.systemSettings = {};
        this.offlineRegistry = new OfflineRegistry(); // Initialize OfflineRegistry
        this.init();
    }

    async init() {
        await this.loadAndApplySettings();
        this.setupEventListeners();

        // Start heartbeat for offline sync
        setInterval(() => {
            this.offlineRegistry.sync().then(synced => {
                if (synced > 0) {
                    this.showToast(`Synced ${synced} offline registration(s)!`, 'success');
                }
            });
        }, 30000); // Check every 30 seconds
    }

    // Load system settings and apply them to the scanner
    async loadAndApplySettings() {
        try {
            this.systemSettings = await loadSystemSettings();
            const s = this.systemSettings;

            // 1. Override officeId from settings
            if (s.officeId) this.officeId = s.officeId;

            // 2. Populate activity dropdown from settings
            const activitySelect = document.getElementById('logActivity');
            if (activitySelect && s.activities) {
                let rawActivities = [];
                try { 
                    rawActivities = typeof s.activities === 'string' ? JSON.parse(s.activities) : s.activities; 
                } catch { }

                if (Array.isArray(rawActivities) && rawActivities.length > 0) {
                    activitySelect.innerHTML = '<option value="">Select Activity</option>' +
                        rawActivities.map(item => {
                            const name = typeof item === 'object' ? item.name : item;
                            return `<option value="${name.replace(/"/g, '&quot;')}">${name}</option>`;
                        }).join('');
                }
            }

            // 2b. Populate staff dropdown from /api/faculty
            const staffSelect = document.getElementById('logStaff');
            if (staffSelect) {
                try {
                    const res = await fetch('/api/faculty');
                    const faculties = await res.json();
                    if (Array.isArray(faculties) && faculties.length > 0) {
                        staffSelect.innerHTML = '<option value="">Select Staff</option>' +
                            faculties.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
                        
                        // Re-initialize grid after populating
                        this._createCardGridFromSelect('logStaff', 'logStaffGrid', 'staff-card');
                    }
                } catch (e) {
                    console.warn('⚠️ Could not load faculty list:', e.message);
                }
            }

            // 3. Toggle year level field in registration form
            const yearLevelWrapper = document.getElementById('regYearLevel')?.closest('.space-y-2');
            if (yearLevelWrapper) {
                const enabled = s.yearLevelEnabled !== 'false';
                yearLevelWrapper.classList.toggle('hidden', !enabled);
                const select = document.getElementById('regYearLevel');
                if (select) select.required = enabled && s.yearLevelRequired !== 'false';
            }

            // 4. Apply session timeout if configured
            const timeoutMinutes = parseInt(s.sessionTimeoutMinutes || '0', 10);
            if (timeoutMinutes > 0) this._startSessionTimeout(timeoutMinutes);

        } catch (e) {
            console.warn('⚠️ Could not load system settings:', e.message);
        }
    }

    // Play a short beep using the Web Audio API
    playBeep(success = true) {
        if (this.systemSettings.audioFeedback === 'false') return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(success ? 880 : 440, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch { /* audio not supported */ }
    }

    // Session timeout: auto-logout after inactivity
    _startSessionTimeout(minutes) {
        let timer;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (window.authManager) {
                    window.authManager.handleLogout?.();
                } else {
                    window.location.href = 'index.html';
                }
            }, minutes * 60 * 1000);
        };
        ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => window.addEventListener(evt, reset));
        reset();
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const template = document.getElementById('toastTemplate');
        if (!container || !template) return;

        const toast = template.content.cloneNode(true).firstElementChild;
        toast.querySelector('.toast-message').textContent = message;

        const icon = toast.querySelector('.toast-icon');
        if (type === 'error') {
            icon.setAttribute('data-lucide', 'alert-circle');
            icon.classList.remove('text-emerald-400');
            icon.classList.add('text-red-400');
            toast.classList.remove('bg-slate-900/90');
            toast.classList.add('bg-red-500/95'); // Slightly more visible red for errors
        }

        container.appendChild(toast);
        lucide.createIcons();

        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const confirmBtn = document.getElementById('confirmConfirmBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');

            if (!modal || !confirmBtn || !cancelBtn) {
                resolve(confirm(message));
                return;
            }

            titleEl.textContent = title || 'Are you sure?';
            messageEl.textContent = message || 'This action cannot be undone.';
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (window.lucide) lucide.createIcons();

            const cleanup = (result) => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            };

            const onConfirm = () => cleanup(true);
            const onCancel = () => cleanup(false);

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    _createCardGridFromSelect(selectId, gridContainerId, cardClass) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        let grid = document.getElementById(gridContainerId);
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Array.from(select.options).forEach(option => {
            if (!option.value) return; // Skip empty placeholder
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `${cardClass} text-left p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all focus:outline-none flex flex-col justify-center min-h-[64px]`;
            btn.dataset.value = option.value;
            
            // Format text (remove (Specify in notes) etc for brevity)
            let displayText = option.text.replace(' (Specify in notes)', '');
            if (displayText.length > 25) displayText = displayText.substring(0, 22) + '...';

            btn.innerHTML = `<span class="block text-xs font-bold text-slate-700 dark:text-slate-200 pointer-events-none">${displayText}</span>`;
            
            btn.addEventListener('click', () => {
                select.value = option.value;
                grid.querySelectorAll('button').forEach(b => {
                    b.classList.remove('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'ring-2', 'ring-emerald-500/20');
                });
                btn.classList.add('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'ring-2', 'ring-emerald-500/20');
                
                select.dispatchEvent(new Event('change'));
            });
            
            // Highlight if already selected
            if (select.value === option.value) {
                btn.classList.add('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'ring-2', 'ring-emerald-500/20');
            }
            
            grid.appendChild(btn);
        });
    }

    setupEventListeners() {
        this._createCardGridFromSelect('documentTypeSelect', 'documentTypeGrid', 'doc-card');
        this._createCardGridFromSelect('logActivity', 'logActivityGrid', 'activity-card');
        this._createCardGridFromSelect('logStaff', 'logStaffGrid', 'staff-card');

        const scanIdBtn = document.getElementById('scanIdBtn');
        const stopScanBtn = document.getElementById('stopScanBtn');
        const regForm = document.getElementById('regForm');
        const logVisitForm = document.getElementById('logVisitForm');
        const logActivity = document.getElementById('logActivity');
        const otherActivityContainer = document.getElementById('otherActivityContainer');
        const logOutBtn = document.getElementById('logOutBtn');
        const timeOutAllBtn = document.getElementById('timeOutAllBtn');

        if (timeOutAllBtn) {
            timeOutAllBtn.addEventListener('click', () => {
                this.timeOutAll();
            });
        }

        // Global Barcode Listener for Automatic Scanning
        window.addEventListener('keydown', (e) => {
            // Ignore if focus is in an input field or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ignore modifier keys
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();

            // Rapid Scan Detection: If the delay is too long (>100ms), it's probably not a high-speed scanner
            if (now - this.lastBarcodeKeyTime > 100) {
                this.barcodeBuffer = '';
            }
            this.lastBarcodeKeyTime = now;

            if (e.key === 'Enter') {
                if (this.barcodeBuffer.length >= 4) { // Minimum length for a barcode
                    console.log('📦 Automatic Scan detected:', this.barcodeBuffer);
                    const scannedValue = this.barcodeBuffer;
                    this.barcodeBuffer = '';
                    this.lookupStudent(scannedValue);
                } else {
                    this.barcodeBuffer = '';
                }
            } else if (e.key.length === 1) {
                this.barcodeBuffer += e.key;
            }
        });

        // Instantly trigger a sync when the browser detects internet connection
        window.addEventListener('online', () => {
            console.log('🌐 Back online! Requesting instant background sync...');
            fetch('/api/sync-now', { method: 'POST' }).catch(err => console.warn('Sync trigger failed:', err));
        });

        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerAndLogVisit();
            });
        }

        if (logVisitForm) {
            logVisitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.logVisit();
            });
        }

        if (logActivity) {
            logActivity.addEventListener('change', async () => {
                const val = logActivity.value;
                const otherActivityContainer = document.getElementById('otherActivityContainer');
                const docTypeContainer = document.getElementById('documentTypeContainer');
                const readyContainer = document.getElementById('readyDocumentsContainer');

                // Toggle "Others" input
                if (val === 'Others') {
                    otherActivityContainer?.classList.remove('hidden');
                    document.getElementById('otherActivityInput').required = true;
                } else {
                    otherActivityContainer?.classList.add('hidden');
                    const oi = document.getElementById('otherActivityInput');
                    if (oi) {
                        oi.required = false;
                        oi.value = '';
                    }
                }

                // Toggle "Document Request" type dropdown
                if (val === 'Document Request') {
                    docTypeContainer?.classList.remove('hidden');
                    document.getElementById('documentTypeSelect').required = true;
                } else {
                    docTypeContainer?.classList.add('hidden');
                    const ds = document.getElementById('documentTypeSelect');
                    if (ds) {
                        ds.required = false;
                        ds.value = '';
                    }
                    // Clear visual selection
                    document.getElementById('documentTypeGrid')?.querySelectorAll('button').forEach(b => {
                        b.classList.remove('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'ring-2', 'ring-emerald-500/20');
                    });
                }

                // Handle "Document Pick-up" fetch
                if (val === 'Document Pick-up') {
                    await this.fetchReadyDocuments();
                } else if (readyContainer) {
                    readyContainer.classList.add('hidden');
                    const ps = document.getElementById('pickupDocumentSelect');
                    if (ps) {
                        ps.required = false;
                        ps.value = '';
                    }
                }
            });
        }

        if (logOutBtn) {
            logOutBtn.addEventListener('click', () => {
                this.logTimeOut();
            });
        }

        // PDF Upload Listeners (New)
        const pdfInput = document.getElementById('studentPdfUpload');
        const pdfFileNameDisplay = document.getElementById('pdfFileName');
        if (pdfInput && pdfFileNameDisplay) {
            pdfInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.type !== 'application/pdf') {
                        this.showToast('Please select a PDF file', 'error');
                        pdfInput.value = '';
                        pdfFileNameDisplay.textContent = 'No file selected...';
                        return;
                    }
                    pdfFileNameDisplay.textContent = file.name;
                    pdfFileNameDisplay.classList.remove('text-slate-400');
                    pdfFileNameDisplay.classList.add('text-blue-600', 'font-black');
                } else {
                    pdfFileNameDisplay.textContent = 'No file selected...';
                    pdfFileNameDisplay.classList.add('text-slate-400');
                    pdfFileNameDisplay.classList.remove('text-blue-600', 'font-black');
                }
            });
        }
    }





    async lookupStudent(studentNumber) {
        if (!studentNumber) {
            this.showToast('Please enter a valid NFC Chip Number', 'error');
            return;
        }

        console.log('🔍 Looking up student:', studentNumber);

        const startTime = performance.now();

        try {
            // "Sneaky Fast" UI: Only show loading if it takes more than 100ms
            const loadingTimeout = setTimeout(() => {
                const studentInfo = document.getElementById('studentInfo');
                if (studentInfo && studentInfo.innerHTML.includes('Ready')) {
                    studentInfo.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
                            <div class="relative w-12 h-12">
                                <div class="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                                <div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p class="mt-6 text-sm font-black text-slate-400 uppercase tracking-widest">Searching...</p>
                        </div>
                    `;
                }
            }, 150);

            // Add AbortController for fast timeout (2500ms) to allow backend fallback to fail gracefully
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            // Query backend for student (pass officeId for active session check)
            // The backend handles hitting the local SQLite cache instantly
            const response = await fetch(`/api/students/${studentNumber}?officeId=${this.officeId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            clearTimeout(loadingTimeout);

            const data = await response.json();
            const endTime = performance.now();
            console.log(`⏱️ Lookup for ${studentNumber} took ${(endTime - startTime).toFixed(2)}ms`);

            if (response.ok) {
                // Student found
                const student = data;
                console.log('✅ Student data found:', student);

                this.playBeep(true); // Audio feedback: success

                this.currentStudent = { ...student };
                this.activeLogEntries = student.activeLogs || [];

                // CHECKOUT LOGIC: If active sessions exist, show the granular prompt
                if (this.activeLogEntries.length > 0) {
                    console.log(`🔄 ${this.activeLogEntries.length} active session(s) found, showing prompt`);
                    this.displayCheckoutPrompt(this.currentStudent);
                } else if (this.systemSettings.autoSubmit === 'true') {
                    // Auto-submit: log the visit using the first available activity
                    let activities = [];
                    try { activities = JSON.parse(this.systemSettings.activities || '[]'); } catch { }
                    const defaultActivity = activities[0] || 'Inquiry';
                    this.currentStudent = { ...student };
                    const autoLogData = {
                        studentNumber: student.id,
                        studentName: student.name,
                        studentId: student.studentId || 'N/A',
                        activity: defaultActivity,
                        staff: '',
                        yearLevel: student['Year Level'] || student.yearLevel || 'N/A',
                        course: student.Course || student.course || 'N/A',
                        date: new Date().toISOString().split('T')[0],
                        staffEmail: window.authManager?.getCurrentUser?.()?.email || ''
                    };
                    try {
                        const autoRes = await fetch('/api/logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ logData: autoLogData, officeId: this.officeId })
                        });
                        const autoResult = await autoRes.json();
                        if (!autoRes.ok) throw new Error(autoResult.error);
                        this.currentLogId = autoResult.id;
                        this.showToast(`Auto log-in: ${student.name}`);
                        this.resetPage();
                    } catch (e) {
                        this.showToast('Auto-submit failed, showing form', 'error');
                        this.showVisitForm();
                    }
                } else {
                    // Regular check-in flow
                    this.showVisitForm();
                }
            } else if (response.status === 404) {
                // Student not found, show registration form
                this.playBeep(false); // Audio feedback: not found
                console.log('❌ Student not found, showing registration form');
                this.showRegistrationForm(studentNumber);
            }

        } catch (error) {
            console.warn('❌ Student lookup error (might be offline):', error);
            this.playBeep(false); // Audio feedback: error

            // Any error during lookup in a production environment should offer the "safety net": offline registration.
            // This handles server downtime, network loss, CORS issues, etc.
            const studentInfo = document.getElementById('studentInfo');
            if (studentInfo) {
                studentInfo.innerHTML = `
                <div class="alert alert-warning mx-auto max-w-sm mt-10 p-8 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-400 rounded-[2.5rem] border border-amber-200 dark:border-amber-800 shadow-xl text-center">
                    <div class="bg-amber-100 dark:bg-amber-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i data-lucide="wifi-off" class="w-8 h-8 text-amber-600"></i>
                    </div>
                    <strong>Server Unreachable</strong>
                    <p class="text-sm mt-3 font-medium opacity-80">We can't reach the local server, but you can still register this student offline.</p>
                    <button id="registerOfflineBtn" class="mt-6 w-full bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="user-plus" class="w-4 h-4"></i>
                        Register Offline
                    </button>
                    <p class="text-[10px] mt-4 font-bold uppercase tracking-widest opacity-50">Barcode: ${studentNumber}</p>
                </div>
            `;
                lucide.createIcons();
                document.getElementById('registerOfflineBtn').addEventListener('click', () => {
                    this.showRegistrationForm(studentNumber);
                    // Add a hint to the reg form that we are in offline mode
                    const regHeader = document.querySelector('#registrationForm h5');
                    if (regHeader) regHeader.innerHTML += ' <span class="text-amber-600 text-xs font-black bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">OFFLINE</span>';
                });
            } else {
                this.showToast('Unable to reach server for lookup.', 'error');
            }
        }
    }

    async fetchReadyDocuments() {
        if (!this.currentStudent) return;

        const container = document.getElementById('readyDocumentsContainer');
        const list = document.getElementById('readyDocumentsList');
        if (!container || !list) return;

        list.innerHTML = `
            <div class="flex items-center gap-2 py-4 text-blue-500/60 font-bold animate-pulse">
                <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>
                Checking for ready documents...
            </div>
        `;
        container.classList.remove('hidden');
        lucide.createIcons();

        try {
            // Fetch logs for the current student
            const studentNum = this.currentStudent.studentId || this.currentStudent.id;
            const res = await fetch(`/api/logs?studentNumber=${studentNum}\&officeId=${this.officeId}\&limit=50`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            
            const logs = await res.json();
            
            // Filter: Completed "Document Request" entries that haven't been picked up ('Out')
            const readyDocs = logs.filter(log => {
                const act = (log.activity || '').toLowerCase();
                
                // Broad check for document-like activities
                const docKeywords = ['document', 'certificate', 'certification', 'transcript', 'tor', 'cor', 'cog', 'clearance', 'form', 'dismissal', 'diploma', 'id card', 'request', 'paper', 'application', 'permit', 'records', 'evaluation', 'eval', 'authentication', 'verification'];
                const excludeKeywords = ['pick-up', 'pickup', 'inquiry', 'consultation', 'inquiries'];
                const isDocReq = act.startsWith('document request') || (docKeywords.some(k => act.includes(k)) && !excludeKeywords.some(k => act.includes(k)));

                const isCompleted = log.status === 'completed';
                const isNotClaimed = (log.docStatus || '').toLowerCase() !== 'out';
                return isDocReq && isCompleted && isNotClaimed;
            });

            if (readyDocs.length === 0) {
                list.innerHTML = `
                    <div class="p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-blue-200 dark:border-blue-700 text-center">
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400">No documents ready for collection.</p>
                        <p class="text-[10px] text-slate-400 mt-1">If you were notified, please coordinate with the staff.</p>
                    </div>
                `;
            } else {
                list.innerHTML = readyDocs.map(doc => `
                    <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-700 group transition-all hover:border-blue-300">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">${doc.activity}</span>
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${doc.staff ? 'Processed by ' + doc.staff : 'Ready for collection'}</span>
                        </div>
                        <div class="flex items-center gap-3">
                             <div class="hidden sm:block px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-wider border border-emerald-100">
                                READY
                             </div>
                             <button onclick="window.scannerManager.claimDocument('${doc.id}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95">
                                Claim
                             </button>
                        </div>
                    </div>
                `).join('');
            }
            lucide.createIcons();
        } catch (e) {
            console.error('Error fetching ready documents:', e);
            list.innerHTML = `<p class="text-xs text-red-500 font-bold p-4 text-center">Unable to load document status.</p>`;
        }
    }

    async claimDocument(logId) {
        if (!this.currentStudent) return;

        const btn = document.querySelector(`button[onclick="window.scannerManager.claimDocument('${logId}')"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i>';
            lucide.createIcons();
        }

        try {
            const studentNum = this.currentStudent.studentId || this.currentStudent.id;
            const res = await fetch(`/api/logs/${logId}/claim`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentNumber: studentNum, officeId: this.officeId })
            });

            if (!res.ok) throw new Error('Failed to claim document');

            this.showToast('Document claimed successfully!');
            
            // Refresh the list
            await this.fetchReadyDocuments();

        } catch (e) {
            console.error('Claim error:', e);
            this.showToast('Failed to claim document.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Claim';
            }
        }
    }
    displayStudentInfo(student) {
        const studentInfo = document.getElementById('studentInfo');
        studentInfo.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div class="bg-emerald-500 px-8 py-6 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
                            <i data-lucide="user-check" class="w-6 h-6 text-white"></i>
                        </div>
                        <h4 class="text-white font-black tracking-tight">Student Identified</h4>
                    </div>
                </div>
                <div class="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div class="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-500 border-2 border-slate-100 dark:border-slate-600 flex-shrink-0">
                        <i data-lucide="user" class="w-12 h-12"></i>
                    </div>
                    <div class="text-center md:text-left space-y-4 flex-grow">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 mb-1">Student Name</p>
                            <h3 class="text-2xl font-black text-slate-900 dark:text-white leading-none">${student.name}</h3>
                        </div>
                        <div class="flex flex-wrap gap-3 justify-center md:justify-start">
                            <div class="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-0.5">NFC Chip</p>
                                <p class="font-bold text-slate-700 dark:text-slate-100 text-xs">${student.id || 'N/A'}</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-600">
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-0.5">Student ID</p>
                                <p class="font-bold text-slate-700 dark:text-slate-100 text-xs">${student.studentId || 'N/A'}</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-600">
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-0.5">Program</p>
                                <p class="font-bold text-slate-700 dark:text-slate-100 text-xs">${student.Course || student.course || 'N/A'}</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-600">
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-0.5">Year</p>
                                <p class="font-bold text-slate-700 dark:text-slate-100 text-xs">${student['Year Level'] || student.yearLevel || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    }

    displayCheckoutPrompt(student) {
        // Hide other forms
        document.getElementById('registrationForm').classList.add('hidden');
        document.getElementById('visitForm').classList.add('hidden');

        // Render the explicit checkout UI inside studentInfo
        const studentInfo = document.getElementById('studentInfo');
        studentInfo.classList.remove('hidden');

        studentInfo.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div class="bg-[#FF2E36] px-8 py-8 flex items-center gap-6">
                    <div class="bg-white/20 p-4 rounded-3xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <i data-lucide="clock" class="w-8 h-8 text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-white text-2xl font-black tracking-tight drop-shadow-sm">Active Session Found</h3>
                        <p class="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] mt-1 drop-shadow-sm">LOG OUT REQUIRED</p>
                    </div>
                </div>

                <div class="p-8 md:p-10 space-y-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-50 dark:border-slate-700">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 ml-1">Student ID Number</label>
                            <input type="text" readonly value="${student.studentId || student.id || 'N/A'}"
                                class="block w-full border-none rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-700 font-mono font-bold text-slate-500 dark:text-slate-200 outline-none italic leading-none">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 ml-1">Student Name</label>
                            <input type="text" readonly value="${student.name || 'N/A'}"
                                class="block w-full border-none rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-700 font-bold text-slate-800 dark:text-white outline-none leading-none">
                        </div>
                    </div>

                    <div class="space-y-4">
                        <label class="block text-sm font-black text-slate-900 dark:text-white ml-1 flex items-center gap-2">
                            <i data-lucide="log-out" class="w-4 h-4 text-red-500"></i>
                            Select and verify activities to log out:
                        </label>
                        
                        <div class="space-y-3 mt-4">
                            ${this.activeLogEntries.map((log, idx) => `
                                <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 group/item hover:border-blue-200 transition-all">
                                    <div class="flex flex-col">
                                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">${log.activity || 'Visit'}</span>
                                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${new Date(log.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div class="flex bg-slate-200 dark:bg-slate-600 p-1 rounded-xl">
                                        <button onclick="window.scannerManager.updateLogStatusLocal(${idx}, 'pending')" 
                                            class="status-toggle-${idx} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${log.status === 'pending' ? 'bg-white dark:bg-slate-500 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
                                            id="pending-btn-${idx}">
                                            Pending
                                        </button>
                                        <button onclick="window.scannerManager.updateLogStatusLocal(${idx}, 'complete')" 
                                            class="status-toggle-${idx} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${log.status === 'complete' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
                                            id="complete-btn-${idx}">
                                            Complete
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <button id="explicitCheckoutBtn"
                        class="w-full bg-[#0F172A] hover:bg-black text-white font-black py-4.5 px-10 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95 text-lg mt-4 leading-none">
                        <i data-lucide="check-circle" class="w-6 h-6 text-[#FF2E36]"></i>
                        Confirm & Log Out
                    </button>
                </div>
            </div>
            `;
        lucide.createIcons();

        // Attach event listener to the native button
        document.getElementById('explicitCheckoutBtn').addEventListener('click', () => {
            this.confirmMultiLogTimeout();
        });
    }

    // Helper to toggle status locally in the list
    async updateLogStatusLocal(index, newStatus) {
        if (!this.activeLogEntries[index]) return;
        this.activeLogEntries[index].status = newStatus;

        // Update UI toggles immediately
        const pendingBtn = document.getElementById(`pending-btn-${index}`);
        const completeBtn = document.getElementById(`complete-btn-${index}`);

        if (newStatus === 'pending') {
            pendingBtn.className = `status-toggle-${index} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-slate-500 text-slate-900 dark:text-white shadow-sm`;
            completeBtn.className = `status-toggle-${index} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-700`;
        } else {
            pendingBtn.className = `status-toggle-${index} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-700`;
            completeBtn.className = `status-toggle-${index} px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-sm`;

            // AUTO-CHECKOUT: If marked as complete, trigger the timeout API immediately
            console.log(`🚀 Auto-checkout triggered for activity: ${this.activeLogEntries[index].activity}`);
            await this.confirmLogTimeout(index);
        }
    }

    // New helper to checkout a single log entry automatically
    async confirmLogTimeout(index) {
        const log = this.activeLogEntries[index];
        if (!log) return;

        try {
            const response = await fetch(`/api/logs/${log.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ officeId: this.officeId })
            });

            if (!response.ok) throw new Error('Failed to log out');

            this.showToast(`Checked out: ${log.activity || 'Activity'}`);

            // Remove the log from local entries so it disappears from UI
            this.activeLogEntries.splice(index, 1);

            // If no more active logs, reset the page
            if (this.activeLogEntries.length === 0) {
                this.resetPage();
            } else {
                // Re-render the prompt with remaining logs
                this.displayCheckoutPrompt(this.currentStudent);
            }

        } catch (error) {
            console.error('❌ Auto checkout failed:', error);
            this.showToast('Failed to log out session.', 'error');
        }
    }

    async confirmMultiLogTimeout() {
        const toComplete = this.activeLogEntries.filter(l => l.status === 'complete');

        if (toComplete.length === 0) {
            this.showToast('No activities marked as complete.', 'warning');
            return;
        }

        const btn = document.getElementById('explicitCheckoutBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="lucide-loader-2 animate-spin w-5 h-5 mr-2"></i>Processing...';

        try {
            // Process each completed log
            const results = await Promise.all(toComplete.map(log =>
                fetch(`/api/logs/${log.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ officeId: this.officeId })
                }).then(res => res.json())
            ));

            this.showToast(`Successfully logged out ${toComplete.length} activity/ies.`);
            this.resetPage();

        } catch (error) {
            console.error('❌ Selective log out failed:', error);
            this.showToast('Failed to log out selected sessions.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    showRegistrationForm(studentNumber) {
        // Hide other forms
        const visitForm = document.getElementById('visitForm');
        if (visitForm) visitForm.classList.add('hidden');

        const studentInfo = document.getElementById('studentInfo');
        if (studentInfo) studentInfo.classList.add('hidden');

        // Show registration form
        const regForm = document.getElementById('registrationForm');
        if (regForm) regForm.classList.remove('hidden');

        // Pre-fill student number
        document.getElementById('regStudentNumber').value = studentNumber;
        document.getElementById('regStudentNumberDisplay').textContent = studentNumber;

        lucide.createIcons();

        // Scroll to registration form
        document.getElementById('registrationForm').scrollIntoView({ behavior: 'smooth' });
    }

    showVisitForm() {
        // Hide other forms safely
        const regForm = document.getElementById('registrationForm');
        if (regForm) regForm.classList.add('hidden');

        const timeOutSection = document.getElementById('timeOutSection');
        if (timeOutSection) timeOutSection.classList.add('hidden');

        // Hide the empty-state studentInfo card (we show the visitForm card instead)
        const studentInfo = document.getElementById('studentInfo');
        if (studentInfo) studentInfo.classList.add('hidden');

        // Show visit form
        const visitForm = document.getElementById('visitForm');
        if (visitForm) visitForm.classList.remove('hidden');

        const readyContainer = document.getElementById('readyDocumentsContainer');
        if (readyContainer) readyContainer.classList.add('hidden');

        // Auto-fill student ID and name fields
        const studentIdInput = document.getElementById('foundStudentId');
        const studentNameInput = document.getElementById('foundStudentName');
        if (studentIdInput && this.currentStudent) {
            studentIdInput.value = this.currentStudent.studentId || this.currentStudent.id;
            studentNameInput.value = this.currentStudent.name;
        }

        lucide.createIcons();

        // Scroll to visit form
        document.getElementById('visitForm').scrollIntoView({ behavior: 'smooth' });
    }

    async registerAndLogVisit() {
        const studentNumber = document.getElementById('regStudentNumber').value;
        const fullName = document.getElementById('regFullName').value;
        const studentId = document.getElementById('regStudentId').value;
        const email = document.getElementById('regEmail').value;
        const course = document.getElementById('regCourse').value;
        const yearLevel = document.getElementById('regYearLevel').value;

        if (!studentNumber || !fullName || !studentId || !email || !course || !yearLevel) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        const studentData = {
            barcode: studentNumber,
            name: fullName,
            studentId: studentId,
            email: email,
            Course: course,
            yearLevel: yearLevel
        };

        try {
            // Register student only via backend API (no visit log yet)
            const response = await fetch('/api/students/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to register');

            // Set current student so the visit form can use it
            this.currentStudent = {
                id: studentNumber,
                name: fullName,
                studentId: studentId,
                email: email,
                Course: course,
                'Year Level': yearLevel
            };

            // Show the visit form (same flow as existing student)
            this.showVisitForm();

        } catch (error) {
            console.warn('❌ Registration failed, saving to offline queue:', error);

            // Save to offline queue!
            this.offlineRegistry.queueRegistration(studentData);

            this.showToast('Server unavailable. Registration saved offline and will sync later.', 'warning');

            // Show the "Success" view anyway so the user can continue
            this.currentStudent = studentData;
            this.showVisitForm();

            // Hint on the visit form
            const visitHeader = document.querySelector('#visitForm h5');
            if (visitHeader) visitHeader.innerHTML += ' <span class="text-amber-600 text-[10px] font-black bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 ml-2">PENDING SYNC</span>';
        }
    }

    async logVisit() {
        let activity = document.getElementById('logActivity').value;
        const otherActivity = document.getElementById('otherActivityInput').value;
        const docType = document.getElementById('documentTypeSelect').value;
        const staff = document.getElementById('logStaff').value;

        if (activity === 'Others' && otherActivity) {
            activity = otherActivity;
        } else if (activity === 'Document Request' && docType) {
            activity = `Document Request: ${docType}`;
        }

        if (!activity) {
            this.showToast('Please select or specify an activity', 'error');
            return;
        }

        try {
            const formData = new FormData();
            const pdfFile = document.getElementById('studentPdfUpload')?.files[0];
            
            const logData = {
                studentNumber: this.currentStudent.id,
                studentName: this.currentStudent.name,
                studentId: this.currentStudent.studentId || 'N/A',
                activity: activity,
                staff: staff,
                yearLevel: this.currentStudent['Year Level'] || this.currentStudent.yearLevel || 'N/A',
                course: this.currentStudent.Course || this.currentStudent.course || 'N/A',
                email: this.currentStudent.email || '',
                date: new Date().toISOString().split('T')[0],
                staffEmail: window.authManager?.getCurrentUser?.()?.email || ''
            };

            formData.append('logData', JSON.stringify(logData));
            formData.append('officeId', this.officeId);
            if (pdfFile) {
                formData.append('softCopy', pdfFile);
            }

            // Log visit via backend API
            const response = await fetch('/api/logs', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to log visit');

            this.currentLogId = result.id;

            // Show success message and reset page because explicit timeout section is gone
            this.showToast('Visit logged successfully!');
            this.resetPage();

        } catch (error) {
            console.warn('❌ Visit log failed, queuing offline:', error);

            // Queue locally
            const logData = {
                logData: {
                    studentNumber: this.currentStudent.id,
                    studentName: this.currentStudent.name,
                    studentId: this.currentStudent.studentId || 'N/A',
                    activity: activity,
                    staff: staff,
                    yearLevel: this.currentStudent['Year Level'] || this.currentStudent.yearLevel || 'N/A',
                    course: this.currentStudent.Course || this.currentStudent.course || 'N/A',
                    email: this.currentStudent.email || '',
                    date: new Date().toISOString().split('T')[0],
                    staffEmail: window.authManager?.getCurrentUser?.()?.email || ''
                },
                officeId: this.officeId
            };
            this.offlineRegistry.queueLog(logData);

            this.showToast('Server unavailable. Visit saved offline and will sync later.', 'warning');

            // Reset page or show success
            this.resetPage();
        }
    }

    // This is now handled by the backend API calls above
    async saveVisitLog(activity) {
        console.warn('saveVisitLog is deprecated, use API endpoints directly');
    }

    showTimeOutSection() {
        // Hide other forms
        document.getElementById('registrationForm').classList.add('hidden');
        document.getElementById('visitForm').classList.add('hidden');

        // Show time out section
        document.getElementById('timeOutSection').classList.remove('hidden');
        document.getElementById('loggedInStudent').textContent = this.currentStudent.name;
    }

    async logTimeOut() {
        if (!this.currentLogId) {
            this.showToast('No active visit found', 'error');
            return;
        }

        try {
            // Update the log document with timeOut via API
            const response = await fetch(`/api/logs/${this.currentLogId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ officeId: this.officeId })
            });

            if (!response.ok) throw new Error('Failed to log time out');

            console.log('✅ Time out logged successfully');
            this.showToast('Time out logged successfully!');
            this.resetPage();

        } catch (error) {
            console.error('❌ Error logging time out:', error);
            this.showToast('Error logging time out. Please try again.', 'error');
        }
    }

    async timeOutAll() {
        const confirmed = await this.showConfirm('Bulk Check-out', 'Log out ALL currently active sessions?\nThis will close every open visit log.');
        if (!confirmed) return;

        const btn = document.getElementById('timeOutAllBtn');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch('/api/logs/clear-active', { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to time out all');

            const count = result.cleared ?? 0;
            this.showToast(count > 0 ? `Checked out ${count} active session${count !== 1 ? 's' : ''}.` : 'No active sessions to close.');

            // If we just closed the student currently on screen, reset to ready state
            if (this.currentLogId) this.resetPage();
        } catch (error) {
            console.error('❌ Error timing out all:', error); // Reverted to original error message for timeOutAll
            this.showToast('Failed to time out all sessions. Please try again.', 'error'); // Reverted to original toast for timeOutAll
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        }
    }

    stopScanning() {
        this.isScanning = false;
        console.log('⏹️ Scanner stopped');
    }

    resetPage() {
        // Reset student info
        document.getElementById('studentInfo').innerHTML = `
            <div class="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] p-20 text-center transition-all hover:border-blue-200 hover:bg-blue-50/5 group shadow-sm">
                <div class="relative w-32 h-32 mx-auto mb-10">
                    <div class="absolute inset-0 bg-blue-100 dark:bg-blue-900/40 rounded-full animate-ping opacity-20"></div>
                    <div class="relative bg-blue-50 dark:bg-blue-900/30 w-32 h-32 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-xl">
                        <i data-lucide="scan" class="w-14 h-14 text-blue-500"></i>
                    </div>
                </div>
                <h3 class="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">System Ready</h3>
                <p class="text-lg font-bold text-slate-500 dark:text-slate-300 mb-8 max-w-sm mx-auto leading-relaxed">Waiting for student...<br/>Simply scan the NFC chip to log in, and tap again to log out.</p>
                
                <div class="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Waiting for Scanner Input...
                </div>
            </div>
        `;
        lucide.createIcons();

        // Hide all forms
        const timeOutSection = document.getElementById('timeOutSection');
        if (timeOutSection) timeOutSection.classList.add('hidden');

        const regForm = document.getElementById('registrationForm');
        if (regForm) regForm.classList.add('hidden');

        const visitForm = document.getElementById('visitForm');
        if (visitForm) visitForm.classList.add('hidden');

        const studentInfo = document.getElementById('studentInfo');
        if (studentInfo) studentInfo.classList.remove('hidden');

        const readyContainer = document.getElementById('readyDocumentsContainer');
        if (readyContainer) readyContainer.classList.add('hidden');

        // Reset forms
        document.getElementById('regForm').reset();
        document.getElementById('logVisitForm').reset();
        
        // Explicitly clear additional fields if needed
        const regEmail = document.getElementById('regEmail');
        if (regEmail) regEmail.value = '';

        // Clear current student and log
        this.currentStudent = null;
        this.currentLogId = null;
    }
}

// Initialize scanner manager
window.scannerManager = new ScannerManager();
