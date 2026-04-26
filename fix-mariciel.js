const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
    const db = await open({
        filename: path.join(__dirname, 'local.db'),
        driver: sqlite3.Database
    });

    const variations = [
        'Dr.  Mariciel Teogangco',
        'Dr. Mariciel',
        'Dr. Mariciel Teogangco'
    ];

    let totalChanges = 0;
    for (const v of variations) {
        const result = await db.run(
            "UPDATE logs SET staff = 'Engr. Mariciel Teogangco' WHERE staff = ?",
            [v]
        );
        totalChanges += result.changes;
    }

    console.log(`✅ Consolidated ${totalChanges} records to 'Engr. Mariciel Teogangco'.`);
}

fix();
