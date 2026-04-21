import { loadSystemSettings, applyThemeFromStorage } from './settings.js';
import OfflineRegistry from './offline-registry.js';

// Apply saved theme immediately
applyThemeFromStorage();

class EmployeeKioskManager {
    constructor() {
        this.employeeName = '';
        this.employeeId = '';
        this.employeeType = 'Faculty';
        this.selectedPurpose = '';
        this.officeId = 'engineering-office'; // default
        this.systemSettings = {};
        this.offlineRegistry = new OfflineRegistry();

        this.dynamicPurposes = null; // [{ id, icon, label }]
        
        this.categoryMap = {
            'Class/Lecture': ['Subject/Course', 'Laboratory', 'Special Session'],
            'Meeting': ['Department', 'Research Group', 'Administrative', 'General'],
            'Research': ['Experimental Work', 'Data Analysis', 'Literature Review', 'Consultation'],
            'Consultation': ['Student Help', 'Peer Review', 'Advising'],
            'Official Business': ['Internal Admin', 'External Mission', 'Logistics']
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
        this.showStep('employeeInfoStep');
        this.resetIdleTimer();
    }

    async loadSettings() {
        try {
            this.systemSettings = await loadSystemSettings() || {};
            if (this.systemSettings.officeId) this.officeId = this.systemSettings.officeId;

            // Preferred: kiosk-specific Employee transactions list (simple list)
            const employeeTx = this._parseStringArray(this.systemSettings.kioskEmployeeTransactions);
            if (employeeTx.length) {
                this.dynamicPurposes = employeeTx.map(name => ({
                    id: name,
                    icon: this._getPurposeIcon(name),
                    label: name
                }));
            }
        } catch (e) {
            console.warn('⚠️ Could not load system settings:', e.message);
        }
    }

    _parseStringArray(raw) {
        if (!raw) return [];
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!Array.isArray(parsed)) return [];
            return parsed.map(x => String(x || '').trim()).filter(Boolean);
        } catch {
            return [];
        }
    }

    _getPurposeIcon(name) {
        const n = String(name || '').toLowerCase();
        if (n.includes('class') || n.includes('lecture') || n.includes('teach')) return 'book-open';
        if (n.includes('meet') || n.includes('group')) return 'users';
        if (n.includes('research') || n.includes('lab')) return 'microscope';
        if (n.includes('consult')) return 'heart-handshake';
        if (n.includes('official') || n.includes('business')) return 'briefcase';
        if (n.includes('other')) return 'more-horizontal';
        return 'list-checks';
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
            icon.classList.replace('text-slate-500/20', 'text-red-400');
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
        if (currentStep && currentStep !== 'employeeInfoStep' && currentStep !== 'completionStep') {
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
            this.employeeName = document.getElementById('employeeName')?.value.trim();
            this.employeeId = document.getElementById('employeeId')?.value.trim();

            if (!this.employeeName) {
                this.showToast('Please enter your full name.', 'error');
                return;
            }
            this.showStep('purposeStep');
            this.renderPurposes();
        });

        // Back Button
        document.getElementById('backToInfoBtn')?.addEventListener('click', () => {
             // If we are in sub-purpose view, the renderer for purposes handles going back.
             // But if we are in main grid, we go back to info.
             const isSubView = document.getElementById('subTitleHeader');
             if (isSubView) {
                 this.renderPurposes(); 
             } else {
                 this.showStep('employeeInfoStep');
             }
        });
    }

    showStep(stepId) {
        ['employeeInfoStep', 'purposeStep', 'completionStep'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById(stepId)?.classList.remove('hidden');

        const indicator = document.getElementById('stepIndicator');
        if (stepId === 'employeeInfoStep' || stepId === 'completionStep') {
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
        const stepMap = { 'employeeInfoStep': 1, 'purposeStep': 2, 'completionStep': 3 };
        const currentStep = stepMap[stepId] || 1;

        dots.forEach(d => {
            const dot = document.getElementById(`step${d}dot`);
            if (d < currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-blue-500 text-white shadow-lg';
                dot.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
            } else if (d === currentStep) {
                dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg';
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

        const mainPurposes = this.dynamicPurposes || [
            { id: 'Class/Lecture', icon: 'book-open', label: 'Class / Lecture' },
            { id: 'Meeting', icon: 'users', label: 'Meeting / Group' },
            { id: 'Research', icon: 'microscope', label: 'Research Work' },
            { id: 'Consultation', icon: 'heart-handshake', label: 'Consultation' },
            { id: 'Official Business', icon: 'briefcase', label: 'Official Business' },
            { id: 'Other', icon: 'more-horizontal', label: 'Other' }
        ];

        grid.innerHTML = mainPurposes.map(p => `
            <button onclick="window.kioskManager.handlePurposeClick('${p.id}', '${p.label.replace(/'/g, "\\'")}')"
                class="purpose-card group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:border-slate-900 dark:hover:border-white transition-all flex flex-col items-center gap-4 text-center">
                <div class="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all">
                    <i data-lucide="${p.icon}" class="w-7 h-7"></i>
                </div>
                <p class="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">${p.label}</p>
            </button>
        `).join('');

        this.setupLucide();
    }

    handlePurposeClick(id, label) {
        // If using soft-coded purposes, treat as a direct log (no sub-categories)
        if (this.dynamicPurposes) {
            this.submitLog(label);
            return;
        }

        const subItems = this.categoryMap[id];
        if (subItems) {
            this.renderSubPurposes(id, label, subItems);
        } else {
            this.submitLog(label);
        }
    }

    renderSubPurposes(id, label, items) {
        const grid = document.getElementById('purposeGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div id="subTitleHeader" class="col-span-full mb-4 px-2 animate-in fade-in slide-in-from-left-4 duration-300">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Specific Activity</p>
                <p class="text-3xl font-black text-slate-900 dark:text-white">${label}</p>
            </div>
            ${items.map(item => `
                <button onclick="window.kioskManager.submitLog('${label}: ${item.replace(/'/g, "\\'")}')"
                    class="purpose-card group bg-slate-50 dark:bg-slate-700/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-600 hover:border-slate-900 dark:hover:border-white transition-all flex flex-col items-center gap-3 text-center">
                    <p class="text-base font-bold text-slate-800 dark:text-slate-200">${item}</p>
                </button>
            `).join('')}
            <button onclick="window.kioskManager.renderPurposes()"
                class="col-span-full mt-6 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-slate-900 dark:hover:text-white transition-all">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                Back to Categories
            </button>
        `;
        this.setupLucide();
    }

    async submitLog(purpose) {
        this.selectedPurpose = purpose;

        const visitData = {
            logData: {
                studentNumber: 'EMPLOYEE_LOG',
                studentName: this.employeeName,
                studentId: this.employeeId || 'Staff',
                activity: `[Employee] ${this.selectedPurpose}`,
                staff: 'Main Office',
                yearLevel: 'Staff',
                course: 'Employee',
                date: new Date().toISOString().split('T')[0]
            },
            officeId: this.officeId
        };

        try {
            // Check for active clocked-in session
            const checkRes = await fetch(`/api/logs?officeId=${this.officeId}`);
            if (checkRes.ok) {
                const logs = await checkRes.json();
                const activeLog = logs.find(l => 
                    l.studentNumber === 'EMPLOYEE_LOG' && 
                    l.studentName?.toLowerCase() === this.employeeName.toLowerCase() && 
                    !l.timeOut
                );
                
                if (activeLog) {
                    this.showToast('You are already clocked in!', 'error');
                    return;
                }
            }

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
            console.warn('❌ Employee log failed, queuing offline:', e);
            if (this.offlineRegistry) this.offlineRegistry.queueLog(visitData);
            this.showStep('completionStep');
            this.showToast('Offline mode active.', 'warning');
        }
    }
}

window.kioskManager = new EmployeeKioskManager();
