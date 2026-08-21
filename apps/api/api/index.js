/**
 * Backend entry point — thin orchestrator.
 * All route handlers live in ./routes/*.js domain modules.
 * Shared DB pool is in ./db/pool.js.
 */
const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const pool = require('../db/pool');

const app = express();
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://scorrapp.com',
  'https://www.scorrapp.com',
  'https://api.scorrapp.com',
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(pattern =>
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    if (isAllowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: `${process.env.JSON_BODY_LIMIT_MB || '10'}mb` }));

// ── Database Bootstrap ────────────────────────────────────────────────────
// Ensure all required tables exist on cold start
pool.query(`
  CREATE TABLE IF NOT EXISTS ai_usage (
    user_id TEXT NOT NULL,
    date    TEXT NOT NULL,
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
  )
`).catch(err => console.error('[Backend] Failed to ensure ai_usage table:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at BIGINT NOT NULL
  )
`).catch(err => console.error('[Backend] Failed to ensure otp_codes table:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS master_quizzes (
    id TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL UNIQUE,
    generation_version TEXT NOT NULL DEFAULT 'v1',
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    category TEXT DEFAULT 'AI Generated',
    question_count INTEGER NOT NULL DEFAULT 0,
    flashcard_count INTEGER NOT NULL DEFAULT 0,
    source_text TEXT NOT NULL,
    created_by_user_id TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_master_quizzes_hash ON master_quizzes(content_hash);
  ALTER TABLE mobile_quizzes ADD COLUMN IF NOT EXISTS master_quiz_id TEXT;
  CREATE INDEX IF NOT EXISTS idx_mobile_quizzes_master_id ON mobile_quizzes(master_quiz_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_quizzes_user_master_unique 
  ON mobile_quizzes(user_id, master_quiz_id) 
  WHERE deleted_at IS NULL AND master_quiz_id IS NOT NULL;
`).catch(err => console.error('[Backend] Failed to ensure master_quizzes table:', err));

// ── Domain Route Modules ──────────────────────────────────────────────────
app.use(require('../routes/ai'));
app.use(require('../routes/users'));
app.use(require('../routes/otp'));
app.use(require('../routes/feedback'));
app.use(require('../routes/history'));
app.use(require('../routes/quizzes'));
app.use(require('../routes/parse'));
app.use(require('../routes/config'));

// ── Server ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// Export for Vercel serverless
module.exports = app;
