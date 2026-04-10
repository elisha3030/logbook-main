const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debug() {
    const db = await open({
        filename: path.join(__dirname, 'local.db'),
        driver: sqlite3.Database
    });

    const rows = await db.all("SELECT DISTINCT staff FROM logs WHERE staff LIKE '%Alvin%'");
    console.log('--- DUPLICATE STAFF DEBUG ---');
    rows.forEach((row, i) => {
        const staff = row.staff || 'NULL';
        console.log(`[${i}] "${staff}" (Length: ${staff.length})`);
        console.log(`Hex: ${Buffer.from(staff).toString('hex')}`);
        // Log character codes to find hidden chars
        let codes = [];
        for(let j=0; j<staff.length; j++) codes.push(staff.charCodeAt(j));
        console.log(`Codes: ${codes.join(',')}`);
    });
}

debug();
