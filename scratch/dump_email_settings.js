const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('local.db');

db.all("SELECT key, value FROM settings WHERE key LIKE 'email_%'", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("--- EMAIL SETTINGS DUMP ---");
    rows.forEach(row => {
        console.log(`${row.key}: ${row.value}`);
    });
    db.close();
});
