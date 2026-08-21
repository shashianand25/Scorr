# Scorr Backend API (`apps/api`)

The Express serverless backend service for Scorr, providing document parsing, Gemini AI generation pipelines, multiplayer battle synchronization, and Neon PostgreSQL persistence.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4.x
- **Database:** PostgreSQL via `@neondatabase/serverless` & `pg`
- **File Parsers:** `pdfjs-dist`, `mammoth`, `officeparser`
- **Testing:** Node.js native test runner (`node:test`, `node:assert`)

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run backend development server with live reload
npm run dev

# Run unit and integration tests
npm test
```

---

## 🧪 Self-Contained Testing & Mock Stubs

All backend test suites in `__tests__/` are completely self-contained and run in-memory without requiring a live Neon PostgreSQL database or external third-party network connections.

- **`api.test.js`**: Input validation for feedback payloads, battle room codes, and authentication tokens.
- **`deduplication.test.js`**: Content hashing & SHA-256 fingerprint generation.
- **`sanitization.test.js`**: Document string sanitization, null byte removal, and prompt injection filters.
