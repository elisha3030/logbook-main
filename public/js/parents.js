import { loadSystemSettings, applyThemeFromStorage } from './settings.js';
import OfflineRegistry from './offline-registry.js';

// Apply saved theme immediately
applyThemeFromStorage();

class ParentsKioskManager {
    constructor() {
        this.parentName = '';
        this.studentName = '';
        this.selectedPurpose = '';
        this.selectedFaculty = '';
        this.officeId = 'engineering-office'; // default
        this.systemSettings = {};
        this.offlineRegistry = new OfflineRegistry();
        
        this.categoryMap = {
            'Enrollment': ['New Enrollment', 'Re-enrollment', 'Cross-enrollment', 'Transfer'],
            'Inquiries': ['Academic Programs', 'Tuition & Fees', 'Scholarship', 'General'],
            'Document Request': ['Enrollment Form', 'Transcript of Records', 'Grades', 'Other Documents'],
            'Consultation': ['Academic Performance', 'Behavioral Concern', 'Career Guidance', 'General Consultation'],
        };

        // Idle timer state
        this.idleTimeout = null;
        this.idleDuration = 60000;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupLucide();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        this.showStep('parentInfoStep');
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
            icon.classList.replace('text-emerald-400', 'text-red-400');
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

        const currentStep = document.querySelector('main > div:not(.hidden)')?.id;
        if (currentStep && currentStep !== 'parentInfoStep' && currentStep !== 'completionStep') {
            this.idleTimeout = setTimeout(() => this.showIdleOverlay(), this.idleDuration);
        }
    }

    showIdleOverlay() {
        const overlay = document.getElementById('idleOverlay');
        if (overlay) {
            overlay.classList.add('active');
            this.autoResetTimeout = setTimeout(() => window.location.href = 'index.html', 30000);
        }
    }

    hideIdleOverlay() {
        const overlay = document.getElementById('idleOverlay');
        if (overlay) overlay.classList.remove('active');
        if (this.autoResetTimeout) clearTimeout(this.autoResetTimeout);
    }

    setupEventListeners() {
        document.addEventListener('click', () => this.resetIdleTimer());
        document.addEventListener('keypress', () => this.resetIdleTimer());
        document.getElementById('resumeSessionBtn')?.addEventListener('click', () => this.resetIdleTimer());

        // Step 1 -> Step 2
        document.getElementById('toPurposeBtn')?.addEventListener('click', () => {
            this.parentName = document.getElementById('parentName')?.value.trim();
            this.studentName = document.getElementById('studentName')?.value.trim();

            if (!this.parentName) {
                this.showToast('Please enter your full name.', 'error');
                return;
            }
            this.showStep('purposeStep');
            this.renderPurposes();
        });

        // Back Buttons
        document.getElementById('backToInfoBtn')?.addEventListener('click', () => this.showStep('parentInfoStep'));
        document.getElementById('backToPurposeBtn')?.addEventListener('click', () => this.showStep('purposeStep'));
    }

    showStep(stepId) {
        ['parentInfoStep', 'purposeStep', 'facultyStep', 'completionStep'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById(stepId)?.classList.remove('hidden');

        const indicator = document.getElementById('stepIndicator');
        if (stepId === 'parentInfoStep' || stepId === 'completionStep') {
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
        const stepMap = { 'parentInfoStep': 1, 'purposeStep': 2, 'facultyStep': 3 };
        const currentStep = stepMap[stepId] || 1;

        dots.forEach(d => {
            const dot = document.getElementById(`step${d}dot`);
            if (d < currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-blue-500 text-white shadow-lg';
                dot.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
            } else if (d === currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-emerald-600 text-white shadow-lg shadow-emerald-200';
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

        const mainPurposes = [
            { id: 'Enrollment', icon: 'clipboard-list', label: 'Enrollment' },
            { id: 'Inquiries', icon: 'help-circle', label: 'General Inquiries' },
            { id: 'Document Request', icon: 'file-text', label: 'Document Request' },
            { id: 'Consultation', icon: 'message-square', label: 'Consultation' },
            { id: 'Payment', icon: 'credit-card', label: 'Payment / Finance' },
            { id: 'Other', icon: 'more-horizontal', label: 'Other' }
        ];

        grid.innerHTML = mainPurposes.map(p => `
            <button onclick="window.kioskManager.handlePurposeClick('${p.id}', '${p.label.replace(/'/g, "\\'")}')"
                class="purpose-card group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:border-emerald-500 transition-all flex flex-col items-center gap-4 text-center">
                <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <i data-lucide="${p.icon}" class="w-7 h-7"></i>
                </div>
                <p class="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">${p.label}</p>
            </button>
        `).join('');

        this.setupLucide();
    }

    handlePurposeClick(id, label) {
        const subItems = this.categoryMap[id];
        if (subItems) {
            this.renderSubPurposes(id, label, subItems);
        } else {
            this.selectPurpose(label);
        }
    }

    renderSubPurposes(id, label, items) {
        const grid = document.getElementById('purposeGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-span-full mb-4 px-2">
                <p class="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Specific Reason for</p>
                <p class="text-3xl font-black text-slate-900 dark:text-white">${label}</p>
            </div>
            ${items.map(item => `
                <button onclick="window.kioskManager.selectPurpose('${label}: ${item.replace(/'/g, "\\'")}')"
                    class="purpose-card group bg-slate-50 dark:bg-slate-700/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-600 hover:border-emerald-500 transition-all flex flex-col items-center gap-3 text-center">
                    <p class="text-base font-bold text-slate-800 dark:text-slate-200">${item}</p>
                </button>
            `).join('')}
            <button onclick="window.kioskManager.renderPurposes()"
                class="col-span-full mt-6 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-emerald-500 transition-all">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                Back to Categories
            </button>
        `;
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
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
            </div>
        `;

        try {
            const res = await fetch('/api/faculty');
            const faculties = await res.json();

            if (!faculties || faculties.length === 0) {
                grid.innerHTML = '<p class="text-slate-400 font-bold col-span-full py-10 text-center uppercase tracking-widest">No staff available.</p>';
            } else {
                grid.innerHTML = faculties.map(f => `
                    <button onclick="window.kioskManager.submitVisit('${f.name.replace(/'/g, "\\'")}')"
                        class="purpose-card group bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:border-emerald-500 transition-all flex flex-col items-center gap-4 text-center">
                        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-emerald-500 transition-colors">
                            ${f.photoURL ? `<img src="${f.photoURL}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-bold text-xl">${f.name.charAt(0)}</div>`}
                        </div>
                        <div>
                            <p class="text-base font-black text-slate-900 dark:text-white leading-tight">${f.name}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">${f.position || 'Staff'}</p>
                        </div>
                    </button>
                `).join('');
                
                grid.innerHTML += `
                    <button onclick="window.kioskManager.submitVisit('General Office')"
                        class="purpose-card group bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all flex flex-col items-center justify-center gap-4 text-center">
                        <div class="w-16 h-16 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <i data-lucide="building-2" class="w-8 h-8"></i>
                        </div>
                        <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">General Office</p>
                    </button>
                `;
            }
        } catch (e) {
            console.error('Faculty fetch error:', e);
            grid.innerHTML = '<p class="text-red-500 font-bold col-span-full py-10 text-center uppercase">Error loading personnel.</p>';
        }

        this.setupLucide();
    }

    async submitVisit(facultyName) {
        this.selectedFaculty = facultyName;

        const visitData = {
            logData: {
                studentNumber: 'PARENT_VISIT',
                studentName: `${this.parentName}${this.studentName ? ` (Visiting: ${this.studentName})` : ''}`,
                studentId: 'Parent',
                activity: `[Parent] ${this.selectedPurpose}`,
                staff: this.selectedFaculty,
                yearLevel: 'N/A',
                course: 'Parent',
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

window.kioskManager = new ParentsKioskManager();
