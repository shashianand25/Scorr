# Scorr Backend API (`apps/api`)

The Express serverless backend service for Scorr, providing document parsing, Gemini AI generation pipelines, multiplayer battle synchronization, and Neon PostgreSQL persistence.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4.x
- **Database:** PostgreSQL via `@neondatabase/serverless` & `pg`
- **Validation:** `zod` boundary schema validation
- **File Parsers:** `pdfjs-dist`, `mammoth`, `officeparser`
- **Testing & Coverage:** Node.js native test runner (`node:test`, `node:assert`) + `c8`

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run backend development server
npm run dev

# Run unit and integration tests
npm test

# Run test coverage with strict threshold enforcement
npm run test:coverage
```

---

## 📊 Observability & Structured Logging

The backend utilizes structured JSON logging via [`utils/logger.js`](./utils/logger.js). Every event emits machine-readable JSON:

```json
{
  "timestamp": "2026-08-21T06:50:00.000Z",
  "level": "info",
  "tag": "HTTP",
  "message": "GET /api/master-quizzes 200",
  "context": {
    "method": "GET",
    "path": "/api/master-quizzes",
    "statusCode": 200,
    "durationMs": 14
  }
}
```

### Telemetry & Error Tracking Integration:
- Configure `SENTRY_DSN` in your environment to automatically pipe unhandled exceptions and error logs to Sentry.
- When `SENTRY_DSN` is absent, error logging defaults gracefully to structured standard error with zero crashes or network overhead.

---

## 🧪 Self-Contained Testing & Mock Stubs

All backend test suites in `__tests__/` are completely self-contained and run in-memory without requiring live Neon PostgreSQL databases or external third-party network connections:

- **`api.test.js`**: Input validation for feedback payloads, battle room codes, and authentication tokens.
- **`schemas.test.js`**: Zod boundary schemas for request bodies.
- **`deduplication.test.js`**: Content hashing & SHA-256 fingerprint generation.
- **`sanitization.test.js`**: Document string sanitization, null byte removal, and prompt injection filters.
- **`services.test.js`**: Mock database pool and email dispatcher service tests.
- **`logger.test.js`**: Structured JSON logging and error telemetry sink assertions.
