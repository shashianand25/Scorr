require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      user_email VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Feedback table created');
  process.exit(0);
}
run().catch(console.error);
