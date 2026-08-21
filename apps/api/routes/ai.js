const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ── AI Usage / Rate Limiting ──────────────────────────────────────────────
// Called by the mobile app before every AI generation.
// Increments the user's daily count and returns whether generation is allowed.
router.post('/api/ai/use', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const limit = parseInt(process.env.AI_DAILY_LIMIT || '10', 10);
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  try {
    // Read current usage first
    const check = await pool.query(
      `SELECT count FROM ai_usage WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );
    const used = check.rows[0]?.count ?? 0;

    if (used >= limit) {
      return res.json({ allowed: false, used, limit });
    }

    // Within limit — increment
    const result = await pool.query(
      `INSERT INTO ai_usage (user_id, date, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, date) DO UPDATE SET count = ai_usage.count + 1
       RETURNING count`,
      [userId, today]
    );
    const newCount = result.rows[0].count;
    return res.json({ allowed: true, used: newCount, limit });
  } catch (err) {
    console.error('[Backend] ai/use error:', err);
    // Fail open — don't block generation if the DB is down
    return res.json({ allowed: true, used: 0, limit });
  }
});

module.exports = router;
