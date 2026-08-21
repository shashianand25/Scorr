const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { Resend } = require('resend');
const logger = require('../utils/logger');

// Lazy getter — instantiated on first use so missing RESEND_API_KEY doesn't crash on require()
let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

// ── OTP Email Passcode Verification ──────────────────────────────────────────
router.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    // Store in Postgres DB (works across all serverless instances and cold starts)
    await pool.query(
      `INSERT INTO otp_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
      [cleanEmail, code, expiresAt]
    );

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'support@scorrapp.com';

    if (process.env.RESEND_API_KEY) {
      try {
        await getResend().emails.send({
          from: `Scorrapp <${fromEmail}>`,
          to: cleanEmail,
          subject: `${code} is your Scorrapp verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 40px 20px; border-radius: 12px; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #6366f1; margin-top: 0; text-align: center; font-size: 24px;">Welcome to Scorrapp!</h2>
              <p style="color: #94a3b8; font-size: 15px; text-align: center; line-height: 22px;">Enter this 6-digit passcode to verify your email and complete your account creation:</p>
              <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; text-align: center;">This passcode will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `
        });
        console.log(`[Backend] OTP sent to ${cleanEmail}`);
        return res.json({ ok: true });
      } catch (primaryErr) {
        console.warn("[Backend] Primary domain email send failed, trying fallback resend address:", primaryErr);
        await getResend().emails.send({
          from: 'onboarding@resend.dev',
          to: cleanEmail,
          subject: `${code} is your Scorrapp verification code`,
          html: `<p>Your Scorrapp verification code is <strong>${code}</strong></p>`
        });
        return res.json({ ok: true });
      }
    } else {
      logger.warn('OTP', 'RESEND_API_KEY missing. Returning OTP code in dev mode');
      res.json({ ok: true, devCode: code });
    }
  } catch (err) {
    logger.error('OTP', 'Resend email send failed', err, { email: cleanEmail });
    res.status(500).json({ error: "Failed to send verification email. Please check your email and try again." });
  }
});

router.post('/api/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ valid: false, error: 'Email and passcode are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      `SELECT code, expires_at FROM otp_codes WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ valid: false, error: 'No verification passcode found. Please request a new code.' });
    }

    const { code: savedCode, expires_at: expiresAt } = result.rows[0];

    if (Date.now() > Number(expiresAt)) {
      await pool.query(`DELETE FROM otp_codes WHERE LOWER(email) = LOWER($1)`, [cleanEmail]);
      return res.status(400).json({ valid: false, error: 'Verification code has expired. Please request a new code.' });
    }

    if (savedCode !== code.trim()) {
      return res.status(400).json({ valid: false, error: 'Incorrect passcode. Please check your email and try again.' });
    }

    // Code matches! Clear entry
    await pool.query(`DELETE FROM otp_codes WHERE LOWER(email) = LOWER($1)`, [cleanEmail]);
    return res.json({ valid: true });
  } catch (err) {
    logger.error('OTP', 'verify-otp error', err, { email: cleanEmail });
    return res.status(500).json({ valid: false, error: 'Failed to verify passcode. Please try again.' });
  }
});

module.exports = router;
