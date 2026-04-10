import { loadSystemSettings, applyThemeFromStorage } from './settings.js';
import OfflineRegistry from './offline-registry.js';

// Apply saved theme immediately
applyThemeFromStorage();

class VisitorKioskManager {
    constructor() {
        this.visitorName = '';
        this.visitorOrganization = '';
        this.visitorContact = '';
        this.selectedPurpose = '';
        this.selectedFaculty = '';
        this.officeId = 'engineering-office'; // default
        this.systemSettings = {};
        this.offlineRegistry = new OfflineRegistry();
        
        // Idle timer state
        this.idleTimeout = null;
        this.idleDuration = 60000; // 60 seconds
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupLucide();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        this.showStep('visitorInfoStep');
        this.resetIdleTimer();
    }

    async loadSettings() {
        try {
            this.systemSettings = await loadSystemSettings() || {};
            if (this.systemSettings.officeId) this.officeId = this.systemSettings.officeId;
        } catch (e) {
            console.warn('⚠️ Could not load system settings:', e.message);
        }
    }

    setupLucide() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('liveClock');
        const dateEl = document.getElementById('liveDate');
        
        if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const template = document.getElementById('toastTemplate');
        if (!container || !template) return;

        const toast = template.content.cloneNode(true).firstElementChild;
        const msgEl = toast.querySelector('.toast-message');
        if (msgEl) msgEl.textContent = message;

        const icon = toast.querySelector('.toast-icon');
        if (icon && type === 'error') {
            icon.classList.replace('text-violet-400', 'text-red-400');
            toast.classList.replace('bg-slate-900/95', 'bg-red-600/95');
        }

        container.appendChild(toast);
        this.setupLucide();

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-8');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    resetIdleTimer() {
        if (this.idleTimeout) clearTimeout(this.idleTimeout);
        this.hideIdleOverlay();

        // Only start idle timer if NOT on the first step
        const currentStep = document.querySelector('main > div:not(.hidden)')?.id;
        if (currentStep && currentStep !== 'visitorInfoStep' && currentStep !== 'completionStep') {
            this.idleTimeout = setTimeout(() => this.showIdleOverlay(), this.idleDuration);
        }
    }

    showIdleOverlay() {
        const overlay = document.getElementById('idleOverlay');
        if (overlay) {
            overlay.classList.add('active');
            // Auto-reset after overlay duration
            this.autoResetTimeout = setTimeout(() => window.location.href = 'index.html', 30000);
        }
    }

    hideIdleOverlay() {
        const overlay = document.getElementById('idleOverlay');
        if (overlay) overlay.classList.remove('active');
        if (this.autoResetTimeout) clearTimeout(this.autoResetTimeout);
    }

    setupEventListeners() {
        // Global interaction listener for idle timer
        document.addEventListener('click', () => this.resetIdleTimer());
        document.addEventListener('keypress', () => this.resetIdleTimer());

        // Resume session
        document.getElementById('resumeSessionBtn')?.addEventListener('click', () => this.resetIdleTimer());

        // Step 1 -> Step 2
        document.getElementById('toPurposeBtn')?.addEventListener('click', () => {
            this.visitorName = document.getElementById('visitorName')?.value.trim();
            this.visitorOrganization = document.getElementById('visitorOrganization')?.value.trim();
            this.visitorContact = document.getElementById('visitorContact')?.value.trim();

            if (!this.visitorName) {
                this.showToast('Please enter your full name.', 'error');
                return;
            }
            this.showStep('purposeStep');
            this.renderPurposes();
            this.resetIdleTimer();
        });

        // Back Buttons
        document.getElementById('backToInfoBtn')?.addEventListener('click', () => this.showStep('visitorInfoStep'));
        document.getElementById('backToPurposeBtn')?.addEventListener('click', () => this.showStep('purposeStep'));
    }

    showStep(stepId) {
        ['visitorInfoStep', 'purposeStep', 'facultyStep', 'completionStep'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById(stepId)?.classList.remove('hidden');

        // Update indicators
        const indicator = document.getElementById('stepIndicator');
        if (stepId === 'visitorInfoStep' || stepId === 'completionStep') {
            indicator?.classList.add('hidden');
        } else {
            indicator?.classList.remove('hidden');
            this.updateStepUI(stepId);
        }

        this.setupLucide();
    }

    updateStepUI(stepId) {
        const dots = [1, 2, 3];
        const lines = [1, 2];
        const stepMap = { 'visitorInfoStep': 1, 'purposeStep': 2, 'facultyStep': 3 };
        const currentStep = stepMap[stepId] || 1;

        dots.forEach(d => {
            const dot = document.getElementById(`step${d}dot`);
            if (d < currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-emerald-500 text-white shadow-lg';
                dot.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
            } else if (d === currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-violet-600 text-white shadow-lg shadow-violet-200';
                dot.textContent = d;
            } else {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-500';
                dot.textContent = d;
            }
        });

        lines.forEach(l => {
            const line = document.getElementById(`stepLine${l}`);
            if (l < currentStep) line.classList.add('done');
            else line.classList.remove('done');
        });
        
        this.setupLucide();
    }

    renderPurposes() {
        const grid = document.getElementById('purposeGrid');
        if (!grid) return;

        const purposes = [
            { id: 'Meeting', icon: 'users', label: 'Meeting / Consultation' },
            { id: 'Delivery', icon: 'package', label: 'Delivery / Courier' },
            { id: 'Maintenance', icon: 'wrench', label: 'Maintenance / Tech' },
            { id: 'Inquiry', icon: 'messages-square', label: 'General Inquiry' },
            { id: 'Event', icon: 'calendar', label: 'School Event' },
            { id: 'Other', icon: 'more-horizontal', label: 'Other' }
        ];

        grid.innerHTML = purposes.map(p => `
            <button onclick="window.kioskManager.selectPurpose('${p.label.replace(/'/g, "\\'")}')"
                class="purpose-card group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:border-violet-500 transition-all flex flex-col items-center gap-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center transition-all shadow-sm group-hover:scale-110">
                    <i data-lucide="${p.icon}" class="w-8 h-8"></i>
                </div>
                <p class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">${p.label}</p>
            </button>
        `).join('');

        this.setupLucide();
    }

    selectPurpose(purpose) {
        this.selectedPurpose = purpose;
        this.showStep('facultyStep');
        this.renderFaculty();
    }

    async renderFaculty() {
        const grid = document.getElementById('facultyGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center py-12 gap-4">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-violet-500 border-t-transparent"></div>
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Personnel...</p>
            </div>
        `;

        try {
            const res = await fetch('/api/faculty');
            const faculties = await res.json();

            if (!faculties || faculties.length === 0) {
                grid.innerHTML = '<p class="text-slate-400 font-bold col-span-full py-10 text-center uppercase tracking-widest">No personnel available.</p>';
            } else {
                grid.innerHTML = faculties.map(f => `
                    <button onclick="window.kioskManager.submitVisit('${f.name.replace(/'/g, "\\'")}')"
                        class="purpose-card group bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:border-violet-500 transition-all flex flex-col items-center gap-4 text-center">
                        <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-violet-500 transition-colors">
                            ${f.photoURL ? `<img src="${f.photoURL}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-violet-50 flex items-center justify-center text-violet-500 font-bold text-2xl">${f.name.charAt(0)}</div>`}
                        </div>
                        <div>
                            <p class="text-lg font-black text-slate-900 dark:text-white leading-tight">${f.name}</p>
                            <p class="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">${f.position || 'Staff'}</p>
                        </div>
                    </button>
                `).join('');
                
                // General "Skip/General" option
                grid.innerHTML += `
                    <button onclick="window.kioskManager.submitVisit('General Office')"
                        class="purpose-card group bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-500 transition-all flex flex-col items-center justify-center gap-4 text-center">
                        <div class="w-20 h-20 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <i data-lucide="building-2" class="w-10 h-10"></i>
                        </div>
                        <p class="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">General Office</p>
                    </button>
                `;
            }
        } catch (e) {
            console.error('Faculty fetch error:', e);
            grid.innerHTML = '<p class="text-red-500 font-bold col-span-full py-10 text-center uppercase">Failed to load staff.</p>';
        }

        this.setupLucide();
    }

    async submitVisit(facultyName) {
        this.selectedFaculty = facultyName;

        const visitData = {
            logData: {
                studentNumber: 'VISITOR_VISIT',
                studentName: this.visitorName,
                studentId: this.visitorOrganization || 'Visitor',
                activity: `[Visitor] ${this.selectedPurpose}`,
                staff: this.selectedFaculty,
                yearLevel: this.visitorContact || 'Guest',
                course: this.visitorOrganization || 'N/A',
                date: new Date().toISOString().split('T')[0]
            },
            officeId: this.officeId
        };

        try {
            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visitData)
            });

            if (response.ok) {
                this.showStep('completionStep');
            } else {
                throw new Error('Log failed');
            }
        } catch (e) {
            console.warn('❌ Visit log failed, queuing offline:', e);
            if (this.offlineRegistry) this.offlineRegistry.queueLog(visitData);
            this.showStep('completionStep');
            this.showToast('Offline mode active.', 'warning');
        }
    }
}

window.kioskManager = new VisitorKioskManager();
