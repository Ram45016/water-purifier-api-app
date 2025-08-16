const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required in .env');
  process.exit(1);
}
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const sql = fs.readFileSync(path.join(process.cwd(),'schema.sql'),'utf-8');
    await pool.query(sql);
    console.log('Schema applied');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();