const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function debug() {
    const db = await open({
        filename: path.join(__dirname, 'local.db'),
        driver: sqlite3.Database
    });

    const rows = await db.all("SELECT DISTINCT staff FROM logs WHERE staff LIKE '%Alvin%'");
    let output = '--- DUPLICATE STAFF DEBUG ---\n';
    rows.forEach((row, i) => {
        const staff = row.staff || 'NULL';
        output += `[${i}] "${staff}" (Length: ${staff.length})\n`;
        output += `Hex: ${Buffer.from(staff).toString('hex')}\n`;
        let codes = [];
        for(let j=0; j<staff.length; j++) codes.push(staff.charCodeAt(j));
        output += `Codes: ${codes.join(',')}\n\n`;
    });
    fs.writeFileSync('staff-debug-out.txt', output);
    console.log('Results written to staff-debug-out.txt');
}

debug();
