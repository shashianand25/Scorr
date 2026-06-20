// ── Flashcard Deck Routes ─────────────────────────────────────────────────
// Archived from: backend/api/index.js
// Removed: 2026-06-05

// ── User Delete: also add this line to the /api/sync-user DELETE handler ──
// await pool.query(`DELETE FROM flashcard_decks WHERE user_id = $1`, [userId]);

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/api/flashcard-decks', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM flashcard_decks WHERE user_id = $1`, [userId]);
    // Format JSON correctly for JS
    const decks = result.rows.map(r => ({
      ...r,
      cardType: r.card_type,
      cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards
    }));
    res.json({ decks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/flashcard-decks', async (req, res) => {
  const { userId, title, cardType, cards } = req.body;
  const deckId = generateId();
  try {
    const result = await pool.query(
      `INSERT INTO flashcard_decks (id, user_id, title, card_type, cards) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [deckId, userId, title, cardType, JSON.stringify(cards || [])]
    );
    const r = result.rows[0];
    res.json({ deck: { ...r, cardType: r.card_type, cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/flashcard-decks', async (req, res) => {
  const { userId, deckId, title, cardType, cards } = req.body;
  try {
    // Dynamic update
    const updates = [];
    const values = [];
    let i = 1;
    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
    if (cardType !== undefined) { updates.push(`card_type = $${i++}`); values.push(cardType); }
    if (cards !== undefined) { updates.push(`cards = $${i++}`); values.push(JSON.stringify(cards)); }
    
    if (updates.length === 0) return res.json({ deck: null });
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(deckId, userId);
    
    const query = `UPDATE flashcard_decks SET ${updates.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`;
    
    const result = await pool.query(query, values);
    const r = result.rows[0];
    res.json({ deck: r ? { ...r, cardType: r.card_type, cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/flashcard-decks', async (req, res) => {
  const { userId, deckId } = req.query;
  try {
    await pool.query(`DELETE FROM flashcard_decks WHERE id = $1 AND user_id = $2`, [deckId, userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
