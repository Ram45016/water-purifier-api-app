const { Pool } = require('pg');
require('dotenv').config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('DATABASE_URL missing in env');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;