const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3').verbose();

(async () => {
    const db = await open({
        filename: path.join(__dirname, '..', 'local.db'),
        driver: sqlite3.Database
    });

    // Use WAL checkpoint before writing
    await db.run('PRAGMA wal_checkpoint(PASSIVE)');
    await db.run("UPDATE students SET isApproved=1 WHERE barcode='0003331211'");
    
    const row = await db.get("SELECT barcode, name, isApproved FROM students WHERE barcode='0003331211'");
    console.log('Result:', row);
    await db.close();
})();
