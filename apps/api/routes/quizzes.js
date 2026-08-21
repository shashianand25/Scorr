const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const logger = require('../utils/logger');

// Helper for generating simple UUIDs if not provided by client
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Helper for generating public master quiz IDs
const generateMasterQuizId = () => 'uq_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);

// ── Master Quizzes (Canonical Content & AI Cache) ─────────────────────────
router.post('/api/master-quizzes/cache-check', async (req, res) => {
  const { contentHash } = req.body;
  if (!contentHash) return res.status(400).json({ error: 'contentHash required' });
  try {
    const result = await pool.query(
      `SELECT id, title, category, question_count, flashcard_count, source_text, language, created_at
       FROM master_quizzes 
       WHERE content_hash = $1`,
      [contentHash]
    );
    if (result.rows.length === 0) {
      return res.json({ hit: false });
    }
    const r = result.rows[0];
    res.json({
      hit: true,
      masterQuiz: {
        id: r.id,
        title: r.title,
        category: r.category,
        questionCount: r.question_count,
        flashcardCount: r.flashcard_count,
        sourceText: r.source_text,
        language: r.language,
        createdAt: r.created_at
      }
    });
  } catch (err) {
    logger.error('Quizzes', '/api/master-quizzes/cache-check error', err, { contentHash });
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/master-quizzes', async (req, res) => {
  const {
    id,
    contentHash,
    generationVersion = 'v1',
    language = 'en',
    title,
    category = 'AI Generated',
    questionCount = 0,
    flashcardCount = 0,
    sourceText,
    userId
  } = req.body;

  if (!contentHash || !title || !sourceText) {
    return res.status(400).json({ error: 'contentHash, title, and sourceText required' });
  }

  const masterId = id || generateMasterQuizId();

  try {
    const result = await pool.query(
      `INSERT INTO master_quizzes (
        id, content_hash, generation_version, language, title, category,
        question_count, flashcard_count, source_text, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (content_hash) DO UPDATE SET
        view_count = master_quizzes.view_count + 1
      RETURNING *`,
      [
        masterId,
        contentHash,
        generationVersion,
        language,
        title,
        category,
        questionCount,
        flashcardCount,
        sourceText,
        userId || null
      ]
    );

    const masterRecord = result.rows[0];
    res.json({
      masterQuiz: {
        id: masterRecord.id,
        title: masterRecord.title,
        category: masterRecord.category,
        questionCount: masterRecord.question_count,
        flashcardCount: masterRecord.flashcard_count,
        sourceText: masterRecord.source_text,
        language: masterRecord.language,
        createdAt: masterRecord.created_at
      }
    });
  } catch (err) {
    logger.error('Quizzes', '/api/master-quizzes error', err, { contentHash, title });
    res.status(500).json({ error: err.message });
  }
});

// ── Mobile Quizzes & Universal Sharing ────────────────────────────────────
router.get('/api/share/quiz/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Check master_quizzes first (canonical universal quiz)
    const masterResult = await pool.query(
      `SELECT id, title, category, question_count, flashcard_count, source_text, language 
       FROM master_quizzes WHERE id = $1`,
      [id]
    );
    if (masterResult.rows.length > 0) {
      const r = masterResult.rows[0];
      pool.query(`UPDATE master_quizzes SET view_count = view_count + 1 WHERE id = $1`, [id]).catch(() => {});
      return res.json({
        quiz: {
          id: r.id,
          title: r.title,
          category: r.category,
          questionCount: r.question_count,
          flashcardCount: r.flashcard_count,
          sourceText: r.source_text,
          language: r.language,
          isMaster: true
        }
      });
    }

    // 2. Fallback to legacy mobile_quizzes
    const legacyResult = await pool.query(
      `SELECT id, title, category, question_count, source_text, deleted_at 
       FROM mobile_quizzes WHERE id = $1`,
      [id]
    );
    if (legacyResult.rows.length === 0 || legacyResult.rows[0].deleted_at) {
      return res.status(404).json({ error: 'This quiz was deleted or is no longer available.' });
    }
    const r = legacyResult.rows[0];
    res.json({
      quiz: {
        id: r.id,
        title: r.title,
        category: r.category,
        questionCount: r.question_count,
        sourceText: r.source_text,
        isMaster: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/mobile-quizzes', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT 
        mq.id,
        mq.user_id,
        mq.master_quiz_id,
        COALESCE(mq.title, mq2.title) AS title,
        COALESCE(mq.category, mq2.category) AS category,
        COALESCE(mq.question_count, mq2.question_count) AS question_count,
        COALESCE(NULLIF(mq.source_text, ''), mq2.source_text, '') AS source_text,
        mq.attempts,
        mq.wrong_questions,
        mq.unique_correct_ids,
        mq.created_at,
        mq.updated_at
      FROM mobile_quizzes mq
      LEFT JOIN master_quizzes mq2 ON mq.master_quiz_id = mq2.id
      WHERE mq.user_id = $1 AND mq.deleted_at IS NULL
      ORDER BY mq.updated_at DESC`,
      [userId]
    );
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
        masterQuizId: r.master_quiz_id,
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

router.post('/api/mobile-quizzes', async (req, res) => {
  const { id, userId, masterQuizId, title, category, questionCount, sourceText, attempts, wrongQuestions, uniqueCorrectIds } = req.body;
  const quizId = id || generateId();
  try {
    const result = await pool.query(
      `INSERT INTO mobile_quizzes (id, user_id, master_quiz_id, title, category, question_count, source_text, attempts, wrong_questions, unique_correct_ids) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         master_quiz_id = COALESCE(EXCLUDED.master_quiz_id, mobile_quizzes.master_quiz_id),
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         question_count = EXCLUDED.question_count,
         source_text = EXCLUDED.source_text,
         attempts = EXCLUDED.attempts,
         wrong_questions = EXCLUDED.wrong_questions,
         unique_correct_ids = EXCLUDED.unique_correct_ids,
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        quizId,
        userId,
        masterQuizId || null,
        title,
        category,
        questionCount || 0,
        sourceText || '',
        JSON.stringify(attempts || []),
        JSON.stringify(wrongQuestions || []),
        JSON.stringify(uniqueCorrectIds || [])
      ]
    );
    const r = result.rows[0];
    res.json({ quiz: { ...r, masterQuizId: r.master_quiz_id, questionCount: r.question_count, sourceText: undefined } });
  } catch (err) {
    logger.error('Quizzes', 'POST /api/mobile-quizzes error', err, { userId, title });
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/mobile-quizzes', async (req, res) => {
  const { userId, quizId, masterQuizId, title, category, questionCount, sourceText, attempts, wrongQuestions, uniqueCorrectIds } = req.body;
  try {
    const updates = [];
    const values = [];
    let i = 1;
    if (masterQuizId !== undefined) { updates.push(`master_quiz_id = $${i++}`); values.push(masterQuizId); }
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
    res.json({ quiz: r ? { ...r, masterQuizId: r.master_quiz_id, questionCount: r.question_count, sourceText: undefined } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/mobile-quizzes', async (req, res) => {
  const { userId, quizId } = req.query;
  try {
    await pool.query(`UPDATE mobile_quizzes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [quizId, userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
