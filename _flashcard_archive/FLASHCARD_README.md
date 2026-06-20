# 📦 Flashcard Feature Archive

This folder contains all the code for the **Flashcard / Spaced-Repetition** feature
that was removed from the app on 2026-06-05. The code is fully functional and ready
to be dropped back into a new project.

---

## What Was Removed

| File | What's Here |
|------|------------|
| `mobile_api_flashcards.ts` | API functions: `fetchFlashcardDecks`, `createFlashcardDeck`, `updateFlashcardDeck`, `deleteFlashcardDeck` + TypeScript interfaces |
| `backend_flashcard_routes.js` | Express routes: `GET/POST/PUT/DELETE /api/flashcard-decks` |
| `backend_db_flashcard_table.sql` | SQL `CREATE TABLE flashcard_decks` statement |
| `locale_flashcard_keys.json` | All flashcard-related i18n keys (English) |
| `patch_flashcards.js` | Original patch script that was in `mobile/` root |
| `index_tsx_flashcard_sections/` | Extracted sections of `index.tsx` that handled flashcard logic and UI |

---

## How to Restore

### 1. Backend
- Paste `backend_flashcard_routes.js` into `backend/api/index.js` after the quiz-history routes.
- Run the SQL in `backend_db_flashcard_table.sql` against your Neon database.
- Re-add the flashcard_decks cleanup line in the user DELETE endpoint:
  ```js
  await pool.query(`DELETE FROM flashcard_decks WHERE user_id = $1`, [userId]);
  ```

### 2. Mobile API (`mobile/src/lib/api.ts`)
- Paste contents of `mobile_api_flashcards.ts` at the end of `api.ts`.
- Add the imports back to `index.tsx`:
  ```ts
  import { ..., createFlashcardDeck, updateFlashcardDeck, deleteFlashcardDeck, fetchFlashcardDecks } from "../lib/api";
  ```

### 3. Mobile UI (`mobile/src/app/index.tsx`)
- See files in `index_tsx_flashcard_sections/` — each file is labelled with the section name.
- Add `"flashcards"` and `"deck-insights"` back to the `activeTab` union type.
- Add `"flashcard"` back to the `creationMode` union type.
- Re-add the Flashcards tab to the bottom tab bar.
- Re-add `flashcardDecks` state, persistence effect, and `decksRef`.

### 4. Locales
- Merge `locale_flashcard_keys.json` back into each locale file under the keys shown.

---

## Feature Description

The flashcard feature allowed users to:
- Create flip-card study decks (front/back format)
- Study decks with spaced-repetition logic (due / in-progress / mastered)
- Sync decks to the Neon backend
- Edit, rename, and delete individual decks
- View deck-level insights
