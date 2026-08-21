const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || '';
const isLocal = connectionString.includes('localhost') || 
                connectionString.includes('127.0.0.1') || 
                connectionString.includes('@postgres:') || 
                connectionString.includes('sslmode=disable');

const useSsl = !isLocal && (
  connectionString.includes('sslmode=require') || 
  connectionString.includes('neon.tech')
);

const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

module.exports = pool;
