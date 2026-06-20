require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
    ALTER TABLE battle_history 
    ADD COLUMN my_time INTEGER,
    ADD COLUMN opponent_time INTEGER;
  `);
  console.log('Columns added');
  process.exit(0);
}
run().catch(console.error);
