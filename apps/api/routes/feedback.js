const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { Resend } = require('resend');
const { feedbackSchema } = require('../schemas');
const logger = require('../utils/logger');

// Lazy getter — instantiated on first use
let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

// Helper for generating simple UUIDs if not provided by client
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ── Feedback ─────────────────────────────────────────────────────────────
router.post('/api/feedback', async (req, res) => {
  const result = feedbackSchema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: errorMessages });
  }
  const { userId, userEmail, message } = result.data;
  const feedbackId = generateId();
  try {
    // Store in DB
    await pool.query(
      `INSERT INTO user_feedback (id, user_id, user_email, message) VALUES ($1, $2, $3, $4)`,
      [feedbackId, userId || null, userEmail || null, message]
    );

    // Send Email via Resend
    if (process.env.RESEND_API_KEY) {
      await getResend().emails.send({
        from: 'support@scorrapp.com',
        to: process.env.ADMIN_EMAIL || 'shashianand2005@gmail.com',
        subject: `New Recall Feedback from ${userEmail || 'Anonymous'}`,
        text: `User ID: ${userId || 'N/A'}\nUser Email: ${userEmail || 'N/A'}\n\nFeedback:\n${message}`
      });
    } else {
      logger.warn('Feedback', 'Feedback not emailed: RESEND_API_KEY is missing from environment');
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error('Feedback', 'Failed to process feedback submission', err, { userId, userEmail });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
