/**
 * Settings Manager
 * Handles loading, saving, and applying all system settings.
 * Reads/writes from the backend /api/settings endpoints which persist to SQLite.
 */

export default class SettingsManager {
    constructor(staffEmail = '') {
        this.staffEmail = staffEmail;
        this.activities = [];
        this.settings = {};
    }

    // ----------------------------------------------------------------
    // Public entry point
    // ----------------------------------------------------------------
    async init() {
        await this.loadSettings();
        this.applyTheme(this.settings.appearanceMode || 'light');
        this.renderActivities();
        this.renderStaffList();
        this.renderAuditLog();
        this.bindEvents();
        lucide.createIcons();
    }

    // ----------------------------------------------------------------
    // Toast utility
    // ----------------------------------------------------------------
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const template = document.getElementById('toastTemplate');
        if (!container || !template) return;
        const toast = template.content.cloneNode(true).firstElementChild;
        toast.querySelector('.toast-message').textContent = message;
        const icon = toast.querySelector('.toast-icon');
        if (type === 'error') {
            icon.setAttribute('data-lucide', 'alert-circle');
            icon.classList.replace('text-emerald-400', 'text-red-400');
            toast.classList.replace('bg-slate-900/90', 'bg-red-500/95');
        }
        container.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 4000);
    }

    // ----------------------------------------------------------------
    // Load settings from API
    // ----------------------------------------------------------------
    async loadSettings() {
        try {
            const res = await fetch('/api/settings');
            this.settings = await res.json();
        } catch (e) {
            this.settings = {};
            this.showToast('Could not load settings (offline?)', 'error');
        }

        // Populate fields
        this._setVal('s_officeName', this.settings.officeName || '');
        this._setVal('s_officeId', this.settings.officeId || '');
        this._setVal('s_schoolName', this.settings.schoolName || '');
        this._setChecked('s_yearLevelEnabled', this.settings.yearLevelEnabled !== 'false');
        this._setChecked('s_yearLevelRequired', this.settings.yearLevelRequired !== 'false');
        this._setChecked('s_courseRequired', this.settings.courseRequired !== 'false');
        this._setChecked('s_autoSubmit', this.settings.autoSubmit === 'true');
        this._setChecked('s_audioFeedback', this.settings.audioFeedback !== 'false');
        this._setChecked('s_darkMode', this.settings.appearanceMode === 'dark');
        this._setVal('s_autoCheckoutTime', this.settings.autoCheckoutTime || '');
        this._setVal('s_sessionTimeoutMinutes', this.settings.sessionTimeoutMinutes || '0');

        // Activities (Support both old array-of-strings and new array-of-objects)
        try {
            const raw = JSON.parse(this.settings.activities || '[]');
            this.activities = raw.map(item => {
                if (typeof item === 'string') {
                    // Migrate old format
                    return { name: item, options: this._getDefaultOptions(item) };
                }
                return { name: item.name || 'Unnamed', options: item.options || [] };
            });
        } catch {
            this.activities = [
                { name: 'Enrollment', options: ['Adding/Dropping of Subjects', 'Shifting Program', 'Late Enrollment', 'Summer Validation', 'Overload Request', 'Others'] },
                { name: 'Inquiries', options: ['Grade Follow-up', 'Schedule of Classes', 'Professor Availability', 'Curriculum/Advising', 'Others'] },
                { name: 'Document Request', options: ['Enrollment Form', 'Clearance', 'Certificate of Registration (COR)', 'Transcript of Records (TOR)', 'Certification (Enrollment/Graduation)', 'Certification of Grades (GWA)', 'Course Description / Syllabus', 'Honorable Dismissal / Transfer', 'Others'] },
                { name: 'Consultation', options: ['Thesis/Capstone', 'Project Guidance', 'Internship/Job Search', 'Others'] },
                { name: 'Others', options: [] }
            ];
        }
    }

    _getDefaultOptions(name) {
        const defaults = {
            'Enrollment': ['Adding/Dropping of Subjects', 'Shifting Program', 'Late Enrollment', 'Summer Validation', 'Overload Request', 'Others'],
            'Inquiries': ['Grade Follow-up', 'Schedule of Classes', 'Professor Availability', 'Curriculum/Advising', 'Others'],
            'Document Request': ['Enrollment Form', 'Clearance', 'Certificate of Registration (COR)', 'Transcript of Records (TOR)', 'Certification (Enrollment/Graduation)', 'Certification of Grades (GWA)', 'Course Description / Syllabus', 'Honorable Dismissal / Transfer', 'Others'],
            'Consultation': ['Thesis/Capstone', 'Project Guidance', 'Internship/Job Search', 'Others']
        };
        return defaults[name] || [];
    }

    // ----------------------------------------------------------------
    // Collect & save settings to API
    // ----------------------------------------------------------------
    async saveAll() {
        const saveBtn = document.getElementById('saveAllBtn');
        const saveBtnBottom = document.getElementById('saveAllBtnBottom');
        [saveBtn, saveBtnBottom].forEach(b => { if (b) { b.disabled = true; b.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving…`; } });

        const appearanceMode = document.getElementById('s_darkMode')?.checked ? 'dark' : 'light';

        const settingsPayload = {
            officeName: this._getVal('s_officeName'),
            officeId: this._getVal('s_officeId'),
            schoolName: this._getVal('s_schoolName'),
            activities: JSON.stringify(this.activities),
            yearLevelEnabled: String(document.getElementById('s_yearLevelEnabled')?.checked ?? true),
            yearLevelRequired: String(document.getElementById('s_yearLevelRequired')?.checked ?? true),
            courseRequired: String(document.getElementById('s_courseRequired')?.checked ?? true),
            autoSubmit: String(document.getElementById('s_autoSubmit')?.checked ?? false),
            audioFeedback: String(document.getElementById('s_audioFeedback')?.checked ?? true),
            appearanceMode,
            autoCheckoutTime: this._getVal('s_autoCheckoutTime'),
            sessionTimeoutMinutes: this._getVal('s_sessionTimeoutMinutes') || '0'
        };

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: settingsPayload, staffEmail: this.staffEmail })
            });
            if (!res.ok) throw new Error('Save failed');
            this.settings = { ...this.settings, ...settingsPayload };
            this.applyTheme(appearanceMode);

            // Update sidebar office name
            const sidebarName = document.getElementById('sidebarOfficeName');
            if (sidebarName && settingsPayload.officeName) {
                sidebarName.innerHTML = settingsPayload.officeName + '<span class="text-blue-500">.</span>';
            }

            this.showToast('Settings saved successfully!');
            this.renderAuditLog(); // refresh audit log after save
        } catch (e) {
            this.showToast('Failed to save settings. Please try again.', 'error');
        } finally {
            [saveBtn, saveBtnBottom].forEach(b => { if (b) { b.disabled = false; b.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Save All Changes`; lucide.createIcons(); } });
        }
    }

    // ----------------------------------------------------------------
    // Theme — uses Tailwind v4's native `dark` class on <html>
    // ----------------------------------------------------------------
    applyTheme(mode) {
        _applyMode(mode);
        localStorage.setItem('logbook-theme', mode);
    }

    // ----------------------------------------------------------------
    // Activities list renderer
    // ----------------------------------------------------------------
    renderActivities() {
        const container = document.getElementById('activitiesList');
        if (!container) return;
        container.innerHTML = '';
        this.activities.forEach((act, idx) => {
            const row = document.createElement('div');
            row.className = 'bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-2xl overflow-hidden group mb-3';
            row.dataset.index = idx;
            row.draggable = true;
            
            const optionsHtml = act.options.map((opt, optIdx) => `
                <div class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-600">
                    <input type="text" value="${this._escape(opt)}" 
                        class="flex-grow bg-transparent border-none outline-none text-xs text-slate-600 dark:text-slate-300 focus:ring-0 sm:min-w-0"
                        data-act-idx="${idx}" data-opt-idx="${optIdx}">
                    <button data-delete-opt="${optIdx}" data-parent-idx="${idx}" class="text-slate-300 hover:text-red-500 transition-colors">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </div>
            `).join('');

            row.innerHTML = `
                <!-- Activity Header -->
                <div class="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-700">
                    <i data-lucide="grip-vertical" class="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0"></i>
                    <input type="text" value="${this._escape(act.name)}"
                        class="flex-grow bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white focus:ring-0 min-w-0"
                        data-act-name-index="${idx}">
                    <button data-toggle-idx="${idx}" class="text-slate-400 hover:text-violet-500 transition-colors px-2">
                        <i data-lucide="chevron-down" class="w-4 h-4 transition-transform ${act._expanded ? 'rotate-180' : ''}"></i>
                    </button>
                    <button data-delete-index="${idx}" class="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                
                <!-- Options Panel (Sub-categories) -->
                <div class="p-4 space-y-3 ${act._expanded ? '' : 'hidden'}" id="options-panel-${idx}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Specific Options</span>
                        <div class="h-[1px] flex-grow bg-slate-100 dark:bg-slate-600"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${optionsHtml}
                    </div>
                    <div class="flex gap-2 pt-2">
                        <input type="text" placeholder="Add option (e.g. TOR, ID Request)…" 
                            id="newOpt-${idx}"
                            class="flex-grow border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-violet-500 font-semibold text-slate-700 dark:text-slate-200">
                        <button data-add-opt="${idx}" class="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-violet-200 transition-all flex items-center gap-1">
                            <i data-lucide="plus" class="w-3 h-3"></i> Add
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(row);
        });
        lucide.createIcons();

        // 1. Activity Name Edit
        container.querySelectorAll('input[data-act-name-index]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.activities[parseInt(e.target.dataset.actNameIndex)].name = e.target.value;
            });
        });

        // 2. Sub-option Edit
        container.querySelectorAll('input[data-act-idx]').forEach(input => {
            input.addEventListener('input', (e) => {
                const aIdx = parseInt(e.target.dataset.actIdx);
                const oIdx = parseInt(e.target.dataset.optIdx);
                this.activities[aIdx].options[oIdx] = e.target.value;
            });
        });

        // 3. Toggle Expand
        container.querySelectorAll('[data-toggle-idx]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.toggleIdx);
                this.activities[idx]._expanded = !this.activities[idx]._expanded;
                this.renderActivities(); // Partial re-render (or just toggle class)
            });
        });

        // 4. Delete Activity
        container.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.deleteIndex);
                if (confirm(`Delete activity "${this.activities[idx].name}" and all its options?`)) {
                    this.activities.splice(idx, 1);
                    this.renderActivities();
                }
            });
        });

        // 5. Add Sub-option
        container.querySelectorAll('[data-add-opt]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.addOpt);
                const input = document.getElementById(`newOpt-${idx}`);
                const val = (input?.value || '').trim();
                if (!val) return;
                this.activities[idx].options.push(val);
                this.activities[idx]._expanded = true; // Stay open
                this.renderActivities();
            });
        });

        // 6. Delete Sub-option
        container.querySelectorAll('[data-delete-opt]').forEach(btn => {
            btn.addEventListener('click', () => {
                const aIdx = parseInt(btn.dataset.parentIdx);
                const oIdx = parseInt(btn.dataset.deleteOpt);
                this.activities[aIdx].options.splice(oIdx, 1);
                this.renderActivities();
            });
        });

        // Drag-to-reorder (Main activities)
        this._enableDragReorder(container);
    }

    _enableDragReorder(container) {
        let dragSrc = null;
        container.querySelectorAll('[draggable]').forEach(row => {
            row.addEventListener('dragstart', (e) => { 
                if (e.target.tagName === 'INPUT' || e.target.closest('button')) {
                    e.preventDefault();
                    return;
                }
                dragSrc = row; 
                row.classList.add('opacity-50'); 
            });
            row.addEventListener('dragend', () => { row.classList.remove('opacity-50'); });
            row.addEventListener('dragover', (e) => { e.preventDefault(); });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrc === row || !dragSrc) return;
                const srcIdx = parseInt(dragSrc.dataset.index);
                const destIdx = parseInt(row.dataset.index);
                const moved = this.activities.splice(srcIdx, 1)[0];
                this.activities.splice(destIdx, 0, moved);
                this.renderActivities();
                dragSrc = null;
            });
        });
    }

    // ----------------------------------------------------------------
    // Staff whitelist
    // ----------------------------------------------------------------
    async renderStaffList() {
        const container = document.getElementById('staffList');
        if (!container) return;
        try {
            const res = await fetch('/api/settings/staff');
            const staff = await res.json();
            container.innerHTML = '';
            if (staff.length === 0) {
                container.innerHTML = `<p class="text-[11px] text-slate-400 italic px-1">No staff added. All authenticated users can log in.</p>`;
                return;
            }
            staff.forEach(s => {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl';
                row.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-black">${(s.email || 'U')[0].toUpperCase()}</div>
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">${this._escape(s.email)}</span>
                    </div>
                    <button data-email="${this._escape(s.email)}" class="remove-staff-btn text-slate-300 hover:text-red-500 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                `;
                container.appendChild(row);
            });
            lucide.createIcons();
            container.querySelectorAll('.remove-staff-btn').forEach(btn => {
                btn.addEventListener('click', () => this.removeStaff(btn.dataset.email));
            });
        } catch (e) {
            container.innerHTML = `<p class="text-[11px] text-red-400 italic px-1">Failed to load staff list.</p>`;
        }
    }

    async addStaff() {
        const input = document.getElementById('newStaffInput');
        const email = (input?.value || '').trim().toLowerCase();
        if (!email || !email.includes('@')) { this.showToast('Enter a valid email address', 'error'); return; }
        try {
            const res = await fetch('/api/settings/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, staffEmail: this.staffEmail })
            });
            if (!res.ok) throw new Error();
            input.value = '';
            this.showToast(`Added ${email}`);
            this.renderStaffList();
        } catch { this.showToast('Failed to add staff email', 'error'); }
    }

    async removeStaff(email) {
        try {
            await fetch(`/api/settings/staff/${encodeURIComponent(email)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffEmail: this.staffEmail })
            });
            this.showToast(`Removed ${email}`);
            this.renderStaffList();
        } catch { this.showToast('Failed to remove staff email', 'error'); }
    }

    // ----------------------------------------------------------------
    // Audit Log
    // ----------------------------------------------------------------
    async renderAuditLog() {
        const tbody = document.getElementById('auditLogBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-slate-400 font-bold text-xs">Loading…</td></tr>`;
        try {
            const res = await fetch('/api/settings/audit');
            const logs = await res.json();
            if (!logs.length) {
                tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-slate-400 font-bold text-xs">No audit entries yet.</td></tr>`;
                return;
            }
            tbody.innerHTML = logs.map(log => `
                <tr class="border-t border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <td class="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-semibold">${this._escape(log.staffEmail)}</td>
                    <td class="px-4 py-2.5 text-slate-500 dark:text-slate-400">${this._escape(log.action)}</td>
                    <td class="px-4 py-2.5 text-slate-400 whitespace-nowrap">${new Date(log.createdAt).toLocaleString()}</td>
                </tr>
            `).join('');
        } catch {
            tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-red-400 font-bold text-xs">Failed to load.</td></tr>`;
        }
    }

    // ----------------------------------------------------------------
    // Manual Sync
    // ----------------------------------------------------------------
    async triggerSync() {
        const btn = document.getElementById('manualSyncBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Syncing…`; lucide.createIcons(); }
        try {
            const res = await fetch('/api/sync-now', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Sync failed');
            this.showToast('Cloud sync completed!');
        } catch (e) {
            this.showToast(e.message || 'Sync failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync Now`; lucide.createIcons(); }
        }
    }

    // ----------------------------------------------------------------
    // DB Maintenance
    // ----------------------------------------------------------------
    async runMaintenance() {
        const confirmed = confirm('This will permanently delete all locally cached logs that have been synced to the cloud. This cannot be undone. Continue?');
        if (!confirmed) return;
        try {
            const res = await fetch('/api/db-maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffEmail: this.staffEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error();
            this.showToast(`Cleared ${data.deleted} synced log(s) from local storage.`);
            this.renderAuditLog();
        } catch { this.showToast('Maintenance failed', 'error'); }
    }

    // ----------------------------------------------------------------
    // Event binding
    // ----------------------------------------------------------------
    bindEvents() {
        document.getElementById('saveAllBtn')?.addEventListener('click', () => this.saveAll());
        document.getElementById('saveAllBtnBottom')?.addEventListener('click', () => this.saveAll());

        document.getElementById('addActivityBtn')?.addEventListener('click', () => {
            const input = document.getElementById('newActivityInput');
            const val = (input?.value || '').trim();
            if (!val) return;
            this.activities.push({ name: val, options: [], _expanded: true });
            input.value = '';
            this.renderActivities();
        });

        document.getElementById('newActivityInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); document.getElementById('addActivityBtn')?.click(); }
        });

        document.getElementById('addStaffBtn')?.addEventListener('click', () => this.addStaff());
        document.getElementById('newStaffInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.addStaff(); }
        });

        document.getElementById('manualSyncBtn')?.addEventListener('click', () => this.triggerSync());
        document.getElementById('maintenanceBtn')?.addEventListener('click', () => this.runMaintenance());
        document.getElementById('refreshAuditBtn')?.addEventListener('click', () => this.renderAuditLog());

        document.getElementById('clearCheckoutTimeBtn')?.addEventListener('click', () => {
            const el = document.getElementById('s_autoCheckoutTime');
            if (el) el.value = '';
        });

        // Live dark mode preview
        document.getElementById('s_darkMode')?.addEventListener('change', (e) => {
            this.applyTheme(e.target.checked ? 'dark' : 'light');
        });
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    _setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
    _getVal(id) { return document.getElementById(id)?.value || ''; }
    _setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
    _escape(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}

// ----------------------------------------------------------------
// Static helper: load settings from API and return as object
// Called by other pages (scan.js, dashboard.js, etc.)
// ----------------------------------------------------------------
export async function loadSystemSettings() {
    try {
        const res = await fetch('/api/settings');
        return await res.json();
    } catch {
        return {};
    }
}

// ----------------------------------------------------------------
// Internal helper — applies dark/light class AND forces color-scheme
// so the OS dark mode preference CANNOT override the site setting.
// ----------------------------------------------------------------
function _applyMode(mode) {
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    // Force color-scheme so browser UA styles (scrollbars, inputs, date pickers)
    // follow the SITE preference instead of the OS preference.
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

// ----------------------------------------------------------------
// Apply theme from localStorage on any page load (call early in <head> to avoid FOUC)
// Uses Tailwind v4's native `dark` class variant on <html>.
// ----------------------------------------------------------------
export function applyThemeFromStorage() {
    const saved = localStorage.getItem('logbook-theme');
    const mode = saved ? saved : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    _applyMode(mode);
}
