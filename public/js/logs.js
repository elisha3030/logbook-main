// Logs Management Module — offline-first, all data via REST API
import { loadSystemSettings, applyThemeFromStorage } from './settings.js';
import OfflineRegistry from './offline-registry.js';

// Apply saved theme immediately
applyThemeFromStorage();

class LogsManager {
    constructor() {
        this.entries = [];
        this.currentPage = 1;
        this.entriesPerPage = 10;
        this.filteredEntries = [];
        this.officeId = 'engineering-office'; // overridden by settings
        this.init();
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const template = document.getElementById('toastTemplate');

        if (!container || !template) {
            console.error('Toast elements not found');
            alert(message); // Fallback
            return;
        }

        const toast = template.content.cloneNode(true).querySelector('.toast-item');
        const messageEl = toast.querySelector('.toast-message');
        const iconContainer = toast.querySelector('.toast-icon-container');
        const icon = toast.querySelector('.toast-icon');

        messageEl.textContent = message;

        if (type === 'error') {
            iconContainer.classList.replace('bg-white/10', 'bg-red-500/20');
            icon.classList.replace('text-emerald-400', 'text-red-400');
            icon.setAttribute('data-lucide', 'alert-circle');
        }

        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        // Animation and cleanup
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirmationModal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const proceedBtn = document.getElementById('confirmProceedBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        if (!modal || !titleEl || !msgEl || !proceedBtn || !cancelBtn) {
            if (confirm(message)) onConfirm();
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message;

        const handleConfirm = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            onConfirm();
            cleanup();
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            cleanup();
        };

        const cleanup = () => {
            proceedBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        proceedBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
    }

    async init() {
        // Load settings first
        this.systemSettings = {};
        try {
            const settings = await loadSystemSettings();
            this.systemSettings = settings;
            if (settings.officeId) this.officeId = settings.officeId;

            // Apply office name to dashboard header
            if (settings.officeName) {
                const subtitle = document.querySelector('.text-slate-500.font-medium');
                if (subtitle) subtitle.textContent = `Monitoring ${settings.officeName} traffic & logs`;

                // Update sidebar name
                const sidebarName = document.getElementById('sidebarOfficeName');
                if (sidebarName) sidebarName.innerHTML = settings.officeName + '<span class="text-blue-500">.</span>';

                // Update document title
                document.title = `${settings.officeName} - Dashboard`;
            }

            // Populate faculty filter for report generation from the unified API
            try {
                const res = await fetch('/api/faculty');
                const facultyList = await res.json();
                const reportFacultyFilter = document.getElementById('reportFacultyFilter');
                if (reportFacultyFilter && Array.isArray(facultyList)) {
                    // Clear existing except "All Faculty"
                    reportFacultyFilter.innerHTML = '<option value="">All Faculty</option>';
                    facultyList.forEach(fac => {
                        const opt = document.createElement('option');
                        const name = typeof fac === 'string' ? fac : fac.name;
                        opt.value = name;
                        opt.textContent = name;
                        reportFacultyFilter.appendChild(opt);
                    });
                }
            } catch (e) { console.error('Failed to populate report faculty filter:', e); }
        } catch (e) { /* proceed with defaults */ }

        // Only initialize if we're on the dashboard page
        if (window.location.pathname.includes('dashboard.html') || document.getElementById('entriesTableBody')) {
            this.setupEventListeners();
            this.loadEntries();
            this.updateStats();
        } else {
            console.log('📊 LogsManager: Not on dashboard page, skipping initialization');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const activityFilter = document.getElementById('activityFilter');
        const dateFilter = document.getElementById('dateFilter');
        const visitorTypeFilter = document.getElementById('visitorTypeFilter');
        const docStatusFilter = document.getElementById('docStatusFilter');
        const insightTimeFilter = document.getElementById('insightTimeFilter');
        const exportBtn = document.getElementById('exportBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const printBtn = document.getElementById('printBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        const deleteEntryBtn = document.getElementById('deleteEntryBtn');

        if (searchInput)      searchInput.addEventListener('input',  () => this.filterEntries());
        if (activityFilter)   activityFilter.addEventListener('change', () => this.filterEntries());
        if (dateFilter)       dateFilter.addEventListener('change',   () => this.filterEntries());
        if (visitorTypeFilter) visitorTypeFilter.addEventListener('change', () => this.filterEntries());
        if (docStatusFilter)  docStatusFilter.addEventListener('change', () => this.filterEntries());
        if (insightTimeFilter) insightTimeFilter.addEventListener('change', () => this.updateInsights());
        if (exportBtn)        exportBtn.addEventListener('click',    () => this.exportToCSV());
        if (generateReportBtn) generateReportBtn.addEventListener('click', () => this.generatePDFReport());
        if (deleteEntryBtn)   deleteEntryBtn.addEventListener('click', () => this.deleteCurrentEntry());

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadEntries();
                this.updateStats();
            });
        }

        if (printBtn) { printBtn.addEventListener('click', () => this.printReport()); }

        const bulkClockOutBtn = document.getElementById('bulkClockOutBtn');
        if (bulkClockOutBtn) { bulkClockOutBtn.addEventListener('click', () => this.handleBulkClockOut()); }

        // ── Bulk Approval panel ──────────────────────────────────
        const openBulkBtn = document.getElementById('openBulkApprovalBtn');
        if (openBulkBtn) {
            openBulkBtn.addEventListener('click', () => {
                const panel = document.getElementById('bulkApprovalPanel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    this.loadPendingRequests();
                }
            });
        }

        const selectAll = document.getElementById('selectAllPending');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                document.querySelectorAll('.pending-row-check').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }

        const bulkApproveBtn = document.getElementById('bulkApproveBtn');
        if (bulkApproveBtn) {
            bulkApproveBtn.addEventListener('click', () => this.bulkStartService());
        }

        const bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
        if (bulkCompleteBtn) {
            bulkCompleteBtn.addEventListener('click', () => this.bulkCompleteRequests());
        }

        const bulkClaimBtn = document.getElementById('bulkClaimBtn');
        if (bulkClaimBtn) {
            bulkClaimBtn.addEventListener('click', () => this.bulkClaimRequests());
        }

        const bulkMarkOutBtn = document.getElementById('bulkMarkOutBtn');
        if (bulkMarkOutBtn) {
            bulkMarkOutBtn.addEventListener('click', () => this.handleBulkClockOut());
        }

        // ── Dropdown Toggles (Click instead of Hover) ──────────────────
        const actionsBtn = document.getElementById('actionsBtn');
        const actionsDropdown = document.getElementById('actionsDropdown');
        const showMoreFiltersBtn = document.getElementById('showMoreFiltersBtn');
        const moreFiltersPanel = document.getElementById('moreFiltersPanel');
        const closeMoreFiltersBtn = document.getElementById('closeMoreFiltersBtn');

        const toggleMenu = (btn, menu) => {
            if (!btn || !menu) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                // Close other open menus first
                [actionsDropdown, moreFiltersPanel].forEach(m => m?.classList.add('hidden'));
                if (isHidden) menu.classList.remove('hidden');
            });
        };

        toggleMenu(actionsBtn, actionsDropdown);
        toggleMenu(showMoreFiltersBtn, moreFiltersPanel);

        if (closeMoreFiltersBtn) {
            closeMoreFiltersBtn.addEventListener('click', () => moreFiltersPanel?.classList.add('hidden'));
        }

        // Close proof modal
        const closeProofBtn  = document.getElementById('closeProofModal');
        const closeProofBtn2 = document.getElementById('closeProofModalBtn');
        const proofModal     = document.getElementById('proofViewerModal');
        [closeProofBtn, closeProofBtn2].forEach(btn => {
            btn?.addEventListener('click', () => proofModal?.classList.add('hidden'));
        });
        proofModal?.addEventListener('click', (e) => {
            if (e.target === proofModal) proofModal.classList.add('hidden');
        });

        // Click outside to close menus
        window.addEventListener('click', () => {
            [actionsDropdown, moreFiltersPanel].forEach(m => m?.classList.add('hidden'));
        });

        // Clock out in modal
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#modalClockOutBtn');
            if (btn) this.handleClockOut(btn.dataset.entryId);
        });
    }

    async loadEntries() {
        try {
            const entriesTableBody = document.getElementById('entriesTableBody');

            // Check if we're on the dashboard page
            if (!entriesTableBody) {
                console.log('📊 Not on dashboard page, skipping entries load');
                return;
            }

            entriesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center bg-white dark:bg-slate-800">
                        <div class="flex flex-col items-center justify-center">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                            <p class="font-medium text-slate-500">Loading entries...</p>
                        </div>
                    </td>
                </tr>
            `;

            // Fetch entries from the backend API
            const response = await fetch(`/api/logs?officeId=${this.officeId}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');

            this.entries = data.map(entry => {
                // Backend already provides id and data
                // Convert timestamp strings to readable dates if they aren't already
                if (entry.timeIn && typeof entry.timeIn === 'object' && entry.timeIn._seconds) {
                    // Handle Firestore timestamp objects if they come through raw
                    entry.timestamp = new Date(entry.timeIn._seconds * 1000).toISOString();
                } else if (entry.timeIn) {
                    entry.timestamp = new Date(entry.timeIn).toISOString();
                }

                if (entry.timeOut) {
                    const timeOutDate = (entry.timeOut._seconds)
                        ? new Date(entry.timeOut._seconds * 1000)
                        : new Date(entry.timeOut);
                    entry.timeOutFormatted = timeOutDate.toLocaleTimeString();
                }
                return entry;
            });

            this.filteredEntries = [...this.entries];
            this.filterEntries(); // Correctly apply filters after loading
            this.updateStats();
            this.updateInsights();
            this.updateAnalytics();

        } catch (error) {
            console.error('❌ Error loading entries:', error);
            const entriesTableBody = document.getElementById('entriesTableBody');
            entriesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center bg-white dark:bg-slate-800">
                        <div class="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 inline-block mx-auto">
                            <i data-lucide="alert-circle" class="w-6 h-6 mx-auto mb-2"></i>
                            <strong class="block">Error loading entries</strong>
                            <p class="text-sm mt-1">Please try refreshing the page.</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons();
        }
    }

    filterEntries() {
        const searchInput     = document.getElementById('searchInput');
        const activityFilter  = document.getElementById('activityFilter');
        const dateFilter      = document.getElementById('dateFilter');
        const visitorTypeFilter = document.getElementById('visitorTypeFilter');
        const docStatusFilter = document.getElementById('docStatusFilter');

        const searchTerm       = searchInput      ? searchInput.value.toLowerCase()  : '';
        const activityValue    = activityFilter   ? activityFilter.value              : '';
        const dateValue        = dateFilter       ? dateFilter.value                  : '';
        const visitorTypeValue = visitorTypeFilter ? visitorTypeFilter.value          : '';
        const docStatusValue   = docStatusFilter  ? docStatusFilter.value             : '';

        this.filteredEntries = this.entries.filter(entry => {
            // Search
            const matchesSearch = !searchTerm ||
                (entry.studentName   && entry.studentName.toLowerCase().includes(searchTerm)) ||
                (entry.studentNumber && entry.studentNumber.toLowerCase().includes(searchTerm));

            // Document type / activity filter (partial match support)
            let matchesActivity = true;
            if (activityValue) {
                if (activityValue.toLowerCase() === 'others') {
                    // Any entry not matching the well-known list
                    const knownTypes = ['Certificate of Registration','Certificate of Grades','Transcript of Records',
                        'Certification (Enrollment)','Concept Paper','Memorandum','Honorable Dismissal',
                        'Grade Query / Follow-up','Shifting / Overload Form','Promissory Note','Clearance'];
                    matchesActivity = !knownTypes.some(t => (entry.activity||'').toLowerCase().includes(t.toLowerCase()));
                } else {
                    matchesActivity = (entry.activity||'').toLowerCase().includes(activityValue.toLowerCase());
                }
            }

            // Date filter
            let matchesDate = true;
            if (dateValue && entry.timestamp) {
                const entryDateStr = entry.date || entry.timestamp.split('T')[0] || '';
                const nowStr = new Date().toLocaleDateString('en-CA');
                const entryD = new Date(entryDateStr);
                const todayD = new Date(nowStr);
                if (dateValue === 'today')  matchesDate = entryDateStr === nowStr;
                if (dateValue === 'week')   matchesDate = entryD >= new Date(todayD.getTime() - 7*24*60*60*1000) && entryD <= todayD;
                if (dateValue === 'month')  matchesDate = entryD >= new Date(todayD.getTime() - 30*24*60*60*1000) && entryD <= todayD;
            }

            // Visitor type filter
            let matchesVisitorType = true;
            if (visitorTypeValue) {
                const sn  = (entry.studentNumber || '').toUpperCase();
                const act = (entry.activity || '');
                const isParent   = sn === 'PARENT_VISIT'  || act.startsWith('[Parent]');
                const isEmployee = sn === 'EMPLOYEE_LOG'  || act.startsWith('[Employee]');
                const isVisitor  = sn === 'VISITOR_VISIT' || act.startsWith('[Visitor]');
                const isStudent  = !isParent && !isEmployee && !isVisitor;
                if (visitorTypeValue === 'parent')   matchesVisitorType = isParent;
                else if (visitorTypeValue === 'employee') matchesVisitorType = isEmployee;
                else if (visitorTypeValue === 'visitor')  matchesVisitorType = isVisitor;
                else if (visitorTypeValue === 'student')  matchesVisitorType = isStudent;
            }

            // Request status filter: pending / in-service / completed
            let matchesDocStatus = true;
            if (docStatusValue) {
                matchesDocStatus = String(entry.status || '').toLowerCase() === String(docStatusValue).toLowerCase();
            }

            return matchesSearch && matchesActivity && matchesDate && matchesVisitorType && matchesDocStatus;
        });

        this.currentPage = 1;
        this.displayEntries();
        this.updateInsights();
    }

    displayEntries() {
        const entriesTableBody = document.getElementById('entriesTableBody');
        const startIndex = (this.currentPage - 1) * this.entriesPerPage;
        const endIndex   = startIndex + this.entriesPerPage;
        const pageEntries = this.filteredEntries.slice(startIndex, endIndex);

        if (pageEntries.length === 0) {
            entriesTableBody.innerHTML = `
                <tr><td colspan="6" class="px-6 py-12 text-center bg-white dark:bg-slate-800">
                    <div class="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 inline-block mx-auto">
                        <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
                        <strong class="block">No entries found</strong>
                        <p class="text-sm mt-1">Try adjusting your filters.</p>
                    </div>
                </td></tr>`;
            lucide.createIcons();
            return;
        }

        entriesTableBody.innerHTML = pageEntries.map(entry => {
            let displayName    = entry.studentName   || '---';
            let displaySubname = entry.studentNumber || '---';
            let initial        = displayName.charAt(0);

            if (entry.studentNumber === 'PARENT_VISIT' || (entry.activity && entry.activity.startsWith('[Parent]'))) {
                const parts = entry.studentName.match(/^(.*?)(?:\s*\(\s*Visiting:\s*(.*?)\s*\))?$/);
                if (parts) {
                    displayName    = parts[1].trim();
                    initial        = displayName.charAt(0);
                    displaySubname = parts[2] ? `Visiting: ${parts[2].trim()}` : 'Parent Visit';
                }
            }

            // ─ Request status pill (Pending / Processing / Completed)
            const rs = String(entry.status || 'pending').toLowerCase();
            let docStatusPill = '';
            if (rs === 'pending') {
                docStatusPill = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800"><div class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>Pending</span>`;
            } else if (rs === 'in-service') {
                docStatusPill = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800"><div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Processing</span>`;
            } else {
                docStatusPill = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Completed</span>`;
            }

            // ─ Session status pill (checked in / checked out)
            const sessionPill = entry.timeOutFormatted
                ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider"><div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>Checked Out</span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>Active</span>`;

            // ─ Identification logic
            const isStudent  = (entry.studentNumber !== 'PARENT_VISIT' && entry.studentNumber !== 'EMPLOYEE_LOG' && entry.studentNumber !== 'VISITOR_VISIT');
            const isParent   = (entry.studentNumber === 'PARENT_VISIT');
            const isEmployee = (entry.studentNumber === 'EMPLOYEE_LOG');
            const isVisitor  = (entry.studentNumber === 'VISITOR_VISIT');

            let roleBadge = '';
            if (isStudent) {
                roleBadge = `<span class="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-tighter border border-blue-100 dark:border-blue-800/40 mb-1.5 inline-block">Student</span>`;
            } else if (isParent) {
                roleBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-tighter border border-emerald-100 dark:border-emerald-800/40 mb-1.5 inline-block">Parent</span>`;
            } else if (isEmployee) {
                roleBadge = `<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[8px] font-black uppercase tracking-tighter border border-slate-200 dark:border-slate-600 mb-1.5 inline-block">Staff</span>`;
            } else if (isVisitor) {
                roleBadge = `<span class="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[8px] font-black uppercase tracking-tighter border border-violet-100 dark:border-violet-800/40 mb-1.5 inline-block">Guest</span>`;
            }

            return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs border border-white dark:border-slate-600 shadow-sm flex-shrink-0">${initial}</div>
                        <div>
                            ${roleBadge}
                            <p class="font-bold text-slate-900 dark:text-white leading-none mb-1">${displayName}</p>
                            <p class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">${displaySubname}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5 font-bold text-slate-600 dark:text-slate-400 text-xs text-center">
                    ${(entry.studentNumber === 'PARENT_VISIT' || entry.studentNumber === 'EMPLOYEE_LOG' || entry.studentNumber === 'VISITOR_VISIT') ? '---' : (entry.yearLevel || entry['Year Level'] || '---')}
                </td>
                <td class="px-6 py-5">
                    <p class="font-black text-slate-800 dark:text-white text-sm leading-tight">${entry.activity || '---'}</p>
                    <p class="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                        <i data-lucide="clock" class="w-2.5 h-2.5"></i>
                        ${this.formatDateTime(entry.timestamp)}
                    </p>
                </td>
                <td class="px-6 py-5 text-center">${docStatusPill}</td>
                <td class="px-6 py-5 text-center">${sessionPill}</td>
                <td class="px-8 py-5 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all" onclick="logsManager.viewEntry('${entry.id}')">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
        this.updatePagination();
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredEntries.length / this.entriesPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li>
                <button class="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                        ${this.currentPage === 1 ? 'disabled' : ''} onclick="logsManager.goToPage(${this.currentPage - 1})">
                    Previous
                </button>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <li>
                    <button class="w-10 h-10 flex items-center justify-center text-sm font-bold rounded-xl border transition-all 
                                 ${i === this.currentPage ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}" 
                            onclick="logsManager.goToPage(${i})">${i}</button>
                </li>
            `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += `
                    <li>
                    <span class="w-10 h-10 flex items-center justify-center text-slate-400 font-bold">...</span>
                </li>
            `;
            }
        }

        // Next button
        paginationHTML += `
            <li>
                <button class="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                        ${this.currentPage === totalPages ? 'disabled' : ''} onclick="logsManager.goToPage(${this.currentPage + 1})">
                    Next
                </button>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredEntries.length / this.entriesPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.displayEntries();
        }
        return false; // Prevent default link behavior
    }

    async updateStats() {
        try {
            if (!document.getElementById('inCount') && !document.getElementById('pendingCount')) return;

            const nowStr   = new Date().toLocaleDateString('en-CA');
            const todayD   = new Date(nowStr);
            const monthAgoD = new Date(todayD.getTime() - 30 * 24 * 60 * 60 * 1000);

            let inCount = 0, pendingCount = 0, outCount = 0, monthCount = 0;

            this.entries.forEach(entry => {
                const entryDateStr = entry.date || (entry.timestamp ? entry.timestamp.split('T')[0] : '') || '';
                const entryD = new Date(entryDateStr);

                const rs = String(entry.status || 'pending').toLowerCase();
                if (rs === 'pending') pendingCount++;
                else if (rs === 'in-service') inCount++;
                else if (rs === 'completed') outCount++;

                if (entryD >= monthAgoD && entryD <= todayD) monthCount++;
            });

            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('inCount',      inCount);
            set('pendingCount', pendingCount);
            set('outCount',     outCount);
            set('monthCount',   monthCount);

            // Also update header mini-badges
            set('headerInCount',      inCount);
            set('headerPendingCount', pendingCount);
            set('headerOutCount',     outCount);

            // Show red badge on Bulk Approve button if pending > 0
            const badge = document.getElementById('pendingBadge');
            if (badge) {
                badge.textContent = pendingCount;
                badge.classList.toggle('hidden', pendingCount === 0);
            }

            // Auto-load pending table if visible
            const pendingBody = document.getElementById('pendingTableBody');
            if (pendingBody && pendingBody.innerHTML.includes('animate-pulse')) {
                await this.loadPendingRequests();
            }

        } catch (error) {
            console.error('❌ Error updating stats:', error);
        }
    }

    // ── Load pending requests into bulk-approval panel ───────────
    async loadPendingRequests() {
        const tbody = document.getElementById('pendingTableBody');
        if (!tbody) return;

        const pending = this.entries.filter(e => {
            const rs = String(e.status || 'pending').toLowerCase();
            return rs === 'pending' || rs === 'in-service';
        });

        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400 font-bold italic">No pending requests at this time.</td></tr>`;
            return;
        }

        tbody.innerHTML = pending.map(e => {
            const timeIn = e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';
            const rs = String(e.status || 'pending').toLowerCase();
            const pill = rs === 'in-service'
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase border border-blue-200"><div class="w-1 h-1 rounded-full bg-blue-500"></div>Processing</span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase border border-amber-200"><div class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>Pending</span>`;

            return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td class="px-6 py-4">
                    <input type="checkbox" class="pending-row-check w-4 h-4 rounded border-slate-300" data-entry-id="${e.id}">
                </td>
                <td class="px-6 py-4">
                    <p class="font-bold text-slate-900 dark:text-white text-sm">${e.studentName || '---'}</p>
                    <p class="text-[10px] text-slate-400 font-mono uppercase">${e.studentNumber || ''}</p>
                </td>
                <td class="px-6 py-4">
                    <p class="font-bold text-slate-700 dark:text-slate-200 text-sm">${e.activity || '---'}</p>
                </td>
                <td class="px-6 py-4 text-center">${pill}</td>
                <td class="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm">${e.staff || '---'}</td>
                <td class="px-6 py-4 text-slate-500 text-xs font-bold">${timeIn}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="logsManager.viewEntry('${e.id}')" class="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all mr-1" title="View Details">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    }

    async startService(entryId) {
        try {
            const res = await fetch(`/api/logs/${entryId}/service-start`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffName: window.authManager?.getCurrentUser?.()?.displayName || 'Staff'
                })
            });
            if (!res.ok) throw new Error();
            this.showToast('Request marked as Processing.');
            await this.loadEntries();
            await this.loadPendingRequests();
        } catch {
            this.showToast('Failed to start processing.', 'error');
        }
    }

    async completeRequest(entryId) {
        try {
            const res = await fetch(`/api/logs/${entryId}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffName: window.authManager?.getCurrentUser?.()?.displayName || 'Staff'
                })
            });
            if (!res.ok) throw new Error();
            this.showToast('Request marked as Completed.');
            await this.loadEntries();
            await this.loadPendingRequests();
        } catch {
            this.showToast('Failed to complete request.', 'error');
        }
    }

    async bulkStartService() {
        const checkboxes = [...document.querySelectorAll('.pending-row-check:checked')];
        if (checkboxes.length === 0) {
            this.showToast('No items selected.', 'warning');
            return;
        }
        try {
            this.showToast(`Starting ${checkboxes.length} request(s)…`);
            await Promise.all(checkboxes.map(cb => this.startService(cb.dataset.entryId)));
            document.getElementById('selectAllPending').checked = false;
            await this.loadEntries();
            await this.loadPendingRequests();
        } catch {
            this.showToast('Some updates failed. Please try again.', 'error');
        }
    }

    async bulkCompleteRequests() {
        const checkboxes = [...document.querySelectorAll('.pending-row-check:checked')];
        if (checkboxes.length === 0) {
            this.showToast('No items selected.', 'warning');
            return;
        }
        try {
            this.showToast(`Marking ${checkboxes.length} request(s) as Ready…`);
            await Promise.all(checkboxes.map(cb => this.completeRequest(cb.dataset.entryId)));
            document.getElementById('selectAllPending').checked = false;
            await this.loadEntries();
            await this.loadPendingRequests();
        } catch {
            this.showToast('Some updates failed. Please try again.', 'error');
        }
    }

    async bulkClaimRequests() {
        const checkboxes = [...document.querySelectorAll('.pending-row-check:checked')];
        if (checkboxes.length === 0) {
            this.showToast('No items selected.', 'warning');
            return;
        }
        try {
            this.showToast(`Marking ${checkboxes.length} document(s) as Claimed…`);
            const logIds = checkboxes.map(cb => cb.dataset.entryId);
            const res = await fetch('/api/logs/bulk-claim', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logIds,
                    staffName: window.authManager?.getCurrentUser?.()?.displayName || 'Staff'
                })
            });
            if (!res.ok) throw new Error();
            this.showToast('Selected documents marked as Claimed.');
            document.getElementById('selectAllPending').checked = false;
            await this.loadEntries();
            await this.loadPendingRequests();
        } catch {
            this.showToast('Failed to mark as claimed.', 'error');
        }
    }

    updateInsights() {
        const activityDistributionEl = document.getElementById('activityDistribution');
        const insightTimeFilter = document.getElementById('insightTimeFilter');
        if (!activityDistributionEl) return;

        // Default categories with fixed colors
        const categoryConfig = {
            'Enrollment Concern': 'bg-indigo-600',
            'Document Request': 'bg-emerald-600',
            'Document Pick-up': 'bg-teal-600',
            'Financial Concern': 'bg-rose-600',
            'Inquiry': 'bg-amber-600',
            'Consultation': 'bg-blue-600',
            'Others': 'bg-slate-500'
        };

        // Load custom activities from settings if available
        let predefinedActivities = Object.keys(categoryConfig).filter(k => k !== 'Others');
        if (this.systemSettings && this.systemSettings.activities) {
            try {
                const parsed = JSON.parse(this.systemSettings.activities);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const names = parsed.map(a => typeof a === 'object' ? a.name : a);
                    predefinedActivities = [...new Set([...predefinedActivities, ...names])];
                }
            } catch { }
        }

        const activityCounts = {};
        predefinedActivities.forEach(act => activityCounts[act] = 0);
        activityCounts['Others'] = 0;

        // Determine timeframe
        const timeValue = insightTimeFilter ? insightTimeFilter.value : 'all';
        const nowStr = new Date().toLocaleDateString('en-CA');
        const todayD = new Date(nowStr);

        let validEntries = this.entries;
        if (timeValue !== 'all') {
            validEntries = this.entries.filter(entry => {
                const entryDateStr = entry.date || entry.timestamp.split('T')[0] || '';
                const entryD = new Date(entryDateStr);
                if (timeValue === 'today') return entryDateStr === nowStr;
                if (timeValue === 'week') return entryD >= new Date(todayD.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (timeValue === 'month') return entryD >= new Date(todayD.getTime() - 30 * 24 * 60 * 60 * 1000);
                return true;
            });
        }

        // Smarter grouping: Partial matching + Keyword detection
        validEntries.forEach(entry => {
            const rawAct = (entry.activity || '').toLowerCase();
            
            // 1. Check for "starts with" or exact match against predefined list
            const matchedKey = predefinedActivities.find(a => rawAct.startsWith(a.toLowerCase()));

            if (matchedKey) {
                activityCounts[matchedKey] += 1;
            } else {
                // 2. Keyword check for generic "Others"
                if (rawAct.includes('consult')) {
                    activityCounts['Consultation'] = (activityCounts['Consultation'] || 0) + 1;
                } else if (rawAct.includes('enroll') || rawAct.includes('subject')) {
                    activityCounts['Enrollment Concern'] = (activityCounts['Enrollment Concern'] || 0) + 1;
                } else if (rawAct.includes('inquir') || rawAct.includes('ask')) {
                    activityCounts['Inquiry'] = (activityCounts['Inquiry'] || 0) + 1;
                } else if (rawAct.includes('document') || rawAct.includes('form') || rawAct.includes('request')) {
                    if (rawAct.includes('pick-up') || rawAct.includes('pickup') || rawAct.includes('claim')) {
                        activityCounts['Document Pick-up'] = (activityCounts['Document Pick-up'] || 0) + 1;
                    } else {
                        activityCounts['Document Request'] = (activityCounts['Document Request'] || 0) + 1;
                    }
                } else {
                    activityCounts['Others'] += 1;
                }
            }
        });

        const total = validEntries.length;
        if (total === 0) {
            activityDistributionEl.innerHTML = `<div class="text-center text-xs text-slate-400 py-10 italic">No data to display</div>`;
            return;
        }

        // Sort by count but keep categories with 0 logs if they are predefined (optional: filter 0s to keep it clean)
        const sortedActivities = Object.entries(activityCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        // Secondary colors for any dynamically added activities not in categoryConfig
        const fallbackColors = ['bg-orange-600', 'bg-violet-600', 'bg-cyan-600', 'bg-pink-600'];

        activityDistributionEl.innerHTML = sortedActivities.map(([activity, count], index) => {
            const percentage = Math.round((count / total) * 100);
            const color = categoryConfig[activity] || fallbackColors[index % fallbackColors.length];
            return `
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                        <span class="text-slate-600 dark:text-slate-300">${activity}</span>
                        <span class="text-slate-400 text-right font-black uppercase">
                            ${percentage}% <span class="text-slate-300 font-bold ml-1">(${count} logs)</span>
                        </span>
                    </div>
                    <div class="h-2 w-full bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="${color} h-full rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async completeEntry(entryId) {
        return this.updateEntryStatus(entryId, 'complete');
    }

    async handleClockOut(entryId) {
        this.showConfirm(
            'Clock Out User',
            'Are you sure you want to manually clock out this user? Their session will be ended immediately.',
            async () => {
                const btn = document.getElementById('modalClockOutBtn');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Processing…`;
                    if (window.lucide) window.lucide.createIcons();
                }

                try {
                    const res = await fetch(`/api/logs/${entryId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (res.ok) {
                        this.showToast(`User clocked out successfully.`);
                        await this.loadEntries();
                        if (this.currentEntryId === entryId) {
                            this.viewEntry(entryId);
                        }
                    } else {
                        throw new Error('Clock-out failed');
                    }
                } catch (e) {
                    console.error('Clock-out error:', e);
                    this.showToast('Failed to clock out. Please try again.', 'error');
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = `<i data-lucide="power" class="w-4 h-4"></i> Force Clock Out`;
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            }
        );
    }

    async forceClockOut(entryId) {
        await this.handleClockOut(entryId);
    }

    updateAnalytics() {
        if (!document.getElementById('peakHoursChart')) return; // not on dashboard
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        // ── 1. Peak Hours ──────────────────────────────────────────────────────
        const hourCounts = Array(24).fill(0);
        this.entries.forEach(entry => {
            const ts = this.getTimestamp(entry.timeIn);
            if (ts) hourCounts[new Date(ts).getHours()]++;
        });
        const peakLabels = Array.from({ length: 24 }, (_, i) => {
            const h = i % 12 || 12;
            return `${h}${i < 12 ? 'am' : 'pm'}`;
        });
        if (this._peakChart) this._peakChart.destroy();
        const peakCtx = document.getElementById('peakHoursChart').getContext('2d');
        this._peakChart = new Chart(peakCtx, {
            type: 'bar',
            data: {
                labels: peakLabels,
                datasets: [{
                    data: hourCounts,
                    backgroundColor: hourCounts.map(v => v === Math.max(...hourCounts) && v > 0 ? '#7c3aed' : 'rgba(124,58,237,0.25)'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} visits` } } },
                scales: {
                    x: { ticks: { color: textColor, font: { size: 9, weight: 'bold' } }, grid: { display: false } },
                    y: { ticks: { color: textColor, font: { size: 10 }, stepSize: 1 }, grid: { color: gridColor } }
                }
            }
        });

        // ── 2. Weekly Trend ────────────────────────────────────────────────────
        const days = [];
        const dayCounts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const str = d.toLocaleDateString('en-CA');
            days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
            dayCounts.push(this.entries.filter(e => (e.date || (e.timestamp && e.timestamp.split('T')[0])) === str).length);
        }
        if (this._weekChart) this._weekChart.destroy();
        const weekCtx = document.getElementById('weeklyTrendChart').getContext('2d');
        const weekGradient = weekCtx.createLinearGradient(0, 0, 0, 180);
        weekGradient.addColorStop(0, 'rgba(59,130,246,0.4)');
        weekGradient.addColorStop(1, 'rgba(59,130,246,0)');
        this._weekChart = new Chart(weekCtx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    data: dayCounts,
                    borderColor: '#3b82f6',
                    backgroundColor: weekGradient,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} visits` } } },
                scales: {
                    x: { ticks: { color: textColor, font: { size: 9, weight: 'bold' } }, grid: { display: false } },
                    y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, min: 0 }
                }
            }
        });

        // ── 3. Visitor Type Doughnut ───────────────────────────────────────────
        let students = 0, parents = 0, employees = 0, visitors = 0;
        this.entries.forEach(entry => {
            const sn = (entry.studentNumber || '').toUpperCase();
            const act = (entry.activity || '');
            if (sn === 'PARENT_VISIT' || act.startsWith('[Parent]')) parents++;
            else if (sn === 'EMPLOYEE_LOG' || act.startsWith('[Employee]')) employees++;
            else if (sn === 'VISITOR_VISIT' || act.startsWith('[Visitor]')) visitors++;
            else students++;
        });
        const vtData = [students, parents, employees, visitors];
        const vtLabels = ['Students', 'Parents', 'Employees', 'Visitors'];
        const vtColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];
        const vtTotal = vtData.reduce((a, b) => a + b, 0) || 1;

        if (this._vtChart) this._vtChart.destroy();
        const vtCtx = document.getElementById('visitorTypeChart').getContext('2d');
        this._vtChart = new Chart(vtCtx, {
            type: 'doughnut',
            data: {
                labels: vtLabels,
                datasets: [{ data: vtData, backgroundColor: vtColors, borderWidth: 0, hoverOffset: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw / vtTotal * 100)}%)` } }
                }
            }
        });

        // Custom legend
        const legendEl = document.getElementById('visitorTypeLegend');
        if (legendEl) {
            legendEl.innerHTML = vtLabels.map((label, i) => `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${vtColors[i]}"></div>
                        <span class="font-bold text-slate-600 dark:text-slate-300">${label}</span>
                    </div>
                    <span class="font-black text-slate-400">${vtData[i]} <span class="text-slate-300 font-bold">(${Math.round(vtData[i] / vtTotal * 100)}%)</span></span>
                </div>
            `).join('');
        }

    }

    async handleBulkClockOut() {
        this.showConfirm(
            'Clock-out All Users',
            '⚠️ Are you sure you want to clock out ALL currently active sessions? This will end all visits that haven\'t timed out yet.',
            async () => {
                const btn = document.getElementById('bulkClockOutBtn');
                const originalContent = btn ? btn.innerHTML : '';
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Processing…`;
                    if (window.lucide) window.lucide.createIcons();
                }

                try {
                    const res = await fetch('/api/logs/clear-active', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const data = await res.json();

                    if (res.ok) {
                        this.showToast(`Successfully clocked out ${data.cleared || 0} active session(s).`);
                        await this.loadEntries();
                        this.updateStats();
                    } else {
                        throw new Error(data.error || 'Bulk clock-out failed');
                    }
                } catch (e) {
                    console.error('Bulk clock-out error:', e);
                    this.showToast('Failed to perform bulk clock-out. Please try again.', 'error');
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = originalContent;
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            }
        );
    }

    async updateEntryStatus(entryId, newStatus) {
        try {
            console.log(`🔄 Updating entry ${entryId} to status: ${newStatus}`);

            const response = await fetch(`/api/logs/${entryId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    staffName: window.authManager?.getCurrentUser?.()?.displayName || ''
                })
            });

            if (!response.ok) throw new Error('Failed to update entry status');

            this.showToast(`Status updated to ${newStatus}.`);

            // Reload logs and update UI
            await this.loadEntries();
            this.updateStats();

            // Refresh modal if open
            if (this.currentEntryId === entryId) {
                this.viewEntry(entryId);
            }

        } catch (error) {
            console.error('❌ Error updating entry status:', error);
            this.showToast('Error updating status. Please try again.', 'error');
        }
    }

    async markAsDone(entryId) {
        await this.updateEntryStatus(entryId, 'Completed');
    }

    async updateDocStatus(entryId, newDocStatus) {
        try {
            const response = await fetch(`/api/logs/${entryId}/doc-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docStatus: newDocStatus,
                    staffEmail: window.authManager?.getCurrentUser?.()?.email || 'unknown'
                })
            });

            if (!response.ok) throw new Error('Failed to update document status');

            this.showToast(`Document status updated to ${newDocStatus}.`);
            await this.loadEntries();
            if (this.currentEntryId === entryId) {
                this.viewEntry(entryId);
            }
        } catch (error) {
            console.error('❌ Error updating doc status:', error);
            this.showToast('Error updating document status.', 'error');
        }
    }

    viewEntry(entryId) {
        console.log('🔍 Viewing entry:', entryId);
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry) {
            console.error('❌ Entry not found:', entryId);
            return;
        }

        console.log('✅ Entry found:', entry);

        const entryDetails = document.getElementById('entryDetails');
        if (!entryDetails) {
            console.error('❌ Entry details element not found');
            return;
        }

        const statusBadge = entry.timeOutFormatted
            ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                 <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Checked Out
               </span>`
            : (entry.status === 'pending' || entry.status === 'in-service')
                ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-200 animate-bounce">
                         <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Pending Verification
                       </span>`
                : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                         <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Complete
                       </span>`;

        const duration = this.calculateDuration(entry.timeIn, entry.timeOut);

        entryDetails.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h6 class="text-xs font-black uppercase tracking-widest text-slate-400">Student Information</h6>
                        ${statusBadge}
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                        <p class="text-sm text-slate-500 mb-1">Full Name</p>
                        <p class="font-bold text-slate-900 dark:text-white">${entry.studentName}</p>
                    </div>
                    ${!(entry.studentNumber === 'PARENT_VISIT' || entry.studentNumber === 'EMPLOYEE_LOG' || entry.studentNumber === 'VISITOR_VISIT' || (entry.activity && (entry.activity.startsWith('[Parent]') || entry.activity.startsWith('[Employee]') || entry.activity.startsWith('[Visitor]')))) 
                        ? `<div class="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                                <p class="text-sm text-slate-500 mb-1">Student ID Number</p>
                                <p class="font-bold text-slate-900 dark:text-white">${entry.studentId || 'N/A'}</p>
                           </div>`
                        : ''
                    }
                    ${!(entry.studentNumber === 'PARENT_VISIT' || entry.studentNumber === 'EMPLOYEE_LOG' || entry.studentNumber === 'VISITOR_VISIT' || (entry.activity && (entry.activity.startsWith('[Parent]') || entry.activity.startsWith('[Employee]') || entry.activity.startsWith('[Visitor]')))) 
                        ? `<div class="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                                <p class="text-sm text-slate-500 mb-1">NFC Chip Number</p>
                                <p class="font-mono font-bold text-slate-900 dark:text-white">${entry.studentNumber}</p>
                           </div>`
                        : ''
                    }
                </div>
                <div class="space-y-4">
                    <h6 class="text-xs font-black uppercase tracking-widest text-slate-400">Visit Details</h6>
                    <div class="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <p class="text-sm text-blue-600 dark:text-blue-400 mb-1">Activity</p>
                        <div class="flex items-center justify-between">
                            <p class="font-extrabold text-blue-800 dark:text-white">${entry.activity}</p>
                            ${duration ? `<span class="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-700">Duration: ${duration}</span>` : ''}
                        </div>
                    </div>
                    ${entry.studentNumber !== 'EMPLOYEE_LOG' ? `
                    <div class="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Assigned Staff</p>
                        <p class="font-bold text-slate-900 dark:text-white">${entry.staff || '---'}</p>
                    </div>
                    ` : ''}
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-slate-50 dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                            <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Time In</p>
                            <p class="text-xs font-bold text-emerald-600">${this.formatTime(entry.timeIn)}</p>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                            <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Time Out</p>
                            <p class="text-xs font-bold text-slate-900 dark:text-white">${entry.timeOutFormatted || 'Still Active'}</p>
                        </div>
                    </div>

                    ${entry.proofImage ? `
                        <button class="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700 transition-all font-black uppercase tracking-widest text-xs" onclick="logsManager.viewProof('${entry.proofImage}')">
                            <i data-lucide="file-check" class="w-4 h-4"></i>
                            View Proof
                        </button>
                    ` : ''}

                    ${entry.activity && entry.activity.toLowerCase().startsWith('document request') ? `
                        <div class="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-center">Document Progress</p>
                            <div class="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl gap-1">
                                <button onclick="logsManager.updateDocStatus('${entry.id}', 'In')" 
                                    class="flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${entry.docStatus === 'In' || !entry.docStatus ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">In</button>
                                <button onclick="logsManager.updateDocStatus('${entry.id}', 'Pending')" 
                                    class="flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${entry.docStatus === 'Pending' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">Pending</button>
                                <button onclick="logsManager.updateDocStatus('${entry.id}', 'Out')" 
                                    class="flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${entry.docStatus === 'Out' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">Out</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Clear and populate Administrative Actions in footer
        const adminActionsDir = document.getElementById('modalAdminActions');
        if (adminActionsDir) {
            adminActionsDir.innerHTML = '';
            
            // Mark as Done Button
            if (entry.status === 'Pending' || entry.status === 'In Progress') {
                const doneBtn = document.createElement('button');
                doneBtn.className = 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-emerald-100';
                doneBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Mark Done`;
                doneBtn.onclick = () => this.markAsDone(entryId);
                adminActionsDir.appendChild(doneBtn);
            }

            // Force Clock Out Button
            if (entry.studentNumber === 'EMPLOYEE_LOG' && !entry.timeOut) {
                const clockOutBtn = document.createElement('button');
                clockOutBtn.className = 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-red-100';
                clockOutBtn.innerHTML = `<i data-lucide="power" class="w-4 h-4"></i> Force Clock Out`;
                clockOutBtn.onclick = () => this.forceClockOut(entryId);
                adminActionsDir.appendChild(clockOutBtn);
            }
        }

        lucide.createIcons();

        // Store current entry ID for deletion
        this.currentEntryId = entryId;

        // Show modal (Tailwind manual toggle)
        const modal = document.getElementById('entryModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    viewProof(url) {
        const modal = document.getElementById('proofViewerModal');
        const img = document.getElementById('proofImageElement');
        const iframe = document.getElementById('proofPdfElement');
        if (modal) {
            if (url.toLowerCase().endsWith('.pdf')) {
                if (img) img.classList.add('hidden');
                if (iframe) {
                    iframe.src = url;
                    iframe.classList.remove('hidden');
                }
            } else {
                if (iframe) iframe.classList.add('hidden');
                if (img) {
                    img.src = url;
                    img.classList.remove('hidden');
                }
            }
            modal.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        }
    }

    async deleteCurrentEntry() {
        if (!this.currentEntryId) return;

        this.showConfirm(
            'Delete Entry',
            'Are you sure you want to delete this entry? This action cannot be undone.',
            async () => {
                try {
                    const response = await fetch(`/api/logs/${this.currentEntryId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ officeId: this.officeId })
                    });

                    if (!response.ok) throw new Error('Failed to delete entry');

                    this.entries = this.entries.filter(e => e.id !== this.currentEntryId);
                    this.filteredEntries = this.filteredEntries.filter(e => e.id !== this.currentEntryId);

                    const modal = document.getElementById('entryModal');
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');

                    this.displayEntries();
                    this.updateStats();
                    this.showToast('Entry deleted successfully.');
                } catch (error) {
                    console.error('❌ Error deleting entry:', error);
                    this.showToast('Error deleting entry. Please try again.', 'error');
                }
            }
        );
    }

    exportToCSV() {
        const user = window.authManager?.getCurrentUser();
        if (!user || !user.isAdmin) {
            this.showToast('Access denied. Administrator privileges required to export data.', 'error');
            return;
        }

        if (this.filteredEntries.length === 0) {
            this.showToast('No entries to export');
            return;
        }

        // Create CSV content
        const headers = ['Student Name', 'Student Number', 'Activity', 'Visited Staff', 'Time In', 'Time Out', 'Duration', 'Date', 'Logged By'];
        const rows = this.filteredEntries.map(entry => [
            entry.studentName,
            entry.studentNumber,
            entry.activity,
            entry.staff || 'N/A',
            this.formatTime(entry.timeIn),
            entry.timeOutFormatted || 'Still Active',
            this.calculateDuration(entry.timeIn, entry.timeOut) || '---',
            entry.date || 'N/A',
            entry.staffEmail
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logbook_entries_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    printReport() {
        const user = window.authManager?.getCurrentUser();
        if (!user || !user.isAdmin) {
            this.showToast('Access denied. Administrator privileges required to print reports.', 'error');
            return;
        }

        const printContent = `
            <html>
                <head>
                    <title>Logbook Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
                        .stat-box { text-align: center; padding: 10px; border: 1px solid #ddd; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>📔 Logbook System Report</h1>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <div class="stats">
                        <div class="stat-box">
                            <h3>${document.getElementById('todayCount').textContent}</h3>
                            <p>Daily Traffic</p>
                        </div>
                        <div class="stat-box">
                            <h3>${document.getElementById('activeCount').textContent}</h3>
                            <p>Active Now</p>
                        </div>
                        <div class="stat-box">
                            <h3>${document.getElementById('weekCount').textContent}</h3>
                            <p>This Week</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">Timestamp</th>
                                <th style="width: 15%">Student Name</th>
                                <th style="width: 15%">Activity</th>
                                <th style="width: 15%">Staff</th>
                                <th style="width: 10%">Time In</th>
                                <th style="width: 10%">Time Out</th>
                                <th style="width: 10%">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.filteredEntries.map(entry => `
                                <tr>
                                    <td>${this.formatDateTime(entry.timestamp)}</td>
                                    <td>${entry.studentName}</td>
                                    <td>${entry.activity}</td>
                                    <td>${entry.staff || 'N/A'}</td>
                                    <td>${this.formatTime(entry.timeIn)}</td>
                                    <td>${entry.timeOutFormatted || 'Still Active'}</td>
                                    <td>${entry.date || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    calculateDuration(timeIn, timeOut) {
        if (!timeIn || !timeOut) return null;

        const start = this.getTimestamp(timeIn);
        const end = this.getTimestamp(timeOut);

        if (!start || !end) return null;

        const diffMs = end - start;
        if (diffMs < 0) return null;

        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    getTimestamp(timeValue) {
        if (!timeValue) return null;
        if (typeof timeValue === 'object' && timeValue._seconds !== undefined) {
            return timeValue._seconds * 1000;
        }
        if (timeValue.toDate) {
            return timeValue.toDate().getTime();
        }
        const d = new Date(timeValue);
        return isNaN(d) ? null : d.getTime();
    }

    formatTime(timeValue) {
        if (!timeValue) return 'N/A';

        // Firestore Admin SDK REST response: { _seconds, _nanoseconds }
        if (typeof timeValue === 'object' && timeValue._seconds !== undefined) {
            return new Date(timeValue._seconds * 1000).toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        // Firestore client SDK Timestamp object
        if (timeValue.toDate) {
            return timeValue.toDate().toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        // ISO string or other date string
        if (typeof timeValue === 'string') {
            const d = new Date(timeValue);
            if (!isNaN(d)) {
                return d.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            }
        }

        return 'N/A';
    }

    async generatePDFReport() {
        const user = window.authManager?.getCurrentUser();
        if (!user || !user.isAdmin) {
            this.showToast('Access denied. Administrator privileges required to generate reports.', 'error');
            return;
        }

        const reportTimeFilter = document.getElementById('reportTimeFilter');
        const timeValue = reportTimeFilter ? reportTimeFilter.value : 'all';
        const now = new Date();

        let reportEntries = this.entries;
        let timeframeText = 'Complete History';
        let reportTitle = 'Complete Logbook Report';

        const reportActivityFilter = document.getElementById('reportActivityFilter');
        const activityValue = reportActivityFilter ? reportActivityFilter.value : '';

        const reportFacultyFilter = document.getElementById('reportFacultyFilter');
        const facultyValue = reportFacultyFilter ? reportFacultyFilter.value : '';

        if (timeValue !== 'all' || activityValue || facultyValue) {
            reportEntries = this.entries.filter(entry => {
                let matchesTime = true;
                const entryDate = new Date(entry.timestamp);
                
                if (timeValue === 'today') {
                    matchesTime = entryDate.toDateString() === now.toDateString();
                } else if (timeValue === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesTime = entryDate >= weekAgo;
                } else if (timeValue === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    matchesTime = entryDate >= monthAgo;
                }

                let matchesActivity = true;
                if (activityValue) {
                    matchesActivity = (entry.activity || '').toLowerCase().includes(activityValue.toLowerCase());
                }

                let matchesFaculty = true;
                if (facultyValue) {
                    matchesFaculty = (entry.staff || '') === facultyValue;
                }

                return matchesTime && matchesActivity && matchesFaculty;
            });

            if (timeValue === 'today') timeframeText = 'Daily Report (Today)';
            else if (timeValue === 'week') timeframeText = 'Weekly Report (Last 7 Days)';
            else if (timeValue === 'month') timeframeText = 'Monthly Report (Last 30 Days)';

            if (activityValue) {
                timeframeText += ` - ${activityValue}`;
                reportTitle = `${activityValue} Report`;
            }
            if (facultyValue) {
                timeframeText += ` (Faculty: ${facultyValue})`;
                reportTitle += ` - ${facultyValue}`;
            }
        }

        if (reportEntries.length === 0) {
            this.showToast('No logged data available for ' + timeframeText, 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        // Background / Branding
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTitle, 15, 25);

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        const officeName = (this.systemSettings && this.systemSettings.officeName) || 'Engineering Office';
        const schoolName = (this.systemSettings && this.systemSettings.schoolName) ? `${this.systemSettings.schoolName} • ` : '';
        doc.text(`${schoolName}${officeName} • Generated on ${timestamp}`, 15, 33);

        // Stats Box
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(15, 50, 195, 50);

        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(12);
        doc.text(`${timeframeText} Insights`, 15, 60);

        const activeNow = reportEntries.filter(e => !e.timeOutFormatted).length;
        const stats = [
            `Total Entries: ${reportEntries.length} logs`,
            `Currently Active: ${activeNow} visitors`
        ];

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // slate-600
        stats.forEach((stat, i) => {
            doc.text(stat, 15 + (i * 70), 70);
        });

        // Table
        const headers = [['Date', 'Visitor Name', 'Activity', 'Staff', 'NFC Chip', 'In/Out']];
        const data = reportEntries.map(entry => {
            let displayName = entry.studentName;
            const duration = this.calculateDuration(entry.timeIn, entry.timeOut);
            if (entry.studentNumber === 'PARENT_VISIT' || (entry.activity && entry.activity.startsWith('[Parent]'))) {
                const m = (entry.studentName || '').match(/^(.*?)(?:\s*\(\s*Visiting:\s*(.*?)\s*\))?$/);
                if (m) {
                    const parentName = m[1].trim();
                    displayName = m[2] ? `${parentName} : ${m[2].trim()}` : parentName;
                }
            }

            return [
                entry.date || 'N/A',
                displayName,
                (entry.activity || '—').replace('[Parent] ', '').replace('[Visitor] ', ''),
                entry.staff || 'N/A',
                (entry.studentNumber === 'PARENT_VISIT' || entry.studentNumber === 'VISITOR_VISIT')
                    ? (entry.studentId || (entry.studentNumber === 'PARENT_VISIT' ? 'Parent' : 'Visitor'))
                    : (entry.studentNumber || '—'),
                `${this.formatTime(entry.timeIn)} - ${entry.timeOutFormatted || 'Active'} ${duration ? `(${duration})` : ''}`
            ];
        });

        doc.autoTable({
            startY: 80,
            head: headers,
            body: data,
            theme: 'striped',
            headStyles: {
                fillColor: [37, 99, 235], // blue-600
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [51, 65, 85] // slate-700
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // slate-50
            },
            margin: { top: 80, left: 15, right: 15 }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
            doc.text('© 2026 Logbook Management System • Confidential Engineering Records', 15, 285);
        }

        doc.save(`Logbook_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}

// Initialize logs manager
window.logsManager = new LogsManager();
