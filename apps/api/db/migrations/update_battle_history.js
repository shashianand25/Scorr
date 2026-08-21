const logger = require('../../utils/logger');
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
  logger.info('Migration', 'Columns added');
  process.exit(0);
}
run().catch((err) => {
  logger.error('Migration', 'Failed to update battle_history columns', err);
  process.exit(1);
});
