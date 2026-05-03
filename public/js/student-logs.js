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
        short: 'Clearance',
        icon: 'check-square',
        color: 'lime',
        category: 'clearance',
        description: 'Departmental clearance'
    },
    {
        name: 'Enrollment',
        short: 'Enroll',
        icon: 'clipboard-list',
        color: 'blue',
        category: 'form',
        description: 'Student Request'
    },
    {
        name: 'Inquiries',
        short: 'Inquiry',
        icon: 'messages-square',
        color: 'emerald',
        category: 'other',
        description: 'Student Request'
    },
    {
        name: 'Document Request',
        short: 'Request',
        icon: 'folders',
        color: 'indigo',
        category: 'other',
        description: 'Student Request'
    },

    {
        name: 'Consultation',
        short: 'Consult',
        icon: 'message-square-text',
        color: 'violet',
        category: 'other',
        description: 'Student Request'
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

const SUBMISSION_DOCUMENT_TYPES = [
    {
        name: 'Semestral Clearance Slip',
        short: 'Clearance',
        icon: 'check-square',
        color: 'lime',
        category: 'submission',
        description: 'End-of-semester clearance'
    },
    {
        name: "Dean's Lister Application Form",
        short: "Dean's List",
        icon: 'award',
        color: 'indigo',
        category: 'submission',
        description: 'Academic honor application'
    },
    {
        name: 'Concept Paper',
        short: 'Concept',
        icon: 'lightbulb',
        color: 'amber',
        category: 'submission',
        description: 'Research / project proposal'
    },
    {
        name: 'Financial Reports',
        short: 'Financial',
        icon: 'bar-chart-3',
        color: 'emerald',
        category: 'submission',
        description: 'Organization financial record'
    },
    {
        name: 'Board Resolutions',
        short: 'Resolution',
        icon: 'gavel',
        color: 'rose',
        category: 'submission',
        description: 'Official board decisions'
    },
    {
        name: 'Activity Reports',
        short: 'Activity',
        icon: 'clipboard-list',
        color: 'blue',
        category: 'submission',
        description: 'Event / activity summary'
    },
    {
        name: 'After Documentation',
        short: 'After Doc',
        icon: 'file-check',
        color: 'slate',
        category: 'submission',
        description: 'Post-event documentation'
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

function _normalizeActivities(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(item => {
                if (typeof item === 'string') return { name: item, options: [] };
                if (!item || typeof item !== 'object') return null;
                const name = String(item.name || '').trim();
                if (!name) return null;
                const options = Array.isArray(item.options) ? item.options.map(x => String(x)).filter(Boolean) : [];
                return { name, options };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function _docShortName(name) {
    const s = String(name || '').trim();
    const match = s.match(/\(([^)]+)\)\s*$/);
    if (match && match[1]) return match[1].slice(0, 10);
    return s.length <= 12 ? s : s.slice(0, 12) + '…';
}

function _parseStringArray(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed)) return [];
        return parsed.map(x => String(x || '').trim()).filter(Boolean);
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY TYPES — top-level "why are you here?" cards
// ─────────────────────────────────────────────────────────────
const ACTIVITY_TYPES = [
    {
        name: 'Document Request',
        short: 'Document Request',
        icon: 'file-text',
        color: 'blue',
        description: 'Request a specific document'
    },
    {
        name: 'Document Submission',
        short: 'Submission',
        icon: 'file-up',
        color: 'amber',
        description: 'Pass / submit a document'
    },
    {
        name: 'Document Pick-up',
        short: 'Pick-up',
        icon: 'package-check',
        color: 'emerald',
        description: 'Claim your ready document'
    },
    {
        name: 'Consultation',
        short: 'Consultation',
        icon: 'message-square-text',
        color: 'violet',
        description: 'Talk to a faculty / adviser'
    },

    {
        name: 'Enrollment',
        short: 'Enrollment',
        icon: 'clipboard-list',
        color: 'indigo',
        description: 'Enrollment-related concerns'
    },
    {
        name: 'Inquiries',
        short: 'Inquiry',
        icon: 'messages-square',
        color: 'cyan',
        description: 'General questions'
    },
    {
        name: 'Others / Custom Request',
        short: 'Others',
        icon: 'plus-circle',
        color: 'slate',
        description: 'Specify your own need'
    }
];

// ─────────────────────────────────────────────────────────────
class StudentKioskManager {
    constructor() {
        this.currentStudent = null;
        this.selectedDocument = null;    // full doc object from DOCUMENT_TYPES
        this.selectedActivity = null;    // name of the top-level activity (Request vs Submission)
        this.selectedFaculty  = null;
        this.barcodeBuffer    = '';
        this.lastBarcodeKeyTime = 0;
        this.systemSettings   = {};
        this.officeId         = 'engineering-office';
        this.selectedPickupDoc = null; // for pick-up selection
        this.selectedPickupRequestId = null; // request log id being claimed

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

        const isSubmission = this.selectedActivity === 'Document Submission';
        const step3Container = document.getElementById('step3Container');
        const line3 = document.getElementById('stepLine3');

        if (isSubmission) {
            step3Container?.classList.add('hidden');
            line3?.classList.add('hidden');
        } else {
            step3Container?.classList.remove('hidden');
            line3?.classList.remove('hidden');
        }

        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(dots[i]);
            if (!dot) continue;
            
            let displayNum = i;
            if (isSubmission && i === 4) displayNum = 3;

            if (i < step) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-emerald-500 text-white shadow-lg shadow-emerald-200';
                dot.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
            } else if (i === step) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-blue-600 text-white shadow-lg shadow-blue-200';
                dot.textContent = displayNum;
            } else {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 bg-slate-200 dark:bg-slate-700 text-slate-500';
                dot.textContent = displayNum;
            }
        }

        for (let i = 1; i <= 3; i++) {
            const line = document.getElementById(lines[i]);
            if (!line) continue;
            if (i < step) {
                line.classList.add('done');
            } else {
                line.classList.remove('done');
            }
        }
    }

    // ── Help: hide all screens ─────────────────────────────────
    hideAllScreens() {
        const screens = [
            'scanPrompt', 'landingSelection', 'activitySelection', 'documentSelection',
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
            if (this.currentStudent) this.showActivitySelection();
        });
        document.getElementById('viewHistoryLandingBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showStudentHistory(this.currentStudent);
        });
        document.getElementById('cancelLandingBtn')?.addEventListener('click', () => this.resetUI());

        // ── Activity selection ──
        document.getElementById('cancelActivityBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showLandingSelection(this.currentStudent);
        });

        // ── Document selection ──
        document.getElementById('cancelDocBtn')?.addEventListener('click', () => {
            if (this.currentStudent) this.showActivitySelection();
        });

        // Document type dropdown
        document.getElementById('documentTypeNextBtn')?.addEventListener('click', () => {
            const select = document.getElementById('documentTypeSelect');
            const val = String(select?.value || '').trim();
            if (!val) { this.showToast('Please select a document type.', 'warning'); return; }
            this.selectDocument(val);
        });
        document.getElementById('documentTypeSelect')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('documentTypeNextBtn')?.click();
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

        // ── Document Request Title ──
        document.getElementById('submitDocRequestBtn')?.addEventListener('click', () => {
            const input = document.getElementById('docRequestTitleInput');
            const val = input?.value.trim();
            if (!val) { this.showToast('Please enter a document title.', 'warning'); return; }
            this.selectedDocument = { 
                name: `Document Request: ${val}`, 
                short: 'Request', 
                icon: 'folders', 
                color: 'indigo', 
                category: 'other' 
            };
            this.showFacultySelection();
        });
        document.getElementById('docRequestTitleInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('submitDocRequestBtn')?.click();
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
        document.getElementById('ignoreTimeOutBtn')?.addEventListener('click',  () => this.showActivitySelection());
        document.getElementById('cancelTimeOutBtn')?.addEventListener('click',  () => this.resetUI());

        // ── History screen ──
        document.getElementById('proceedToTransactionBtn')?.addEventListener('click', () => this.showActivitySelection());
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

        // ── Pick-up Confirmation Modal ────
        document.getElementById('confirmPickupBtn')?.addEventListener('click', () => {
            if (this.selectedPickupDoc) {
                this.selectedDocument = { 
                    name: `Document Pick-up: ${this.selectedPickupDoc}`, 
                    short: 'Pick-up', 
                    icon: 'file-check', 
                    color: 'emerald', 
                    category: 'other' 
                };
            }
            document.getElementById('pickupConfirmationModal')?.classList.add('hidden');
            
            // Skip staff selection for document pick-ups
            this.logVisit('General Staff');
        });
        document.getElementById('cancelPickupBtn')?.addEventListener('click', () => {
            document.getElementById('pickupConfirmationModal')?.classList.add('hidden');
            this.selectedPickupDoc = null;
            this.selectedPickupRequestId = null;
        });

        // ── Success screen ────
        document.getElementById('anotherTransactionBtn')?.addEventListener('click', () => {
            clearInterval(this._countdownTimer);
            this.selectedDocument = null;
            this.selectedFaculty = null;
            this.selectedPickupDoc = null;
            this.selectedPickupRequestId = null;
            this.handleScan(this.currentStudent.id || this.currentStudent.studentId);
        });

        document.getElementById('finishTransactionBtn')?.addEventListener('click', () => {
            clearInterval(this._countdownTimer);
            this.resetUI();
        });
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

            if (response.status === 404) {
                this.showToast('Student not registered. Please see staff.', 'error');
            } else if (response.status === 403) {
                this.showToast('Account pending approval. Please see office staff.', 'warning');
            } else if (response.status === 409) {
                const data = await response.json().catch(() => ({}));
                this.showToast(data?.error || 'Student ID conflict. Please see staff.', 'error');
            } else {
                this.showToast('Lookup failed. Please try again.', 'error');
            }
        } catch (err) {
            console.warn('Manual lookup failed:', err);
            this.showToast('Server unreachable. Please use your card or see staff.', 'error');
        }

        // Keep the manual form open so the user can correct the ID.
        document.getElementById('manualId')?.focus();
    }

    // ── Scan handler ───────────────────────────────────────────
    async handleScan(id) {
        try {
            const response = await fetch(`/api/students/${id}?officeId=${this.officeId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    this.showToast('Student not registered. Please see staff.', 'error');
                } else if (response.status === 403) {
                    this.showToast('Account pending approval. Please see office staff.', 'warning');
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

        this.selectedDocument = null;
        this.selectedFaculty  = null;
        this.selectedPickupDoc = null;
        this.selectedPickupRequestId = null;
        this.barcodeBuffer    = '';
        this.isIdVisible      = false;
        this.isHistoryVisible = false;

        this.hideAllScreens();
        document.getElementById('scanPrompt')?.classList.remove('hidden');
        document.getElementById('manualEntryInitial')?.classList.remove('hidden');
        document.getElementById('manualEntryForm')?.classList.add('hidden');
        document.getElementById('otherDocSection')?.classList.add('hidden');
        document.getElementById('docRequestSection')?.classList.add('hidden');
        
        // Hide modals
        document.getElementById('multiSessionSignOutModal')?.classList.add('hidden');
        document.getElementById('pickupConfirmationModal')?.classList.add('hidden');

        const customDocInput = document.getElementById('customDocInput');
        if (customDocInput) customDocInput.value = '';
        const docReqInput = document.getElementById('docRequestTitleInput');
        if (docReqInput) docReqInput.value = '';
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
        function updateClock() {
            const now = new Date();
            const timeEl = document.getElementById('liveClock');
            const dateEl = document.getElementById('liveDate');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
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

        const titleEl = document.getElementById('documentSelectionTitle');
        const isSubmission = this.selectedActivity === 'Document Submission';
        if (titleEl) titleEl.textContent = isSubmission ? 'What document are you submitting?' : 'Which document do you need?';

        const nameEl = document.getElementById('docStudentName');
        if (nameEl) nameEl.textContent = this.currentStudent?.name?.split(' ')[0] || 'Student';

        // Reset dropdown + sections
        const docSelect = document.getElementById('documentTypeSelect');
        if (docSelect) docSelect.value = '';

        document.getElementById('otherDocSection')?.classList.add('hidden');
        const customInput = document.getElementById('customDocInput');
        if (customInput) customInput.value = '';

        document.getElementById('docRequestSection')?.classList.add('hidden');
        const docReqInput = document.getElementById('docRequestTitleInput');
        if (docReqInput) docReqInput.value = '';

        // FIX: Ensure the grid is unhidden if we are returning from another step
        document.getElementById('documentGrid')?.classList.remove('hidden');

        this.renderDocumentTypes();
        this.resetIdleTimer();
        this.setupLucide();
    }

    // ── Show: Activity Selection (new Step 2) ─────────────────
    showActivitySelection() {
        this.hideAllScreens();
        this.updateStepIndicator(2);

        const screen = document.getElementById('activitySelection');
        if (!screen) return;
        screen.classList.remove('hidden');

        const nameEl = document.getElementById('actStudentName');
        if (nameEl) nameEl.textContent = this.currentStudent?.name?.split(' ')[0] || 'Student';

        this.renderActivityCards();
        this.resetIdleTimer();
        this.setupLucide();
    }

    renderActivityCards() {
        // Get any custom activities from admin settings and merge
        let activities = [...ACTIVITY_TYPES];
        try {
            if (this.systemSettings.kioskActivities) {
                const custom = _parseStringArray(this.systemSettings.kioskActivities);
                custom.forEach(name => {
                    if (!activities.find(a => a.name === name)) {
                        activities.splice(activities.length - 1, 0, {
                            name, short: name, icon: 'file', color: 'slate', description: 'Student Request'
                        });
                    }
                });
            }
        } catch {}

        const grid = document.getElementById('activityCardGrid');
        if (!grid) return;

        grid.innerHTML = activities.map(act => {
            const colors = COLOR_MAP[act.color] || COLOR_MAP['slate'];
            return `
                <button type="button" class="activity-card kiosk-btn relative bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-2 hover:border-slate-300 dark:hover:border-slate-500 group active:scale-95 w-full" data-value="${this.escape(act.name)}">
                    <div class="w-20 h-20 rounded-[1.8rem] ${colors.bg} ${colors.text} flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-sm border border-white/50 dark:border-white/5">
                        <i data-lucide="${act.icon}" class="w-10 h-10 transition-all group-hover:drop-shadow-md"></i>
                    </div>
                    <h3 class="font-black text-slate-800 dark:text-white text-xl leading-tight mb-2 tracking-tight">${act.short}</h3>
                    <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-snug">${act.description}</p>
                </button>
            `;
        }).join('');

        grid.querySelectorAll('.activity-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.value;
                const activityObj = activities.find(a => a.name === val);
                
                if (val === 'Document Request' || val === 'Document Submission') {
                    // Go to the document sub-selection screen
                    this.selectedActivity = val;
                    this.selectedDocument = null;
                    this.showDocumentSelection();
                } else if (val === 'Document Pick-up') {
                    this.selectedDocument = DOCUMENT_TYPES.find(d => d.name === 'Document Pick-up')
                        || { name: 'Document Pick-up', short: 'Pick-up', icon: 'package-check', color: 'emerald', category: 'other' };
                    this.showPickupSelection();
                } else if (val === 'Others / Custom Request') {
                    // Show the custom input directly
                    this.selectedDocument = null;
                    this.showDocumentSelection();
                    // Trigger the "Others" path
                    setTimeout(() => {
                        document.getElementById('documentGrid')?.classList.add('hidden');
                        document.getElementById('otherDocSection')?.classList.remove('hidden');
                        document.getElementById('customDocInput')?.focus();
                    }, 50);
                } else {
                    // Non-document activities go straight to staff
                    this.selectedDocument = { 
                        name: val, 
                        short: activityObj?.short || val, 
                        icon: activityObj?.icon || 'file', 
                        color: activityObj?.color || 'slate', 
                        category: 'activity' 
                    };
                    this.showFacultySelection();
                }
            });
        });

        this.setupLucide();
    }


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

    // ── Render: Document type dropdown ─────────────────────────
    renderDocumentTypes() {
        const select = document.getElementById('documentTypeSelect');
        if (!select) return;

        // Highest priority: kiosk-specific Student transaction list
        try {
            const studentTx = _parseStringArray(this.systemSettings.kioskStudentTransactions);
            const clean = studentTx
                .map(x => String(x || '').trim())
                .filter(Boolean)
                .filter(x => x.toLowerCase() !== 'others' && x.toLowerCase() !== 'other');

            if (clean.length) {
                let docs = clean.map(name => {
                    let icon = 'file-text';
                    let color = 'slate';
                    const checkName = name.toLowerCase();

                    if (checkName.includes('certificate') || checkName.includes('cert.')) {
                        icon = 'file-badge'; color = 'blue';
                    } else if (checkName.includes('transcript') || checkName.includes('tor')) {
                        icon = 'scroll'; color = 'violet';
                    } else if (checkName.includes('registration') || checkName.includes('cor')) {
                        icon = 'file-check'; color = 'emerald';
                    } else if (checkName.includes('grades') || checkName.includes('gwa') || checkName.includes('cog')) {
                        icon = 'award'; color = 'indigo';
                    } else if (checkName.includes('clearance')) {
                        icon = 'check-square'; color = 'lime';
                    } else if (checkName.includes('honorable') || checkName.includes('dismissal')) {
                        icon = 'door-open'; color = 'orange';
                    } else if (checkName.includes('promissory') || checkName.includes('note')) {
                        icon = 'file-signature'; color = 'pink';
                    }

                    return {
                        name,
                        short: _docShortName(name),
                        icon,
                        color,
                        category: 'custom',
                        description: 'Student Transaction'
                    };
                }).filter(d => d.name !== 'Document Pick-up');
                docs.push({
                    name: 'Others / Custom Request',
                    short: 'Others',
                    icon: 'plus-circle',
                    color: 'slate',
                    category: 'other',
                    description: 'Specify your own need'
                });

                select.innerHTML = [
                    `<option value="">Select a document type…</option>`,
                    ...docs.map(doc => `<option value="${this.escape(doc.name)}">${doc.name}</option>`)
                ].join('');
                return;
            }
        } catch {
            // fall back below
        }

        let docs = null;

        // Specialized list for Document Submission
        if (this.selectedActivity === 'Document Submission') {
            docs = [...SUBMISSION_DOCUMENT_TYPES];
            docs.push({
                name: 'Others / Custom Request',
                short: 'Others',
                icon: 'plus-circle',
                color: 'slate',
                category: 'other',
                description: 'Specify your own need'
            });
            
            select.innerHTML = [
                `<option value="">Select a document type…</option>`,
                ...docs.map(doc => `<option value="${this.escape(doc.name)}">${doc.name}</option>`)
            ].join('');
        }

        // Fallback: original curated catalog, plus extra admin-added activities (legacy support)
        if (!docs) {
            docs = [...DOCUMENT_TYPES];
            try {
                if (this.systemSettings.activities) {
                    const parsed = JSON.parse(this.systemSettings.activities);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(a => {
                            const name = typeof a === 'object' ? a.name : a;
                            if (!name) return;
                            const lower = String(name).toLowerCase();
                            if (lower === 'others' || lower === 'other') return;
                            if (!docs.find(d => d.name === name)) {
                                // Smart icon & color mapping for common admin-added activities
                                let icon = 'file-text';
                                let color = 'slate';
                                const checkName = lower;
                                
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
        }

        select.innerHTML = [
            `<option value="">Select a document type…</option>`,
            ...docs.map(doc => `<option value="${this.escape(doc.name)}">${doc.name}</option>`)
        ].join('');

        // Generate the rich card grid
        const grid = document.getElementById('documentTypeCardGrid');
        if (grid) {
            grid.innerHTML = docs.map(doc => {
                const colors = COLOR_MAP[doc.color] || COLOR_MAP['slate'];
                return `
                    <button type="button" class="doc-card kiosk-btn relative bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-2 hover:border-slate-300 dark:hover:border-slate-500 group active:scale-95 w-full" data-value="${this.escape(doc.name)}">
                        
                        <div class="w-20 h-20 rounded-[1.8rem] ${colors.bg} ${colors.text} flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-sm border border-white/50 dark:border-white/5">
                            <i data-lucide="${doc.icon}" class="w-10 h-10 transition-all group-hover:drop-shadow-md"></i>
                        </div>
                        
                        <h3 class="font-black text-slate-800 dark:text-white text-xl leading-tight mb-2 tracking-tight">${doc.short}</h3>
                        <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-snug">${doc.description}</p>
                    </button>
                `;
            }).join('');
            
            // Add click listeners to cards
            grid.querySelectorAll('.doc-card').forEach(btn => {
                btn.addEventListener('click', () => {
                    select.value = btn.dataset.value;
                    document.getElementById('documentTypeNextBtn')?.click(); // Auto-advance!
                });
            });
            this.setupLucide();
            
            // Hide the next button since cards auto-advance
            document.getElementById('documentTypeNextBtn')?.classList.add('hidden');
        }
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

        if (docName === 'Document Request') {
            document.getElementById('documentGrid')?.classList.add('hidden');
            const section = document.getElementById('docRequestSection');
            if (section) {
                section.classList.remove('hidden');
                section.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('docRequestTitleInput')?.focus();
            }
            return;
        }

        this.selectedDocument = DOCUMENT_TYPES.find(d => d.name === docName)
            || SUBMISSION_DOCUMENT_TYPES.find(d => d.name === docName)
            || { name: docName, short: docName, icon: 'file', color: 'slate', category: 'custom' };

        // ── Check if it's Document Pick-up ──
        if (docName === 'Document Pick-up') {
            this.showPickupSelection();
            return;
        }

        // Re-show grid if it was hidden by "others" path
        document.getElementById('documentGrid')?.classList.remove('hidden');
        document.getElementById('otherDocSection')?.classList.add('hidden');
        document.getElementById('docRequestSection')?.classList.add('hidden');

        if (this.selectedActivity === 'Document Submission') {
            this.logVisit('Superadmin');
            return;
        }

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

            let html = `
                <button onclick="window.kioskManager.logVisit('Superadmin')"
                    class="doc-card kiosk-btn relative bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-2 hover:border-blue-400 dark:hover:border-blue-500 group active:scale-95 w-full">
                    <div class="w-20 h-20 rounded-[1.8rem] bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-white/50 dark:border-white/5 overflow-hidden">
                        <i data-lucide="user-cog" class="w-10 h-10 transition-all group-hover:drop-shadow-md"></i>
                    </div>
                    <h3 class="font-black text-slate-800 dark:text-white text-lg leading-tight mb-2 tracking-tight">Superadmin</h3>
                    <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-snug">Office Secretary</p>
                </button>
            `;
            if (!faculties || faculties.length === 0) {
                // Keep html with Secretary only
            } else {
                html += faculties.map(f => `
                    <button onclick="window.kioskManager.logVisit('${this.escape(f.name)}')"
                        class="doc-card kiosk-btn relative bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-2 hover:border-emerald-300 dark:hover:border-emerald-500 group active:scale-95 w-full">
                        <div class="w-20 h-20 rounded-[1.8rem] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-sm border border-white/50 dark:border-white/5 overflow-hidden">
                            ${f.photoURL
                                ? `<img src="${f.photoURL}" class="w-full h-full object-cover">`
                                : `<div class="w-full h-full flex items-center justify-center font-black text-3xl">${(f.name || 'S').charAt(0).toUpperCase()}</div>`
                            }
                        </div>
                        <h3 class="font-black text-slate-800 dark:text-white text-lg leading-tight mb-2 tracking-tight truncate w-full px-2">${f.name}</h3>
                        <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-snug">${f.position || 'Staff'}</p>
                    </button>
                `).join('');
            }

            // Skip / General Staff option
            html += `
                <button onclick="window.kioskManager.logVisit('General Staff')"
                    class="doc-card kiosk-btn relative bg-slate-50 dark:bg-slate-800/60 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-600 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-slate-400 dark:hover:border-slate-500 group active:scale-95 w-full">
                    <div class="w-20 h-20 rounded-[1.8rem] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-white/50 dark:border-white/5">
                        <i data-lucide="users" class="w-10 h-10 transition-all group-hover:drop-shadow-md"></i>
                    </div>
                    <h3 class="font-black text-slate-600 dark:text-slate-300 text-lg leading-tight mb-2 tracking-tight">Skip Selection</h3>
                    <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-snug">General Staff</p>
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
            docStatus:     this.selectedActivity === 'Document Submission' ? 'In' : 'In',
            status:        this.selectedActivity === 'Document Submission' ? 'completed' : 'pending',
            timeOut:       this.selectedActivity === 'Document Submission' ? new Date().toISOString() : null
        };

        try {
            // If this is a Document Pick-up, mark the selected completed request as released.
            const isPickup = String(this.selectedDocument?.name || '').toLowerCase().startsWith('document pick-up');
            if (isPickup && this.selectedPickupRequestId) {
                const claimRes = await fetch(`/api/logs/${this.selectedPickupRequestId}/claim`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentNumber: this.currentStudent?.id,
                        officeId: this.officeId
                    })
                });

                if (!claimRes.ok) {
                    const data = await claimRes.json().catch(() => ({}));
                    this.showToast(data?.error || 'Unable to claim that document. Please see staff.', 'error');
                    return;
                }
            }
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

        const isSubmission = this.selectedActivity === 'Document Submission';

        // ── Update text fields ──
        const successDocName = document.getElementById('successDocName');
        const successDocType = document.getElementById('successDocType');
        const successStaff   = document.getElementById('successStaff');
        const successTime    = document.getElementById('successTime');

        if (successDocName) successDocName.textContent = logData.activity;
        if (successDocType) successDocType.textContent = logData.activity;
        if (successStaff)   successStaff.textContent   = logData.staff;
        if (successTime)    successTime.textContent     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // ── Heading & subtitle ──
        const heading  = document.getElementById('successHeading');
        const subtitle = document.getElementById('successSubtitle');
        if (isSubmission) {
            if (heading)  heading.textContent  = 'Document Received!';
            if (subtitle) subtitle.innerHTML   = 'Your <span class="text-emerald-600 font-black">' + logData.activity + '</span> has been submitted to the office. You\'re all set!';
        } else {
            if (heading)  heading.textContent  = 'Request Logged!';
            if (subtitle) subtitle.innerHTML   = 'Your <span id="successDocName" class="text-emerald-600 font-black">' + logData.activity + '</span> has been recorded. Please wait for staff assistance.';
        }

        // ── Status badge ──
        const badge   = document.getElementById('successStatusBadge');
        const dot     = document.getElementById('successStatusDot');
        const badgeTxt = document.getElementById('successStatusText');
        if (badge && dot && badgeTxt) {
            if (isSubmission) {
                badge.className = badge.className
                    .replace('bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 status-pending-blink',
                             'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800');
                dot.className = dot.className.replace('bg-amber-500', 'bg-emerald-500');
                badgeTxt.textContent = 'Submitted';
            } else {
                badge.className = badge.className
                    .replace('bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                             'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 status-pending-blink');
                dot.className = dot.className.replace('bg-emerald-500', 'bg-amber-500');
                badgeTxt.textContent = 'Incoming / Pending';
            }
        }

        // ── Staff row visibility ──
        const successStaffRow = document.getElementById('successStaffRow');
        if (successStaffRow) {
            if (isSubmission) {
                successStaffRow.classList.add('hidden');
            } else {
                successStaffRow.classList.remove('hidden');
            }
        }

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

                    // ── Request Status: Pending / Processing / Completed ──
                    let statusBadge = '';
                    const rs = String(log.status || 'pending').toLowerCase();
                    if (rs === 'pending') {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800 status-pending-blink"><div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>Pending</span>`;
                    } else if (rs === 'in-service') {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800"><div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Processing</span>`;
                    } else {
                        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Completed</span>`;
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

    // ── Document Pick-up Selection Logic ──────────────────────
    async showPickupSelection() {
        const modal = document.getElementById('pickupConfirmationModal');
        const list  = document.getElementById('pickupList');
        const confirmBtn = document.getElementById('confirmPickupBtn');
        
        if (!modal || !list) return;

        // Reset state
        this.selectedPickupDoc = null;
        if (confirmBtn) confirmBtn.disabled = true;
        list.innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div></div>`;
        modal.classList.remove('hidden');

        try {
            const res  = await fetch(`/api/logs?studentNumber=${this.currentStudent.id}&limit=50`);
            const logs = await res.json();
            
            // Only show completed document requests that are still physically IN (ready for pick-up)
            const pickableLogs = logs.filter(l => {
                const act = (l.activity || '').toLowerCase();
                
                // Broad check for document-like activities
                const docKeywords = ['document', 'certificate', 'certification', 'transcript', 'tor', 'cor', 'cog', 'clearance', 'form', 'dismissal', 'diploma', 'id card', 'request', 'paper', 'application', 'permit', 'records', 'evaluation', 'eval', 'authentication', 'verification'];
                const excludeKeywords = ['pick-up', 'pickup', 'inquiry', 'consultation', 'inquiries'];
                const isDocReq = act.startsWith('document request') || (docKeywords.some(k => act.includes(k)) && !excludeKeywords.some(k => act.includes(k)));

                const rs = String(l.status || '').toLowerCase();
                const loc = String(l.docStatus || '').toLowerCase();
                return isDocReq && rs === 'completed' && loc === 'in';
            });

            if (pickableLogs.length === 0) {
                list.innerHTML = `
                    <div class="text-center py-8">
                        <div class="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <i data-lucide="info" class="w-6 h-6"></i>
                        </div>
                        <p class="text-slate-500 dark:text-slate-400 font-bold text-sm">No recent document requests found to claim.</p>
                        <button onclick="window.kioskManager.setPickupDocument(null, 'General Document')" class="mt-4 text-blue-500 text-xs font-black uppercase tracking-widest hover:underline">Claim General Document instead</button>
                    </div>
                `;
            } else {
                list.innerHTML = pickableLogs.map(log => {
                    const date = new Date(log.timeIn).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return `
                        <div class="pickup-item flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
                            onclick="window.kioskManager.setPickupDocument('${this.escape(log.id)}', '${this.escape(log.activity)}', this)">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                                <i data-lucide="file-text" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-grow">
                                <p class="font-black text-slate-800 dark:text-white text-sm leading-tight">${log.activity}</p>
                                <p class="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">${date} • ${log.staff || 'Staff'}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            list.innerHTML = `<p class="text-red-500 text-center py-8 font-bold text-sm">Failed to load request history.</p>`;
        }
        
        this.setupLucide();
    }

    setPickupDocument(requestLogId, docTitle, element) {
        this.selectedPickupRequestId = requestLogId || null;
        this.selectedPickupDoc = docTitle;
        
        // UI Feedback: highlight selected item
        document.querySelectorAll('.pickup-item').forEach(el => {
            el.classList.replace('border-blue-500', 'border-slate-100');
            el.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
        });
        
        if (element) {
            element.classList.replace('border-slate-100', 'border-blue-500');
            element.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
        }

        const confirmBtn = document.getElementById('confirmPickupBtn');
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

// Global instance
window.kioskManager = new StudentKioskManager();
