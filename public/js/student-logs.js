import { loadSystemSettings, applyThemeFromStorage } from './settings.js';

// Apply saved theme immediately
applyThemeFromStorage();

// ─────────────────────────────────────────────────────────────
// DOCUMENT TYPE CATALOG — specific types replace generic labels
// ─────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
    {
        name: 'Certificate of Registration',
        short: 'COR',
        icon: 'file-badge',
        color: 'blue',
        category: 'certificate',
        description: 'Official enrollment certificate'
    },
    {
        name: 'Certificate of Grades',
        short: 'COG',
        icon: 'award',
        color: 'indigo',
        category: 'grades',
        description: 'GWA / academic grades'
    },
    {
        name: 'Transcript of Records',
        short: 'TOR',
        icon: 'scroll',
        color: 'violet',
        category: 'certificate',
        description: 'Complete academic record'
    },
    {
        name: 'Certification (Enrollment)',
        short: 'Cert.',
        icon: 'file-check',
        color: 'emerald',
        category: 'certificate',
        description: 'Proof of enrollment'
    },
    {
        name: 'Concept Paper',
        short: 'Concept',
        icon: 'lightbulb',
        color: 'amber',
        category: 'concept paper',
        description: 'Research / project proposal'
    },
    {
        name: 'Memorandum',
        short: 'Memo',
        icon: 'mail',
        color: 'rose',
        category: 'memorandum',
        description: 'Official memo request'
    },
    {
        name: 'Honorable Dismissal',
        short: 'HD',
        icon: 'door-open',
        color: 'orange',
        category: 'certificate',
        description: 'Transfer document'
    },
    {
        name: 'Grade Query / Follow-up',
        short: 'Grades',
        icon: 'bar-chart-2',
        color: 'cyan',
        category: 'grades',
        description: 'Grade inquiry or appeal'
    },
    {
        name: 'Shifting / Overload Form',
        short: 'Shifting',
        icon: 'git-branch',
        color: 'teal',
        category: 'form',
        description: 'Program shift or overload'
    },
    {
        name: 'Promissory Note',
        short: 'PN',
        icon: 'file-signature',
        color: 'pink',
        category: 'form',
        description: 'Financial commitment form'
    },
    {
        name: 'Clearance',
        short: 'Clear.',
        icon: 'check-square',
        color: 'lime',
        category: 'clearance',
        description: 'Departmental clearance'
    },
    {
        name: 'Others / Custom Request',
        short: 'Others',
        icon: 'plus-circle',
        color: 'slate',
        category: 'other',
        description: 'Specify your own need'
    }
];

const COLOR_MAP = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',   hover: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',   badge: 'bg-blue-600' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', hover: 'hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20', badge: 'bg-indigo-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', hover: 'hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20', badge: 'bg-violet-600' },
    emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', hover: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20', badge: 'bg-emerald-600' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  hover: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',  badge: 'bg-amber-600' },
    rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-600 dark:text-rose-400',    hover: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',    badge: 'bg-rose-600' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', hover: 'hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20', badge: 'bg-orange-600' },
    cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-600 dark:text-cyan-400',    hover: 'hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',    badge: 'bg-cyan-600' },
    teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600 dark:text-teal-400',    hover: 'hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20',    badge: 'bg-teal-600' },
    pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',    text: 'text-pink-600 dark:text-pink-400',    hover: 'hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20',    badge: 'bg-pink-600' },
    lime:   { bg: 'bg-lime-50 dark:bg-lime-900/20',    text: 'text-lime-600 dark:text-lime-400',    hover: 'hover:border-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20',    badge: 'bg-lime-600' },
    slate:  { bg: 'bg-slate-100 dark:bg-slate-700',    text: 'text-slate-600 dark:text-slate-300',  hover: 'hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',  badge: 'bg-slate-600' }
};

// ─────────────────────────────────────────────────────────────
class StudentKioskManager {
    constructor() {
        this.currentStudent = null;
        this.selectedDocument = null;    // full doc object from DOCUMENT_TYPES
        this.selectedFaculty  = null;
        this.barcodeBuffer    = '';
        this.lastBarcodeKeyTime = 0;
        this.systemSettings   = {};
        this.officeId         = 'engineering-office';

        // Idle timer
        this._idleTimer    = null;
        this._countdownTimer = null;
        this.IDLE_TIMEOUT  = 60000; // 60 s with no interaction resets to scan screen
        this.isIdVisible   = false;
        this.isHistoryVisible = false;

        this.init();
    }

    async init() {
        await this.loadAndApplySettings();
        this.setupEventListeners();
        this.setupLucide();
        this.resetIdleTimer();
    }

    async loadAndApplySettings() {
        try {
            this.systemSettings = await loadSystemSettings();
            if (this.systemSettings.officeId) this.officeId = this.systemSettings.officeId;
        } catch (e) {
            console.warn('⚠️ Could not load system settings:', e.message);
        }
    }

    setupLucide() {
        if (window.lucide) window.lucide.createIcons();
    }

    // ── Toast ──────────────────────────────────────────────────
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const template  = document.getElementById('toastTemplate');
        if (!container || !template) return;

        const toast  = template.content.cloneNode(true).firstElementChild;
        const msgEl  = toast.querySelector('.toast-message');
        const icon   = toast.querySelector('.toast-icon');
        const iconBox = toast.querySelector('.toast-icon-container');
        if (msgEl) msgEl.textContent = message;

        if (type === 'error') {
            icon?.setAttribute('data-lucide', 'alert-circle');
            icon?.classList.replace('text-emerald-400', 'text-red-400');
            iconBox?.classList.replace('bg-white/10', 'bg-red-500/20');
        } else if (type === 'warning') {
            icon?.setAttribute('data-lucide', 'alert-triangle');
            icon?.classList.replace('text-emerald-400', 'text-amber-400');
        }

        container.appendChild(toast);
        this.setupLucide();
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ── Step indicator ─────────────────────────────────────────
    updateStepIndicator(step) {
        const indicator = document.getElementById('stepIndicator');
        if (!indicator) return;

        if (step === 0) {
            indicator.classList.add('hidden');
            return;
        }
        indicator.classList.remove('hidden');

        const dots  = [null, 'step1dot', 'step2dot', 'step3dot', 'step4dot'];
        const lines = [null, 'stepLine1', 'stepLine2', 'stepLine3'];

        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(dots[i]);
            if (!dot) continue;
            if (i < step) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-emerald-500 text-white shadow-lg shadow-emerald-200';
                dot.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
            } else if (i === step) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-blue-600 text-white shadow-lg shadow-blue-200';
                dot.textContent = i;
            } else {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-slate-200 dark:bg-slate-700 text-slate-500';
                dot.textContent = i;
            }
        }

        for (let i = 1; i <= 3; i++) {
            const line = document.getElementById(lines[i]);
            if (!line) continue;
            line.className = 'step-line' + (i < step ? ' done' : '');
        }
    }

    // ── Help: hide all screens ─────────────────────────────────
    hideAllScreens() {
        const screens = [
            'scanPrompt', 'landingSelection', 'documentSelection',
            'facultySelection', 'timeOutPrompt', 'successScreen', 'logContent'
        ];
        screens.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    }

    // ── Idle timer ─────────────────────────────────────────────
    resetIdleTimer() {
        clearTimeout(this._idleTimer);
        // Only start idle timer when NOT on scan screen
        if (!this.currentStudent) return;

        this._idleTimer = setTimeout(() => this.showIdleOverlay(), this.IDLE_TIMEOUT);
    }

    showIdleOverlay() {
        const overlay = document.getElementById('idleOverlay');
        if (!overlay) return;
        overlay.classList.add('active');

        let count = 15;
        const countEl = document.getElementById('idleCount');
        if (countEl) countEl.textContent = count;

        this._countdownTimer = setInterval(() => {
            count--;
            if (countEl) countEl.textContent = count;
            if (count <= 0) {
                clearInterval(this._countdownTimer);
                overlay.classList.remove('active');
                this.resetUI();
            }
        }, 1000);

        // Tap to dismiss
        overlay.onclick = () => {
            clearInterval(this._countdownTimer);
            overlay.classList.remove('active');
            this.resetIdleTimer();
        };
        this.setupLucide();
    }

    // ── Beep ───────────────────────────────────────────────────
    playBeep(success = true) {
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(success ? 880 : 440, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch {}
    }

    // ── BARCODE / RFID scanner listener ───────────────────────
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            // Reset idle timer on any interaction
            this.resetIdleTimer();

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();
            if (now - this.lastBarcodeKeyTime > 100) this.barcodeBuffer = '';
            this.lastBarcodeKeyTime = now;

            if (e.key === 'Enter') {
                if (this.barcodeBuffer.length >= 4) {
                    const val = this.barcodeBuffer;
                    this.barcodeBuffer = '';
                    this.handleScan(val);
                } else {
                    this.barcodeBuffer = '';
                }
            } else if (e.key.length === 1) {
                this.barcodeBuffer += e.key;
            }
        });

        // Reset idle on mouse / touch
        document.addEventListener('pointerdown', () => this.resetIdleTimer());

        // ── Scan screen ────
        document.getElementById('showManualFormBtn')?.addEventListener('click', () => {
            document.getElementById('manualEntryInitial')?.classList.add('hidden');
            document.getElementById('manualEntryForm')?.classList.remove('hidden');
            document.getElementById('manualName')?.focus();
        });
        document.getElementById('cancelManualBtn')?.addEventListener('click', () => {
            document.getElementById('manualEntryForm')?.classList.add('hidden');
            document.getElementById('manualEntryInitial')?.classList.remove('hidden');
            ['manualName', 'manualId'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        });
        document.getElementById('submitManualBtn')?.addEventListener('click', () => this.handleManualSubmit());
        ['manualName', 'manualId'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('submitManualBtn')?.click();
            });
        });

        // ── Landing ────────
        document.getElementById('startTransactionLandingBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showDocumentSelection();
        });
        document.getElementById('viewHistoryLandingBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showStudentHistory(this.currentStudent);
        });
        document.getElementById('cancelLandingBtn')?.addEventListener('click', () => this.resetUI());

        // ── Document selection ──
        document.getElementById('cancelDocBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showLandingSelection(this.currentStudent);
        });
        document.getElementById('submitCustomDocBtn')?.addEventListener('click', () => {
            const input = document.getElementById('customDocInput');
            const val = input?.value.trim();
            if (!val) { this.showToast('Please describe your request.', 'warning'); return; }
            this.selectedDocument = { name: val, short: 'Custom', icon: 'file-question', color: 'slate', category: 'other' };
            this.showFacultySelection();
        });
        document.getElementById('customDocInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('submitCustomDocBtn')?.click();
        });

        // ── Faculty selection ──
        document.getElementById('backToDocBtn')?.addEventListener('click', () => this.showDocumentSelection());

        // ── Time-out prompt ──
        document.getElementById('confirmTimeOutBtn')?.addEventListener('click', () => {
            if (this.currentStudent?.activeLogs?.length > 1) {
                const modal = document.getElementById('multiSessionSignOutModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    this.renderModalActiveSessions(this.currentStudent.activeLogs);
                }
            } else {
                this.handleTimeOut();
            }
        });
        
        document.getElementById('closeMultiSessionModalBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('multiSessionSignOutModal');
            if (modal) modal.classList.add('hidden');
        });

        document.getElementById('viewHistoryTimeOutBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showStudentHistory(this.currentStudent);
        });
        document.getElementById('ignoreTimeOutBtn')?.addEventListener('click',  () => this.showDocumentSelection());
        document.getElementById('cancelTimeOutBtn')?.addEventListener('click',  () => this.resetUI());

        // ── History screen ──
        document.getElementById('proceedToTransactionBtn')?.addEventListener('click', () => this.showDocumentSelection());
        document.getElementById('switchStudentBtn')?.addEventListener('click',         () => this.resetUI());

        // ── Privacy Toggles ──
        document.getElementById('toggleStudentIdBtn')?.addEventListener('click', () => this.toggleIdVisibility());
        document.getElementById('revealHistoryBtn')?.addEventListener('click',   () => this.revealHistory());
        document.getElementById('toggleHistoryVisibilityBtn')?.addEventListener('click', () => this.hideHistory());

        // ── Proof modal ────
        const closeProof  = document.getElementById('closeProofModal');
        const closeProof2 = document.getElementById('closeProofModalBtn');
        const proofModal  = document.getElementById('proofViewerModal');
        [closeProof, closeProof2].forEach(btn => btn?.addEventListener('click', () => proofModal?.classList.add('hidden')));
        proofModal?.addEventListener('click', (e) => { if (e.target === proofModal) proofModal.classList.add('hidden'); });
    }

    // ── Manual form handler ────────────────────────────────────
    async handleManualSubmit() {
        const name = document.getElementById('manualName')?.value.trim();
        const id   = document.getElementById('manualId')?.value.trim();
        if (!name || !id) { this.showToast('Please fill in all fields.', 'warning'); return; }

        try {
            const response = await fetch(`/api/students/${id}?officeId=${this.officeId}`);
            if (response.ok) {
                const student = await response.json();
                this.currentStudent = student;
                this.showToast(`Welcome, ${student.name}!`);
                if (student.activeLogs?.length > 0) {
                    this.showTimeOutPrompt(student);
                } else {
                    this.showLandingSelection(student);
                }
                return;
            }
        } catch (err) {
            console.warn('Manual lookup failed, using guest mode:', err);
        }

        // Guest fallback
        this.currentStudent = {
            id, name,
            studentId: id,
            course: 'Guest', yearLevel: 'N/A',
            isManual: true, activeLogs: []
        };
        this.showLandingSelection(this.currentStudent);
    }

    // ── Scan handler ───────────────────────────────────────────
    async handleScan(id) {
        try {
            const response = await fetch(`/api/students/${id}?officeId=${this.officeId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    this.showToast('Student not registered. Please see staff.', 'error');
                } else {
                    throw new Error('Lookup failed');
                }
                return;
            }
            const student = await response.json();
            this.currentStudent = student;
            this.playBeep(true);

            if (student.activeLogs?.length > 0) {
                this.showTimeOutPrompt(student);
            } else {
                this.showLandingSelection(student);
            }
        } catch (error) {
            console.error('Scan error:', error);
            this.showToast('Scanner error. Please try again.', 'error');
        }
    }

    // ── Reset ──────────────────────────────────────────────────
    resetUI() {
        clearTimeout(this._idleTimer);
        clearInterval(this._countdownTimer);
        document.getElementById('idleOverlay')?.classList.remove('active');

        this.currentStudent  = null;
        this.selectedDocument = null;
        this.selectedFaculty  = null;
        this.barcodeBuffer    = '';
        this.isIdVisible      = false;
        this.isHistoryVisible = false;

        this.hideAllScreens();
        document.getElementById('scanPrompt')?.classList.remove('hidden');
        document.getElementById('manualEntryInitial')?.classList.remove('hidden');
        document.getElementById('manualEntryForm')?.classList.add('hidden');
        document.getElementById('otherDocSection')?.classList.add('hidden');
        
        // Hide modals
        document.getElementById('multiSessionSignOutModal')?.classList.add('hidden');

        const customDocInput = document.getElementById('customDocInput');
        if (customDocInput) customDocInput.value = '';
        ['manualName', 'manualId'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        this.updateStepIndicator(0);
        this.updateIdDisplay();
        this.updateHistoryVisibility();
        this.setupLucide();
    }

    updateIdDisplay() {
        const idEl = document.getElementById('studentIdDisplay');
        const icon = document.getElementById('toggleIdIcon');
        if (!idEl) return;

        if (!this.currentStudent) {
            idEl.textContent = '---';
            return;
        }

        if (this.isIdVisible) {
            idEl.textContent = this.currentStudent.studentId || this.currentStudent.id;
            if (icon) icon.setAttribute('data-lucide', 'eye-off');
        } else {
            const rawId = this.currentStudent.studentId || this.currentStudent.id;
            // Show only the first 2 and last 2 characters if long enough
            if (rawId.length > 6) {
                idEl.textContent = `${rawId.substring(0, 2)}***-***${rawId.substring(rawId.length - 2)}`;
            } else {
                idEl.textContent = '***-****-***';
            }
            if (icon) icon.setAttribute('data-lucide', 'eye');
        }
        this.setupLucide();
    }

    toggleIdVisibility() {
        this.isIdVisible = !this.isIdVisible;
        this.updateIdDisplay();
    }

    updateHistoryVisibility() {
        const screen = document.getElementById('historyPrivacyScreen');
        const content = document.getElementById('historyContent');
        const toggleBtn = document.getElementById('toggleHistoryVisibilityBtn');
        if (!screen || !content) return;

        if (this.isHistoryVisible) {
            screen.classList.add('hidden');
            content.classList.remove('hidden');
            toggleBtn?.classList.remove('hidden');
        } else {
            screen.classList.remove('hidden');
            content.classList.add('hidden');
            toggleBtn?.classList.add('hidden');
        }
    }

    revealHistory() {
        this.isHistoryVisible = true;
        this.updateHistoryVisibility();
        if (this.currentStudent) {
            this.fetchAndRenderLogs(this.currentStudent.id);
        }
    }

    hideHistory() {
        this.isHistoryVisible = false;
        this.updateHistoryVisibility();
    }

    // ── Show: Landing ──────────────────────────────────────────
    showLandingSelection(student) {
        this.hideAllScreens();
        this.updateStepIndicator(1);

        const landing = document.getElementById('landingSelection');
        if (!landing) return;
        landing.classList.remove('hidden');

        const nameEl = document.getElementById('landingStudentName');
        if (nameEl) nameEl.textContent = student.name.split(' ')[0];

        this.resetIdleTimer();
        this.setupLucide();
    }

    // ── Show: Time-out prompt ──────────────────────────────────
    showTimeOutPrompt(student) {
        this.hideAllScreens();
        this.updateStepIndicator(1);

        const prompt = document.getElementById('timeOutPrompt');
        if (!prompt) return;
        prompt.classList.remove('hidden');

        const nameEl = document.getElementById('timeOutStudentName');
        if (nameEl) nameEl.textContent = student.name.split(' ')[0];

        // Ensure "Sign Out" button text is standard
        const btnText = document.getElementById('signOutBtnText');
        const btnSub = document.getElementById('signOutBtnSubtext');
        if (btnText) btnText.textContent = 'Sign Out';
        if (btnSub) btnSub.textContent = 'End current session';

        this.resetIdleTimer();
        this.setupLucide();
    }

    // ── Time-out handler ───────────────────────────────────────
    async handleTimeOut(logId = null) {
        const activeLogs = this.currentStudent?.activeLogs || [];
        const targetLog = logId ? activeLogs.find(l => l.id === logId) : activeLogs[0];
        
        if (!targetLog) return;
        
        try {
            const res = await fetch(`/api/logs/${targetLog.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ officeId: this.officeId })
            });
            if (res.ok) {
                this.showToast('Signed out successfully. Thank you!', 'success');
                // Hide modal if open
                document.getElementById('multiSessionSignOutModal')?.classList.add('hidden');
                this.resetUI();
            } else {
                this.showToast('Failed to sign out. Please see staff.', 'error');
            }
        } catch (e) {
            this.showToast('Network error during sign-out.', 'error');
        }
    }

    // ── Show: Document type selection ─────────────────────────
    showDocumentSelection() {
        this.hideAllScreens();
        this.updateStepIndicator(2);

        const screen = document.getElementById('documentSelection');
        if (!screen) return;
        screen.classList.remove('hidden');

        const nameEl = document.getElementById('docStudentName');
        if (nameEl) nameEl.textContent = this.currentStudent?.name?.split(' ')[0] || 'Student';

        document.getElementById('otherDocSection')?.classList.add('hidden');
        const customInput = document.getElementById('customDocInput');
        if (customInput) customInput.value = '';

        this.renderDocumentTypes();
        this.resetIdleTimer();
        this.setupLucide();
    }

    // ── Modal Session Rendering ──────────────────────────────
    renderModalActiveSessions(activeLogs) {
        const list = document.getElementById('modalActiveSessionsList');
        if (!list) return;

        list.innerHTML = activeLogs.map(log => {
            const timeIn = log.timeIn ? new Date(log.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';
            const dateIn = log.timeIn ? new Date(log.timeIn).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
            
            return `
                <div class="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all cursor-pointer group"
                    onclick="window.kioskManager.handleTimeOut('${log.id}')">
                    <div class="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                        <i data-lucide="check" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="font-black text-slate-800 dark:text-white text-base leading-tight">${log.activity || 'General Transaction'}</p>
                        <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Started: <span class="text-slate-700 dark:text-slate-300">${dateIn} at ${timeIn}</span></p>
                    </div>
                    <div class="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-all flex-shrink-0 pl-2">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </div>
                </div>
            `;
        }).join('');
        
        this.setupLucide();
    }

    // ── Render: Document type cards ────────────────────────────
    renderDocumentTypes() {
        const grid = document.getElementById('documentGrid');
        if (!grid) return;

        // Allow custom doc types from settings to supplement the list
        let docs = [...DOCUMENT_TYPES];
        try {
            if (this.systemSettings.activities) {
                const parsed = JSON.parse(this.systemSettings.activities);
                if (Array.isArray(parsed)) {
                    parsed.forEach(a => {
                        const name = typeof a === 'object' ? a.name : a;
                        if (name.toLowerCase() === 'others' || name.toLowerCase() === 'other') return;
                        if (!docs.find(d => d.name === name)) {
                            // Smart icon & color mapping for common admin-added activities
                            let icon = 'file-text';
                            let color = 'slate';
                            const checkName = name.toLowerCase();
                            
                            if (checkName.includes('enroll') || checkName.includes('admission')) {
                                icon = 'clipboard-list'; color = 'blue';
                            } else if (checkName.includes('inquir') || checkName.includes('question')) {
                                icon = 'messages-square'; color = 'emerald';
                            } else if (checkName.includes('consult') || checkName.includes('counsel')) {
                                icon = 'message-square-text'; color = 'violet';
                            } else if (checkName.includes('document') || checkName.includes('record') || checkName.includes('grade')) {
                                icon = 'folders'; color = 'indigo';
                            } else if (checkName.includes('pay') || checkName.includes('financ') || checkName.includes('fee')) {
                                icon = 'credit-card'; color = 'rose';
                            } else if (checkName.includes('id ') || checkName.includes('card')) {
                                icon = 'badge-help'; color = 'amber';
                            } else if (checkName.includes('clearance')) {
                                icon = 'check-circle'; color = 'lime';
                            } else {
                                icon = 'file'; color = 'slate';
                            }

                            docs.splice(docs.length - 1, 0, { 
                                name, short: name, icon, color, category: 'custom', description: 'Student Request'
                            });
                        }
                    });
                }
            }
        } catch {}

        grid.innerHTML = docs.map(doc => {
            const c = COLOR_MAP[doc.color] || COLOR_MAP.slate;
            return `
                <button onclick="window.kioskManager.selectDocument('${this.escape(doc.name)}')"
                    class="doc-card kiosk-btn group bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-lg ${c.hover} dark:hover:border-slate-600 active:scale-95 flex flex-col items-center gap-3 text-center">
                    <div class="w-14 h-14 rounded-2xl ${c.bg} ${c.text} flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-lucide="${doc.icon}" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-900 dark:text-white leading-tight">${doc.name}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">${doc.description}</p>
                    </div>
                </button>
            `;
        }).join('');
        this.setupLucide();
    }

    escape(str) {
        return String(str || '').replace(/'/g, "\\'");
    }

    // ── Select a document type ─────────────────────────────────
    selectDocument(docName) {
        if (docName === 'Others / Custom Request') {
            document.getElementById('documentGrid')?.classList.add('hidden');
            const otherSection = document.getElementById('otherDocSection');
            if (otherSection) {
                otherSection.classList.remove('hidden');
                otherSection.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('customDocInput')?.focus();
            }
            return;
        }

        this.selectedDocument = DOCUMENT_TYPES.find(d => d.name === docName)
            || { name: docName, short: docName, icon: 'file', color: 'slate', category: 'custom' };

        // Re-show grid if it was hidden by "others" path
        document.getElementById('documentGrid')?.classList.remove('hidden');
        document.getElementById('otherDocSection')?.classList.add('hidden');

        this.showFacultySelection();
    }

    // ── Show: Faculty / staff selection ───────────────────────
    showFacultySelection() {
        this.hideAllScreens();
        this.updateStepIndicator(3);

        const screen = document.getElementById('facultySelection');
        if (!screen) return;
        screen.classList.remove('hidden');

        const nameEl = document.getElementById('selectedDocName');
        if (nameEl) nameEl.textContent = this.selectedDocument?.name || 'request';

        this.renderFaculty();
        this.resetIdleTimer();
        this.setupLucide();
    }

    async renderFaculty() {
        const grid = document.getElementById('facultyGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-span-full flex justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        `;

        try {
            const res = await fetch('/api/faculty');
            const faculties = await res.json();

            let html = '';
            if (!faculties || faculties.length === 0) {
                html = `<p class="text-slate-400 font-bold col-span-full py-10 text-center">No faculty members registered.</p>`;
            } else {
                html = faculties.map(f => `
                    <button onclick="window.kioskManager.logVisit('${this.escape(f.name)}')"
                        class="doc-card kiosk-btn group bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-lg hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 active:scale-95 flex flex-col items-center gap-3 text-center">
                        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 flex-shrink-0 shadow-md">
                            ${f.photoURL
                                ? `<img src="${f.photoURL}" class="w-full h-full object-cover">`
                                : `<div class="w-full h-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 font-black text-xl">${(f.name || 'S').charAt(0).toUpperCase()}</div>`
                            }
                        </div>
                        <div>
                            <p class="text-sm font-black text-slate-900 dark:text-white leading-tight truncate max-w-[140px]">${f.name}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase mt-1">${f.position || 'Staff'}</p>
                        </div>
                    </button>
                `).join('');
            }

            // Skip / General Staff option
            html += `
                <button onclick="window.kioskManager.logVisit('General Staff')"
                    class="doc-card kiosk-btn group bg-slate-50 dark:bg-slate-800/60 p-5 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-slate-400 active:scale-95 flex flex-col items-center gap-3 text-center">
                    <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
                        <i data-lucide="users" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-500 dark:text-slate-400">Skip Selection</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase mt-1">General Staff</p>
                    </div>
                </button>
            `;

            grid.innerHTML = html;
        } catch (e) {
            console.error('Faculty fetch error:', e);
            grid.innerHTML = `<p class="text-red-500 font-bold col-span-full py-10 text-center">Failed to load faculty list.</p>`;
        }

        this.setupLucide();
    }

    // ── Log the visit (final step) ─────────────────────────────
    async logVisit(facultyName) {
        this.selectedFaculty = facultyName;

        if (!this.selectedDocument) {
            this.showToast('No document type selected.', 'error');
            return;
        }

        const logData = {
            studentNumber: this.currentStudent.id,
            studentName:   this.currentStudent.name,
            studentId:     this.currentStudent.studentId || 'N/A',
            activity:      this.selectedDocument.name,
            docType:       this.selectedDocument.category,
            staff:         facultyName,
            yearLevel:     this.currentStudent['Year Level'] || this.currentStudent.yearLevel || 'N/A',
            course:        this.currentStudent.Course || this.currentStudent.course || 'N/A',
            date:          new Date().toISOString().split('T')[0],
            // Status tracking
            docStatus:     'In'  // starts as Incoming
        };

        try {
            const response = await fetch('/api/logs', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ logData, officeId: this.officeId })
            });

            if (response.ok) {
                this.showSuccessScreen(logData);
            } else {
                throw new Error('Log failed');
            }
        } catch (e) {
            this.showToast('Failed to log request. Please see staff.', 'error');
        }
    }

    // ── Show success / done screen ─────────────────────────────
    showSuccessScreen(logData) {
        this.hideAllScreens();
        this.updateStepIndicator(4);

        const screen = document.getElementById('successScreen');
        if (!screen) return;
        screen.classList.remove('hidden');

        const successDocName = document.getElementById('successDocName');
        const successDocType = document.getElementById('successDocType');
        const successStaff   = document.getElementById('successStaff');
        const successTime    = document.getElementById('successTime');

        if (successDocName) successDocName.textContent = logData.activity;
        if (successDocType) successDocType.textContent = logData.activity;
        if (successStaff)   successStaff.textContent   = logData.staff;
        if (successTime)    successTime.textContent     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.setupLucide();

        // Countdown auto-reset
        let count = 15;
        const countdownDisplay = document.getElementById('countdownDisplay');
        const countdownBar     = document.getElementById('countdownBar');

        if (countdownBar) {
            countdownBar.style.transition = `width ${count}s linear`;
            requestAnimationFrame(() => { countdownBar.style.width = '0%'; });
        }

        this._countdownTimer = setInterval(() => {
            count--;
            if (countdownDisplay) countdownDisplay.textContent = count;
            if (count <= 0) {
                clearInterval(this._countdownTimer);
                this.resetUI();
            }
        }, 1000);
    }

    // ── Show: History ──────────────────────────────────────────
    showStudentHistory(student) {
        this.hideAllScreens();
        this.updateStepIndicator(1);

        const screen = document.getElementById('logContent');
        if (!screen) return;
        screen.classList.remove('hidden');

        const nameEl = document.getElementById('studentName');
        const progEl = document.getElementById('studentProgram');
        if (nameEl) nameEl.textContent = student.name;
        if (progEl) progEl.textContent = student.Course || student.course || 'N/A';

        // Reset visibility to hidden when entering history screen
        this.isIdVisible = false;
        this.isHistoryVisible = false;
        this.updateIdDisplay();
        this.updateHistoryVisibility();

        this.resetIdleTimer();
        this.setupLucide();
    }

    async fetchAndRenderLogs(studentNumber) {
        const tableBody = document.getElementById('studentTableBody');
        const noLogs    = document.getElementById('noLogsMessage');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-8 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        <p class="text-slate-400 font-bold text-sm">Loading history…</p>
                    </div>
                </td>
            </tr>
        `;

        try {
            const res  = await fetch(`/api/logs?studentNumber=${studentNumber}&limit=5`);
            const logs = await res.json();

            if (!logs || logs.length === 0) {
                tableBody.innerHTML = '';
                noLogs?.classList.remove('hidden');
            } else {
                noLogs?.classList.add('hidden');
                tableBody.innerHTML = logs.map(log => {
                    const date = new Date(log.timeIn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

                    // ── Status: In / Pending / Out ──
                    let statusBadge = '';
                    const docStatus = log.docStatus || (log.timeOut ? 'Out' : 'Pending');
                    if (docStatus === 'In' || docStatus === 'incoming') {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800"><div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Incoming</span>`;
                    } else if (docStatus === 'Pending' || docStatus === 'pending' || docStatus === 'in-service') {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800 status-pending-blink"><div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>Pending</span>`;
                    } else {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Out / Done</span>`;
                    }

                    let proofBtn = '';
                    if (log.proofImage) {
                        proofBtn = `<button onclick="window.kioskManager.viewProof('${log.proofImage}')" class="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 px-3 py-1.5 rounded-full transition-all border border-violet-100 dark:border-violet-900/50"><i data-lucide="file-check" class="w-3 h-3"></i> View Proof</button>`;
                    }

                    return `
                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                            <td class="px-8 py-5 font-bold text-slate-500 dark:text-slate-400 text-xs">${date}</td>
                            <td class="px-6 py-5">
                                <span class="block font-black text-slate-800 dark:text-white text-sm">${log.activity || '—'}</span>
                                ${proofBtn}
                            </td>
                            <td class="px-6 py-5 text-center">${statusBadge}</td>
                            <td class="px-8 py-5 text-right font-bold text-slate-500 dark:text-slate-300 text-xs">${log.staff || '---'}</td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (e) {
            console.error('Failed to fetch logs:', e);
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-bold">Failed to load history.</td></tr>`;
        }
        this.setupLucide();
    }

    // ── Proof viewer ───────────────────────────────────────────
    viewProof(url) {
        const modal  = document.getElementById('proofViewerModal');
        const img    = document.getElementById('proofImageElement');
        const iframe = document.getElementById('proofPdfElement');
        if (!modal) return;

        if (url.toLowerCase().endsWith('.pdf')) {
            img?.classList.add('hidden');
            if (iframe) { iframe.src = url; iframe.classList.remove('hidden'); }
        } else {
            iframe?.classList.add('hidden');
            if (img) { img.src = url; img.classList.remove('hidden'); }
        }
        modal.classList.remove('hidden');
        this.setupLucide();
    }
}

// Global instance
window.kioskManager = new StudentKioskManager();
