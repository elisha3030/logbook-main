/**
 * navigation.js
 * Dynamically injects the "Faculty Hubs" sidebar section on all management pages.
 * Faculty names are stored as a JSON array in the `faculty` settings key.
 *
 * Usage: <script type="module" src="js/navigation.js"></script>
 * Requires: a <nav id="mainNav"> element in the sidebar (or the nav element that
 *           contains System Settings link), and a placeholder element:
 *           <div id="facultyHubsSection"></div>
 */

async function loadFacultySidebar() {
    const placeholder = document.getElementById('facultyHubsSection');
    if (!placeholder) return;

    // Role-aware navigation: faculty accounts should only see their own hub.
    let sessionUser = null;
    try {
        const sesRes = await fetch('/api/auth/session');
        const sesData = await sesRes.json();
        if (sesData?.authenticated && sesData?.user) sessionUser = sesData.user;
    } catch (_) {
        sessionUser = null;
    }

    const role = String(sessionUser?.role || '').toLowerCase().trim();
    // Role string is source-of-truth; flags are treated as hints.
    const isFaculty = role === 'faculty' || !!sessionUser?.isFaculty;
    const isAdmin = (role === 'admin' || role === 'superadmin') || (!!sessionUser?.isAdmin && !isFaculty);

    // Determine current page for active-state styling
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    if (isFaculty && !isAdmin) {
        const enforcedName = String(sessionUser?.displayName || '').trim();
        if (!enforcedName) {
            placeholder.innerHTML = `
                <div class="pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 mb-3">
                    Faculty Hub
                </div>
                <div class="px-4 py-3 text-slate-300 text-sm font-semibold">
                    Missing display name. Ask an admin to set it.
                </div>
            `;
        } else {
            const encoded = encodeURIComponent(enforcedName);
            const isActive = currentPage === 'faculty.html' &&
                new URLSearchParams(window.location.search).get('staff') === enforcedName;

            placeholder.innerHTML = `
                <div class="pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 mb-3">
                    Faculty Hub
                </div>
                <a href="faculty.html?staff=${encoded}"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold group ${isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }">
                    <i data-lucide="user-round" class="w-5 h-5 ${isActive ? '' : 'group-hover:text-purple-400 transition-colors'}"></i>
                    <span class="truncate">${_escape(enforcedName)}</span>
                </a>
            `;
        }

        // Re-initialize Lucide icons for freshly injected icons
        if (window.lucide) {
            lucide.createIcons();
        }
        return;
    }

    placeholder.innerHTML = '';
}

function _escape(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFacultySidebar);
} else {
    loadFacultySidebar();
}
