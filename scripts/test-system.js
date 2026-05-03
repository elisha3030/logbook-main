/**
 * ─────────────────────────────────────────────────────────
 * LOGBOOK SYSTEM — Automated API Test Suite
 * Run with:  node scripts/test-system.js
 * Requires the server to be running on http://localhost:3000
 * ─────────────────────────────────────────────────────────
 */

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let warnings = 0;
const results = [];

// ── Helpers ──────────────────────────────────────────────
function color(code, text) {
    const RESET = '\x1b[0m';
    const COLORS = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m' };
    return `${COLORS[code] || ''}${text}${RESET}`;
}

function log(status, name, detail = '') {
    const icon = status === 'PASS' ? color('green', '✓') : status === 'FAIL' ? color('red', '✗') : color('yellow', '⚠');
    const label = status === 'PASS' ? color('green', 'PASS') : status === 'FAIL' ? color('red', 'FAIL') : color('yellow', 'WARN');
    console.log(`  ${icon} [${label}] ${name}${detail ? color('dim', ' — ' + detail) : ''}`);
    results.push({ status, name, detail });
    if (status === 'PASS') passed++;
    else if (status === 'FAIL') failed++;
    else warnings++;
}

async function api(method, path, body = null, expectedStatus = 200) {
    try {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${BASE}${path}`, opts);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        return { status: res.status, ok: res.ok, json, text };
    } catch (err) {
        return { status: 0, ok: false, json: null, text: '', error: err.message };
    }
}

// ── Test Suites ───────────────────────────────────────────

async function testServerReachability() {
    console.log(color('bold', '\n📡 [1] Server Reachability'));

    const res = await api('GET', '/api/system-settings');
    if (res.status === 0) {
        log('FAIL', 'Server is online', `Cannot reach ${BASE} — Is the server running?`);
        console.log(color('red', '\n  ✗ Server is offline. Start the server with "npm start" first.\n'));
        process.exit(1);
    }
    log('PASS', 'Server is online', `Responded with HTTP ${res.status}`);
}

async function testSystemSettings() {
    console.log(color('bold', '\n⚙️  [2] System Settings API'));

    const res = await api('GET', '/api/system-settings');
    if (res.ok && res.json) {
        log('PASS', 'GET /api/system-settings returns JSON');
    } else {
        log('FAIL', 'GET /api/system-settings', `HTTP ${res.status}`);
    }
}

async function testStudentLookup() {
    console.log(color('bold', '\n🎓 [3] Student Lookup API'));

    // Valid student lookup (may 404 if no students yet)
    const r1 = await api('GET', '/api/students/NONEXISTENT123');
    if (r1.status === 404) {
        log('PASS', 'GET /api/students/:id → 404 for unknown ID');
    } else if (r1.ok) {
        log('WARN', 'GET /api/students/:id returned 200 for NONEXISTENT123', 'Possible ghost record issue');
    } else {
        log('FAIL', 'GET /api/students/:id', `Unexpected status ${r1.status}`);
    }

    // All students list
    const r2 = await api('GET', '/api/students');
    if (r2.ok && Array.isArray(r2.json)) {
        log('PASS', `GET /api/students returns array`, `${r2.json.length} students found`);
        return r2.json; // return for use in other tests
    } else if (r2.ok && r2.json) {
        log('WARN', 'GET /api/students returned non-array JSON');
    } else {
        log('FAIL', 'GET /api/students', `HTTP ${r2.status}`);
    }
    return [];
}

async function testLogCreation() {
    console.log(color('bold', '\n📝 [4] Log Creation (Document Submission Flow)'));

    const logData = {
        studentNumber: 'TEST_AUTO_001',
        studentName: 'Test Student Automated',
        studentId: 'TEST-001',
        activity: 'Document Submission: Concept Paper',
        docType: 'submission',
        staff: 'Superadmin',
        yearLevel: '3rd Year',
        course: 'BSIT',
        date: new Date().toISOString().split('T')[0],
        docStatus: 'In',
        status: 'completed',
        timeOut: new Date().toISOString()
    };

    const res = await api('POST', '/api/logs', { logData, officeId: 'engineering-office' });
    if (res.ok && res.json?.id) {
        log('PASS', 'POST /api/logs creates a completed submission log', `Log ID: ${res.json.id}`);
        return res.json.id;
    } else {
        log('FAIL', 'POST /api/logs (submission)', `HTTP ${res.status} — ${res.text?.slice(0, 100)}`);
        return null;
    }
}

async function testPendingLogCreation() {
    console.log(color('bold', '\n📋 [5] Log Creation (Document Request — Pending Flow)'));

    const logData = {
        studentNumber: 'TEST_AUTO_002',
        studentName: 'Test Student Request',
        studentId: 'TEST-002',
        activity: 'Certificate of Registration',
        docType: 'certificate',
        staff: 'Test Faculty',
        yearLevel: '2nd Year',
        course: 'BSCS',
        date: new Date().toISOString().split('T')[0],
        docStatus: 'In',
        status: 'pending',
    };

    const res = await api('POST', '/api/logs', { logData, officeId: 'engineering-office' });
    if (res.ok && res.json?.id) {
        log('PASS', 'POST /api/logs creates a pending document request log', `Log ID: ${res.json.id}`);
        return res.json.id;
    } else {
        log('FAIL', 'POST /api/logs (request)', `HTTP ${res.status} — ${res.text?.slice(0, 100)}`);
        return null;
    }
}

async function testLogStatusUpdates(logId) {
    console.log(color('bold', '\n🔄 [6] Log Status Lifecycle (Pending → In-Service → Completed)'));

    if (!logId) {
        log('WARN', 'Skipping log lifecycle tests — no log ID available');
        return;
    }

    // Start service
    const r1 = await api('PATCH', `/api/logs/${logId}/service-start`, { staffName: 'Test Staff' });
    if (r1.ok) {
        log('PASS', `PATCH /api/logs/${logId}/service-start → in-service`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/service-start`, `HTTP ${r1.status}`);
    }

    // Complete
    const r2 = await api('PATCH', `/api/logs/${logId}/complete`, { staffName: 'Test Staff', officeId: 'engineering-office' });
    if (r2.ok) {
        log('PASS', `PATCH /api/logs/${logId}/complete → completed`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/complete`, `HTTP ${r2.status}`);
    }

    // Generic status update
    const r3 = await api('PATCH', `/api/logs/${logId}/status`, { status: 'completed', staffName: 'Test Staff' });
    if (r3.ok) {
        log('PASS', `PATCH /api/logs/${logId}/status (generic toggle)`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/status`, `HTTP ${r3.status}`);
    }
}

async function testDocStatusUpdate(logId) {
    console.log(color('bold', '\n📂 [7] Document Status (In / Out Toggle)'));

    if (!logId) {
        log('WARN', 'Skipping doc status tests — no log ID available');
        return;
    }

    // Valid In
    const r1 = await api('PATCH', `/api/logs/${logId}/doc-status`, { docStatus: 'In' });
    if (r1.ok) {
        log('PASS', `PATCH /api/logs/${logId}/doc-status → "In"`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/doc-status "In"`, `HTTP ${r1.status}`);
    }

    // Valid Out
    const r2 = await api('PATCH', `/api/logs/${logId}/doc-status`, { docStatus: 'Out' });
    if (r2.ok) {
        log('PASS', `PATCH /api/logs/${logId}/doc-status → "Out"`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/doc-status "Out"`, `HTTP ${r2.status}`);
    }

    // Invalid value — should be rejected
    const r3 = await api('PATCH', `/api/logs/${logId}/doc-status`, { docStatus: 'INVALID' });
    if (r3.status === 400) {
        log('PASS', `PATCH /api/logs/${logId}/doc-status with "INVALID" → correctly rejected 400`);
    } else {
        log('FAIL', `PATCH /api/logs/${logId}/doc-status with invalid value`, `Expected 400, got ${r3.status}`);
    }
}

async function testLogsRetrieval() {
    console.log(color('bold', '\n📊 [8] Logs Retrieval & Filtering'));

    // Recent logs
    const r1 = await api('GET', '/api/logs?officeId=engineering-office&limit=10');
    if (r1.ok && Array.isArray(r1.json)) {
        log('PASS', 'GET /api/logs returns array', `${r1.json.length} logs`);

        // Check that submission logs have status = 'completed'
        const submissions = r1.json.filter(l => l.activity?.includes('Document Submission'));
        const pendingSubmissions = submissions.filter(l => l.status === 'pending');
        if (pendingSubmissions.length === 0) {
            log('PASS', 'Document Submissions are never left as "pending"');
        } else {
            log('WARN', `${pendingSubmissions.length} Document Submission(s) still have status "pending"`, 'Expected "completed"');
        }
    } else {
        log('FAIL', 'GET /api/logs', `HTTP ${r1.status}`);
    }

    // Queue endpoint
    const r2 = await api('GET', '/api/logs/queue?officeId=engineering-office');
    if (r2.ok) {
        log('PASS', 'GET /api/logs/queue returns data');
    } else {
        log('WARN', 'GET /api/logs/queue', `HTTP ${r2.status} — endpoint may not exist`);
    }
}

async function testFacultyEndpoints() {
    console.log(color('bold', '\n👩‍🏫 [9] Faculty & Staff API'));

    const r1 = await api('GET', '/api/faculty?officeId=engineering-office');
    if (r1.ok && (Array.isArray(r1.json) || typeof r1.json === 'object')) {
        log('PASS', 'GET /api/faculty returns data');
    } else {
        log('FAIL', 'GET /api/faculty', `HTTP ${r1.status}`);
    }
}

async function testInvalidRoutes() {
    console.log(color('bold', '\n🚫 [10] Invalid Route Handling'));

    const r1 = await api('GET', '/api/nonexistent-route-xyz');
    if (r1.status === 404) {
        log('PASS', 'Unknown API route → 404');
    } else {
        log('WARN', 'Unknown API route did not return 404', `Got ${r1.status}`);
    }

    // Malformed log body
    const r2 = await api('POST', '/api/logs', { logData: null, officeId: 'engineering-office' });
    if (!r2.ok) {
        log('PASS', 'POST /api/logs with null logData → rejected');
    } else {
        log('WARN', 'POST /api/logs with null logData was accepted', 'Missing input validation');
    }
}

async function testStaticPages() {
    console.log(color('bold', '\n🌐 [11] Static Page Availability'));

    const pages = [
        '/student-logs.html',
        '/faculty.html',
        '/staff-monitor.html',
        '/history.html',
        '/index.html',
    ];

    for (const page of pages) {
        const res = await api('GET', page);
        if (res.ok) {
            log('PASS', `${page} is accessible`);
        } else {
            log('FAIL', `${page}`, `HTTP ${res.status} — Page not found`);
        }
    }
}

async function testClaimFlow(pendingLogId) {
    console.log(color('bold', '\n📦 [12] Document Claim (Pick-up) Flow'));

    if (!pendingLogId) {
        log('WARN', 'Skipping claim test — no pending log ID');
        return;
    }

    const r1 = await api('PATCH', `/api/logs/${pendingLogId}/claim`, {
        studentNumber: 'TEST_AUTO_002',
        officeId: 'engineering-office'
    });
    if (r1.ok) {
        log('PASS', `PATCH /api/logs/${pendingLogId}/claim → document claimed`);
    } else if (r1.status === 400) {
        log('WARN', `Claim failed — log may not be in a claimable state yet`, `HTTP 400`);
    } else {
        log('FAIL', `PATCH /api/logs/${pendingLogId}/claim`, `HTTP ${r1.status}`);
    }
}

async function testClaimOnCompletedLog(completedLogId) {
    console.log(color('bold', '\n🔒 [13] Security — Claim on Already-Completed Log'));

    if (!completedLogId) {
        log('WARN', 'Skipping — no completed log ID available');
        return;
    }

    // Try to claim a log already marked completed — server SHOULD reject this
    const r1 = await api('PATCH', `/api/logs/${completedLogId}/claim`, {
        studentNumber: 'TEST_AUTO_001',
        officeId: 'engineering-office'
    });

    if (!r1.ok) {
        log('PASS', 'Claim on an already-completed log is correctly rejected');
    } else {
        log('WARN', 'Claim succeeded on an already-completed log', '🐛 Bug: server should reject duplicate claims');
    }
}

// ── Summary ───────────────────────────────────────────────
function printSummary() {
    const total = passed + failed + warnings;
    console.log('\n' + color('bold', '─'.repeat(52)));
    console.log(color('bold', '  TEST SUMMARY'));
    console.log(color('bold', '─'.repeat(52)));
    console.log(`  Total Tests : ${total}`);
    console.log(`  ${color('green', '✓ Passed')}  : ${passed}`);
    console.log(`  ${color('red', '✗ Failed')}  : ${failed}`);
    console.log(`  ${color('yellow', '⚠ Warnings')}: ${warnings}`);
    console.log(color('bold', '─'.repeat(52)));

    if (failed > 0) {
        console.log(color('red', '\n  FAILED TESTS:'));
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(color('red', `  ✗ ${r.name}`));
            if (r.detail) console.log(color('dim', `    → ${r.detail}`));
        });
    }

    if (warnings > 0) {
        console.log(color('yellow', '\n  WARNINGS (potential bugs):'));
        results.filter(r => r.status === 'WARN').forEach(r => {
            console.log(color('yellow', `  ⚠ ${r.name}`));
            if (r.detail) console.log(color('dim', `    → ${r.detail}`));
        });
    }

    const verdict = failed === 0
        ? color('green', '\n  ✅ All critical tests passed!')
        : color('red', `\n  ❌ ${failed} critical test(s) failed. Review the items above.`);
    console.log(verdict);
    console.log('');
}

// ── Cleanup ───────────────────────────────────────────────
async function cleanupTestData() {
    console.log(color('bold', '\n🧹 [14] Cleaning Up Test Data'));

    const nodePath = require('path');
    const { open } = require('sqlite');
    const sqlite3 = require('sqlite3');

    try {
        const db = await open({
            filename: nodePath.join(__dirname, '..', 'local.db'),
            driver: sqlite3.Database
        });

        const result = await db.run(
            "DELETE FROM logs WHERE studentNumber LIKE 'TEST_AUTO_%'"
        );
        await db.close();

        const count = result.changes || 0;
        if (count > 0) {
            log('PASS', `Deleted ${count} test record(s) from local.db`);
        } else {
            log('PASS', 'No leftover test records found in local.db');
        }
    } catch (err) {
        log('WARN', 'Could not auto-clean test records from DB', err.message);
    }
}

// ── Runner ────────────────────────────────────────────────
(async () => {
    console.log(color('bold', '\n══════════════════════════════════════════════════════'));
    console.log(color('bold', '  LOGBOOK SYSTEM — Automated Test Suite'));
    console.log(color('bold', `  Target: ${BASE}`));
    console.log(color('bold', `  Time  : ${new Date().toLocaleString()}`));
    console.log(color('bold', '══════════════════════════════════════════════════════'));

    await testServerReachability();
    await testSystemSettings();
    await testStudentLookup();
    const submissionLogId = await testLogCreation();
    const pendingLogId = await testPendingLogCreation();
    await testLogStatusUpdates(pendingLogId);
    await testDocStatusUpdate(submissionLogId);
    await testLogsRetrieval();
    await testFacultyEndpoints();
    await testInvalidRoutes();
    await testStaticPages();
    await testClaimFlow(pendingLogId);
    await testClaimOnCompletedLog(submissionLogId);

    printSummary();
    await cleanupTestData();
    console.log(color('dim', '  Test run complete.\n'));
})();
