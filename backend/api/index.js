const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { Resend } = require('resend');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const resend = new Resend('re_Kt6jhDqQ_FPcQUafA3aH3TkursCPxBcnW');
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'shashianand2005@gmail.com',
      subject: `New Recall Feedback from ${userEmail || 'Anonymous'}`,
      text: `User ID: ${userId || 'N/A'}\nUser Email: ${userEmail || 'N/A'}\n\nFeedback:\n${message}`
    });

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
  const { userId, roomCode, quizTitle, myScore, opponentScore, opponentName, won, myTime, opponentTime } = req.body;
  const eventId = generateId();
  
  try {
    await pool.query(
      `INSERT INTO battle_history (id, user_id, room_code, quiz_title, my_score, opponent_score, opponent_name, won, my_time, opponent_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [eventId, userId, roomCode, quizTitle, myScore, opponentScore, opponentName, won, myTime || null, opponentTime || null]
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
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Mobile Quizzes ───────────────────────────────────────────────────────
app.get('/api/mobile-quizzes', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM mobile_quizzes WHERE user_id = $1`, [userId]);
    const quizzes = result.rows.map(r => ({
      ...r,
      questionCount: r.question_count,
      sourceText: undefined, // Omit massive sourceText to save bandwidth and prevent RN chunking bugs
      wrongQuestions: typeof r.wrong_questions === 'string' ? JSON.parse(r.wrong_questions) : r.wrong_questions,
      uniqueCorrectIds: typeof r.unique_correct_ids === 'string' ? JSON.parse(r.unique_correct_ids) : r.unique_correct_ids,
      attempts: typeof r.attempts === 'string' ? JSON.parse(r.attempts) : r.attempts
    }));
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mobile-quizzes', async (req, res) => {
  const { userId, title, category, questionCount, sourceText, attempts, wrongQuestions, uniqueCorrectIds } = req.body;
  const quizId = generateId();
  try {
    const result = await pool.query(
      `INSERT INTO mobile_quizzes (id, user_id, title, category, question_count, source_text, attempts, wrong_questions, unique_correct_ids) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
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
    await pool.query(`DELETE FROM mobile_quizzes WHERE id = $1 AND user_id = $2`, [quizId, userId]);
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

    const text = await officeParser.parseOffice(req.file.buffer);
    res.json({ text });
  } catch (err) {
    console.error('PPT Parse Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const GEMINI_MCQ_PROMPT_TEMPLATE = `You are an expert educator and assessment designer.

Convert the provided text into high-quality flashcards and multiple-choice questions for active recall.

The provided text may be one chunk of a larger document.
Generate flashcards and questions using only the information in the provided text.
Do not assume, infer, or add information that is not explicitly stated in the provided text.

### Primary Objective

Your primary objective is to convert the provided text into the largest possible collection of useful, non-duplicate flashcards and MCQs while maintaining high quality.

This is **not** a summarization task. It is an exhaustive knowledge extraction task.

Treat every meaningful piece of information as a candidate for active recall.

Missing important information is considered an incorrect response.

### Content Generation

* Cover the entire provided text exhaustively from beginning to end.
* Every major topic, subsection, paragraph, table, list, formula, definition, comparison, process, and example should be represented by one or more flashcards and MCQs where appropriate.
* Do not ignore later sections of the text.
* If the provided text already contains MCQs, recreate exactly the same number of MCQs only. Do not generate additional MCQs. You may still generate flashcards from the content.
* If the provided text does not contain MCQs, generate original flashcards and MCQs based only on the provided text.
* Generate the **maximum number of unique, high-quality flashcards and MCQs** that the provided text can reasonably support.
* There is **no upper limit** on the number of flashcards or MCQs.
* If the text contains sufficient information, generate **at least 20 flashcards and at least 20 MCQs**.
* If the text supports more than 20, continue generating additional items until nearly every meaningful concept and fact has been converted into active recall.
* Never stop generating simply because you have reached the minimum.
* If the text genuinely cannot support 20 unique flashcards or MCQs without repetition, generate the maximum number of unique, high-quality items possible.
* Never invent facts or repeat questions simply to satisfy a minimum count.

### Coverage Requirements

Convert information at the smallest meaningful unit.

Whenever appropriate, create separate flashcards and MCQs for:

* Definitions
* Key terms
* Important facts
* Concepts
* Processes
* Individual process steps
* Mechanisms
* Causes
* Effects
* Symptoms
* Characteristics
* Functions
* Classifications
* Categories
* Types
* Components
* Relationships
* Comparisons
* Advantages
* Disadvantages
* Examples
* Exceptions
* Rules
* Formulas
* Equations
* Tables
* Numbered lists
* Bullet points
* Important statements

If a paragraph contains multiple independent facts, generate multiple flashcards and multiple MCQs instead of combining them into one.

Split compound sentences into multiple recall items whenever they contain multiple independent facts.

Prefer several focused flashcards over one broad flashcard.

Prefer several focused MCQs over one broad MCQ.

Avoid combining unrelated concepts into a single flashcard or MCQ.

### Flashcard Rules

* Each flashcard should focus on one primary concept whenever possible.
* Flashcards should be concise but complete.
* Use terminology from the provided text.
* Do not include information that is not explicitly present in the provided text.

### MCQ Rules

* Each MCQ must assess understanding, application, comparison, identification, or recall.
* Every MCQ must have exactly **one** correct answer.
* Every MCQ must contain exactly **three** incorrect answers.
* Incorrect answers should be plausible, relevant, and clearly incorrect based only on the provided text.
* Avoid trivial wording changes from flashcards whenever possible.
* Avoid duplicate or nearly identical questions.
* Every major concept should normally produce at least one flashcard and one MCQ.

### Output Format

Output your response using the EXACT following format.

First output all flashcards under the \`===FLASHCARDS===\` header.

Then output all MCQs under the \`===MCQS===\` header.

===FLASHCARDS===

# Term or Concept
= Definition or explanation

# Another Term
= Definition or explanation

===MCQS===

? Question

+ Correct Answer
- Wrong Answer
- Wrong Answer
- Wrong Answer

### Formatting Rules

* Every flashcard title must start with \`#\`.
* Every flashcard answer must start with \`=\`.
* Every MCQ must start with \`?\`.
* The correct answer must start with \`+\`.
* Every incorrect answer must start with \`-\`.
* Do not number flashcards or questions.
* Do not include explanations, notes, markdown, code fences, or extra headings beyond the required headers.
* Output only the formatted flashcards and MCQs.

Text:
[The extracted document text is inserted here]`;

// ── Gemini Config ───────────────────────────────────────────────────────────
app.get('/api/gemini-config', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  res.json({ key: GEMINI_API_KEY, prompt: GEMINI_MCQ_PROMPT_TEMPLATE });
});

// ── App Updates ────────────────────────────────────────────────────────────
app.get('/api/version-config', (req, res) => {
  res.json({
    latestVersion: process.env.APP_LATEST_VERSION || "1.0.0",
    minimumVersion: process.env.APP_MINIMUM_VERSION || "1.0.0"
  });
});

// Start server locally
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
