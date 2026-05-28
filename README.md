# QuizForge

QuizForge is a Next.js 15, TypeScript, TailwindCSS, Prisma, PostgreSQL, Redis and WebSocket quiz platform foundation inspired by Kahoot, Quizizz, Linear, Discord and ExamSoft.

## What is included

- QST parser with regex parsing, metadata, escaped characters, Unicode, Markdown, KaTeX-friendly prompts, image URL extraction, duplicate answer detection and line-numbered validation.
- Prisma schema for users, auth, quizzes, questions, answers, attempts, leaderboards, rooms, achievements, reports and analytics.
- Import/export APIs for QST, JSON and Markdown.
- Quiz editor, player, live room and admin dashboard UI.
- Socket.IO live room server with Redis-backed room/player/answer state.
- Auth.js configuration for credentials and Google login, plus guest fallback for local imports.
- Rate limiting, origin CSRF checks, basic input sanitization and safe Prisma query patterns.
- Seed script, unit tests, E2E config and CI workflow.

## QST format

```qst
@title: Biology Quiz
@time_limit: 30
@shuffle: true
@category: Science

? What is 2 + 2?
+ 4
- 5
- 6

? Select prime numbers
* 2
* 3
- 4
- 9
```

`+` marks correct answers, `-` marks wrong answers. For compatibility with common QST examples, `*` is treated as a correct answer when a question uses `*` and `-` without any `+`; otherwise `*` is treated as a wrong option.

## Local development

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). `npm run dev` starts the custom Node server that attaches Socket.IO to Next.js.

PostgreSQL and Redis should be running locally or through your preferred managed services. Update `DATABASE_URL` and `REDIS_URL` in `.env` before running migrations.

## Verification

```bash
npm run db:generate
npm run lint
npm run test
npm run build
npm run test:e2e
```

## API surface

- `POST /api/qst/parse` parses QST and returns normalized JSON.
- `POST /api/quizzes/import` imports QST into PostgreSQL.
- `GET /api/quizzes` lists public quizzes with search and cursor pagination.
- `GET /api/quizzes/:id` returns a quiz by id or slug.
- `GET /api/quizzes/:id/export?format=qst|json|md` exports a quiz.
- `POST /api/attempts` scores and stores an attempt.
- `POST /api/rooms` creates a Kahoot-style live room.
- `GET /api/admin/analytics` returns admin metrics.

## Security and scale notes

This codebase is structured for production hardening: Prisma prevents SQL injection, React escapes rendered text by default, API routes validate with Zod, Redis rate limits requests, room state is cache-backed, and list APIs use cursor pagination. For a production deployment, add real email verification, hardened CSP headers, object storage/CDN for media, background workers for PDF/AI import, and a dedicated Socket.IO adapter for multi-node fanout.
