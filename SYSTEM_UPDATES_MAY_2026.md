# Recent System Updates & Fixes
*Date: May 3, 2026*

This document summarizes the recent changes, optimizations, and bug fixes applied to the Logbook System.

## 1. Authentication & Login Routing Fixes
We resolved multiple stability issues surrounding staff authentication and routing:
*   **Infinite Redirect Loop Fix:** Faculty accounts that were missing a "Display Name" were previously stuck in an infinite redirect loop between `login.html`, `index.html`, and `faculty.html`. This was fixed by catching the missing display name and rendering an elegant "Account Incomplete" UI directly within the Faculty Hub, gracefully halting the loop.
*   **Direct Dashboard Routing:** Previously, all logins hard-routed the user to the `index.html` Welcome Portal, causing an ugly screen "flash" before the JavaScript evaluated the user's role and redirected them to their proper dashboard. We updated the login endpoint (`/api/auth/login` and `/api/auth/firebase-login`) to explicitly attach the user's role and flags (`isAdmin`, `isFaculty`) to the server response. Now, the system routes users directly:
    *   **Faculty** ➔ Directly to Faculty Hub (`faculty.html`).
    *   **Admins/Superadmins** ➔ Directly to the Main Dashboard (`dashboard.html`).
    *   **Others** ➔ Welcome Portal (`index.html`).

## 2. Kiosk Submission Workflow Optimization
The Document Submission process on the student kiosk was completely transformed to act as a "Drop-off" model, reducing friction and eliminating unnecessary steps.
*   **Bypassed Staff Selection:** Students dropping off documents are no longer asked to select an "In-Charge Staff" member.
*   **Auto-Completion Logic:** Document submissions are now automatically marked with a `status: 'completed'` and log their `timeOut` immediately upon creation, as drop-offs do not require an active "Processing" state.
*   **Success Screen Contextualization:** The kiosk success UI now dynamically adapts to the context of the activity:
    *   *Submissions:* Displays "Document Received!" with a green "Submitted" badge. Staff rows are hidden.
    *   *Requests:* Displays "Request Logged!" with a blinking amber "Incoming / Pending" badge. Staff assignments remain visible.
*   **Catalog Refinements:** Cleaned up the document catalog by updating category names (e.g., standardizing "Clearance").

## 3. Staff Monitor UI Implementation
Added the **Staff Monitor** interface (`staff-monitor.html`) to give administrators real-time oversight of their team.
*   Displays which faculty members are currently clocked in.
*   Tracks daily performance metrics and total hours worked.

## 4. API Testing Scripts
Introduced new scripts to automate testing and simplify debugging:
*   `test-system.js`: A comprehensive API test suite that validates the full log lifecycle (creation, approval, completion) and ensures duplicate claims are prevented.
*   `approve-test-student.js`: A utility script to automatically approve unverified test students in the database. *(Note: Requires the server to be offline when running due to SQLite WAL mode locks).*

## 5. Repository Maintenance
*   All recent changes have been successfully staged, committed, and pushed to the remote `main` branch on GitHub.
