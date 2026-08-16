const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');
const { Resend } = require('resend');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(compression());
const resend = new Resend(process.env.RESEND_API_KEY);
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
    // Allow requests with no origin (like native mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(pattern =>
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: `${process.env.JSON_BODY_LIMIT_MB || '10'}mb` }));

// Initialize Postgres connection pool
// Neon provides a postgres connection string like postgresql://user:password@host/dbname
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper for generating simple UUIDs if not provided by client
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Ensure ai_usage table exists (runs once on cold start)
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

// ── AI Usage / Rate Limiting ──────────────────────────────────────────────
// Called by the mobile app before every AI generation.
// Increments the user's daily count and returns whether generation is allowed.
app.post('/api/ai/use', async (req, res) => {
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

// ── Users ────────────────────────────────────────────────────────────────
app.post('/api/sync-user', async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  
  try {
    const query = `
      INSERT INTO users (id, email, display_name, photo_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        display_name = EXCLUDED.display_name, 
        photo_url = EXCLUDED.photo_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await pool.query(query, [uid, email, displayName, photoURL]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sync-user', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  try {
    await pool.query(`DELETE FROM quiz_history WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM mobile_quizzes WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── OTP Email Passcode Verification ──────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
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
        await resend.emails.send({
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
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: cleanEmail,
          subject: `${code} is your Scorrapp verification code`,
          html: `<p>Your Scorrapp verification code is <strong>${code}</strong></p>`
        });
        return res.json({ ok: true });
      }
    } else {
      console.warn("[Backend] RESEND_API_KEY missing. Returning OTP code in dev mode.");
      res.json({ ok: true, devCode: code });
    }
  } catch (err) {
    console.error("[Backend] Resend email send failed:", err);
    res.status(500).json({ error: "Failed to send verification email. Please check your email and try again." });
  }
});

app.post('/api/verify-otp', async (req, res) => {
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
    console.error('[Backend] verify-otp error:', err);
    return res.status(500).json({ valid: false, error: 'Failed to verify passcode. Please try again.' });
  }
});

// ── Feedback ─────────────────────────────────────────────────────────────
app.post('/api/feedback', async (req, res) => {
  const { userId, userEmail, message } = req.body;
  const feedbackId = generateId();
  try {
    // Store in DB
    await pool.query(
      `INSERT INTO user_feedback (id, user_id, user_email, message) VALUES ($1, $2, $3, $4)`,
      [feedbackId, userId || null, userEmail || null, message]
    );

    // Send Email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'support@scorrapp.com',
        to: process.env.ADMIN_EMAIL || 'shashianand2005@gmail.com',
        subject: `New Recall Feedback from ${userEmail || 'Anonymous'}`,
        text: `User ID: ${userId || 'N/A'}\nUser Email: ${userEmail || 'N/A'}\n\nFeedback:\n${message}`
      });
    } else {
      console.warn("Feedback not emailed: RESEND_API_KEY is missing from environment.");
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Quiz History ─────────────────────────────────────────────────────────
app.post('/api/quiz-history', async (req, res) => {
  const { userId, quizTitle, totalQuestions, correct, wrong, score, durationSec, wrongQuestions } = req.body;
  const eventId = generateId();
  
  try {
    const metadata = JSON.stringify({
      quizTitle, totalQuestions, correct, wrong, score, durationSec, wrongQuestions
    });
    
    // Insert history
    await pool.query(
      `INSERT INTO quiz_history (id, user_id, metadata) VALUES ($1, $2, $3)`,
      [eventId, userId, metadata]
    );
    
    // Update user XP
    const xpGain = score; // simplified xp logic
    const userUpdate = await pool.query(
      `UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp, level`,
      [xpGain, userId]
    );
    
    res.json({ eventId, xpGain });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz-history', async (req, res) => {
  const { userId, limit = 20 } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM quiz_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, parseInt(limit)]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Battle History ───────────────────────────────────────────────────────
app.post('/api/battle-history', async (req, res) => {
  const { userId, roomCode, quizTitle, myScore, opponentScore, opponentName, won, myTime, opponentTime, questions, answers } = req.body;
  const eventId = generateId();
  
  try {
    await pool.query(
      `INSERT INTO battle_history (id, user_id, room_code, quiz_title, my_score, opponent_score, opponent_name, won, my_time, opponent_time, questions, answers) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        eventId,
        userId,
        roomCode,
        quizTitle,
        myScore,
        opponentScore,
        opponentName,
        won,
        myTime || null,
        opponentTime || null,
        JSON.stringify(questions || []),
        JSON.stringify(answers || {})
      ]
    );
    res.json({ eventId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/battle-history', async (req, res) => {
  const { userId, limit = 50 } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM battle_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [userId, parseInt(limit)]
    );
    const history = result.rows.map(r => ({
      ...r,
      questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : (r.questions || []),
      answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {})
    }));
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Mobile Quizzes ───────────────────────────────────────────────────────
app.get('/api/share/quiz/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT id, title, category, question_count, source_text FROM mobile_quizzes WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const r = result.rows[0];
    res.json({ quiz: { ...r, questionCount: r.question_count, sourceText: r.source_text } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mobile-quizzes', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM mobile_quizzes WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
    const quizzes = result.rows.map(r => {
      const cleanSourceText = typeof r.source_text === 'string'
        ? r.source_text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        : r.source_text;

      const safeParse = (val, fallback = []) => {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try { return JSON.parse(val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')); } catch { return fallback; }
      };

      return {
        ...r,
        questionCount: r.question_count,
        sourceText: cleanSourceText,
        wrongQuestions: safeParse(r.wrong_questions, []),
        uniqueCorrectIds: safeParse(r.unique_correct_ids, []),
        attempts: safeParse(r.attempts, [])
      };
    });
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mobile-quizzes', async (req, res) => {
  const { id, userId, title, category, questionCount, sourceText, attempts, wrongQuestions, uniqueCorrectIds } = req.body;
  const quizId = id || generateId();
  try {
    const result = await pool.query(
      `INSERT INTO mobile_quizzes (id, user_id, title, category, question_count, source_text, attempts, wrong_questions, unique_correct_ids) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         question_count = EXCLUDED.question_count,
         source_text = EXCLUDED.source_text,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [quizId, userId, title, category, questionCount || 0, sourceText || '', JSON.stringify(attempts || []), JSON.stringify(wrongQuestions || []), JSON.stringify(uniqueCorrectIds || [])]
    );
    const r = result.rows[0];
    res.json({ quiz: { ...r, questionCount: r.question_count, sourceText: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/mobile-quizzes', async (req, res) => {
  const { userId, quizId, title, category, questionCount, sourceText, attempts, wrongQuestions, uniqueCorrectIds } = req.body;
  try {
    const updates = [];
    const values = [];
    let i = 1;
    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
    if (category !== undefined) { updates.push(`category = $${i++}`); values.push(category); }
    if (questionCount !== undefined) { updates.push(`question_count = $${i++}`); values.push(questionCount); }
    if (sourceText !== undefined) { updates.push(`source_text = $${i++}`); values.push(sourceText); }
    if (attempts !== undefined) { updates.push(`attempts = $${i++}`); values.push(JSON.stringify(attempts)); }
    if (wrongQuestions !== undefined) { updates.push(`wrong_questions = $${i++}`); values.push(JSON.stringify(wrongQuestions)); }
    if (uniqueCorrectIds !== undefined) { updates.push(`unique_correct_ids = $${i++}`); values.push(JSON.stringify(uniqueCorrectIds)); }
    
    if (updates.length === 0) return res.json({ quiz: null });
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(quizId, userId);
    
    const query = `UPDATE mobile_quizzes SET ${updates.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`;
    
    const result = await pool.query(query, values);
    const r = result.rows[0];
    res.json({ quiz: r ? { ...r, questionCount: r.question_count, sourceText: undefined } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/mobile-quizzes', async (req, res) => {
  const { userId, quizId } = req.query;
  try {
    await pool.query(`UPDATE mobile_quizzes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [quizId, userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PDF Parsing ────────────────────────────────────────────────────────────
app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text });
  } catch (err) {
    console.error('PDF Parse Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PPT/PPTX Parsing ────────────────────────────────────────────────────────────
const officeParser = require('officeparser');
const pptToText = require('ppt-to-text');

app.post('/api/parse-ppt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.file.originalname ? req.file.originalname.toLowerCase() : '';
    
    // Fallback for legacy .ppt files since officeparser only supports .pptx
    if (originalName.endsWith('.ppt') && !originalName.endsWith('.pptx')) {
      try {
        const text = pptToText.extractText(req.file.buffer);
        if (text) {
          return res.json({ text });
        }
      } catch (fallbackErr) {
        console.error('ppt-to-text fallback error:', fallbackErr);
      }
    }

    const ext = originalName.split('.').pop();
    const parseResult = await officeParser.parseOffice(req.file.buffer, { fileType: ext });
    const text = typeof parseResult === 'string' ? parseResult : (parseResult.toText ? parseResult.toText() : '');
    res.json({ text });
  } catch (err) {
    console.error('PPT Parse Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const GEMINI_MCQ_PROMPT_TEMPLATE = process.env.GEMINI_MCQ_PROMPT_TEMPLATE || `You are an expert tutor and you need to get me full marks.

First output all flashcards under the ===FLASHCARDS=== header.
Then output all quiz questions under the ===MCQS=== header.

===FLASHCARDS===
Generate at least {{MIN_FLASHCARDS}} flashcards covering all the given text.
Flashcards are TERM → DEFINITION, NOT question → answer.
Example:
# SI unit of force
= Newton

===MCQS===
Generate at least {{MIN_MCQS}} quiz covering all the given text.
Example:
? What is the SI unit of force?
+ Newton
- Joule
- Pascal
- Watt

If this is a list of questions generate exactly that many questions and flashcards as given.

Text:
[PASTE YOUR TEXT HERE]`;

const GEMINI_MCQ_PROMPT_TEMPLATE_RU = process.env.GEMINI_MCQ_PROMPT_TEMPLATE_RU || `Вы — опытный преподаватель, и ваша цель — помочь мне сдать тест на высший балл.

Сначала выведите все карточки для запоминания под заголовком ===FLASHCARDS===.
Затем выведите все тестовые вопросы с вариантами ответов под заголовком ===MCQS===.
Все карточки, вопросы и варианты ответов должны быть строго на русском языке.

===FLASHCARDS===
Создайте не менее {{MIN_FLASHCARDS}} карточек, охватывающих весь предоставленный текст.
Карточки должны быть в формате ТЕРМИН → ОПРЕДЕЛЕНИЕ, а НЕ вопрос → ответ.
Пример:
# Единица измерения силы в СИ
= Ньютон

===MCQS===
Создайте тест минимум из {{MIN_MCQS}} вопросов с вариантами ответов, охватывающих весь предоставленный текст.
Каждый вопрос должен начинаться со знака ?, правильный ответ со знака +, а неправильные со знака -.
Пример:
? Какова единица измерения силы в Международной системе единиц (СИ)?
+ Ньютон
- Джоуль
- Паскаль
- Ватт

Если предоставлен список вопросов, создайте ровно столько вопросов и карточек, сколько дано в тексте.

Текст:
[PASTE YOUR TEXT HERE]`;

// Prompt for image-heavy PDFs and PPTX files where text extraction is poor.
// Gemini reads the visual content directly — no [PASTE YOUR TEXT HERE] replacement.
const GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL = process.env.GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL || `You are an expert tutor. Carefully read and analyse all visual content in the provided file (slides, diagrams, images, charts, tables and any text visible in the document).

First output all flashcards under the ===FLASHCARDS=== header.
Then output all quiz questions under the ===MCQS=== header.

===FLASHCARDS===
Generate at least {{MIN_FLASHCARDS}} flashcards covering the key concepts visible in the document.
Flashcards are TERM → DEFINITION, NOT question → answer.
Example:
# SI unit of force
= Newton

===MCQS===
Generate at least {{MIN_MCQS}} multiple-choice questions covering the key concepts visible in the document.
Example:
? What is the SI unit of force?
+ Newton
- Joule
- Pascal
- Watt`;

// ── Gemini Config ───────────────────────────────────────────────────────────
app.get('/api/gemini-config', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  const lang = (req.query.lang || '').toLowerCase();
  const activePrompt = (lang === 'ru' || lang === 'kk') ? GEMINI_MCQ_PROMPT_TEMPLATE_RU : GEMINI_MCQ_PROMPT_TEMPLATE;
  res.json({
    key: GEMINI_API_KEY,
    prompt: activePrompt,
    promptEn: GEMINI_MCQ_PROMPT_TEMPLATE,
    promptRu: GEMINI_MCQ_PROMPT_TEMPLATE_RU,
  });
});

app.get('/api/gemini-config-ru', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  res.json({ key: GEMINI_API_KEY, prompt: GEMINI_MCQ_PROMPT_TEMPLATE_RU });
});

// ── App Config ──────────────────────────────────────────────────────────────
app.get('/api/app-config', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_URL = process.env.GEMINI_MODEL_URL;

  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  if (!GEMINI_MODEL_URL) {
    console.error("[Backend] Missing GEMINI_MODEL_URL environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_MODEL_URL" });
  }

  res.json({
    featureFlags: {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      disableAI:       process.env.DISABLE_AI       === 'true',
      disableBattles:  process.env.DISABLE_BATTLES  === 'true',
    },
    aiConfig: {
      geminiKey: GEMINI_API_KEY,
      modelUrl: GEMINI_MODEL_URL,
      promptTemplate: GEMINI_MCQ_PROMPT_TEMPLATE,
      promptTemplateRu: GEMINI_MCQ_PROMPT_TEMPLATE_RU,
      promptTemplateVisual: GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL,
      chunkSize: 10000,
      maxChunks: 10,
      concurrencyLimit: parseInt(process.env.GEMINI_CONCURRENCY_LIMIT || '10', 10),
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '65536', 10),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
      generationTimeoutMs: parseInt(process.env.AI_GENERATION_TIMEOUT_MS || '60000', 10),
      generationRanges: [
        { max: 2000, minF: "9-14", expF: "11-16" },
        { max: 5000, minF: "18-23", expF: "22-27" },
        { max: 10000, minF: "22-27", expF: "22-32" },
        { max: 15000, minF: "27-29", expF: "27-36" },
        { max: 20000, minF: "36-41", expF: "36-49" },
        { max: 25000, minF: "46-49", expF: "46-61" },
        { max: 9999999, minF: "55-61", expF: "55-73" }
      ],
      maxDailyGenerations: parseInt(process.env.AI_DAILY_LIMIT || '10', 10),
    },
    fileLimits: {
      pdfExtractThresholdMB: 4.2,
      pptMaxMB: 4.5
    },
    appLinks: {
      shareBaseUrl: "https://scorrapp.com/share/quiz/",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge",
      tutorialUrl: "https://youtu.be/jLiU-vW5EuA"
    }
  });
});


// ── App Updates ────────────────────────────────────────────────────────────
app.get('/api/version-config', (req, res) => {
  if (!process.env.APP_MINIMUM_VERSION) {
    console.error("[Backend] Missing APP_MINIMUM_VERSION env var — force-update will never trigger.");
  }
  if (!process.env.APP_LATEST_VERSION) {
    console.error("[Backend] Missing APP_LATEST_VERSION env var.");
  }
  const scheduleStr = process.env.UPDATE_PROMPT_SCHEDULE_DAYS;
  const updatePromptScheduleDays = scheduleStr
    ? scheduleStr.split(',').map(Number).filter(n => !isNaN(n))
    : [0, 7, 14, 30];
  res.json({
    latestVersion: process.env.APP_LATEST_VERSION || "1.0.0",
    minimumVersion: process.env.APP_MINIMUM_VERSION || "1.0.0",
    updatePromptScheduleDays
  });
});

// Start server locally
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
