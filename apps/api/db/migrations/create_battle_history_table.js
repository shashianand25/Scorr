const logger = require('../../utils/logger');
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS battle_history (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      room_code VARCHAR(255),
      quiz_title VARCHAR(255) NOT NULL,
      my_score INTEGER DEFAULT 0,
      opponent_score INTEGER DEFAULT 0,
      opponent_name VARCHAR(255),
      won BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  logger.info('Migration', 'battle_history table created');
  process.exit(0);
}
run().catch((err) => {
  logger.error('Migration', 'Failed to create battle_history table', err);
  process.exit(1);
});
