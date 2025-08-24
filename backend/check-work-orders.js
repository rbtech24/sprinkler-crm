const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('data/sprinkler_repair.db');

console.log('Work Orders Table Structure:');

db.all('PRAGMA table_info(work_orders)', (err, info) => {
  if (err) {
    console.error('Error:', err);
  } else {
    if (info.length === 0) {
      console.log('Table does not exist!');
    } else {
      info.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
    }
  }
  db.close();
});