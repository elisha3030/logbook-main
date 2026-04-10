const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
    const db = await open({
        filename: path.join(__dirname, 'local.db'),
        driver: sqlite3.Database
    });

    const result = await db.run(
        "UPDATE logs SET staff = 'Engr. Alvin Destajo' WHERE staff = 'Engr. Alvin Destejo'"
    );

    console.log(`✅ Updated ${result.changes} records from 'Destejo' to 'Destajo'.`);
}

fix();
