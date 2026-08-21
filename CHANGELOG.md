# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Zod API Boundary Schemas**: Enforced input validation schemas across all backend endpoints (`apps/api/schemas.js`) with failing/passing test coverage (`apps/api/__tests__/schemas.test.js`).
- **Structured JSON Logging & Telemetry**: Upgraded logging in Mobile, Web, and Backend to emit structured JSON events (`timestamp`, `level`, `tag`, `message`, `context`) with optional Sentry error tracking.
- **Automated Monorepo Setup Engine**: Added single-command `npm run setup` (`scripts/setup.js`) to install workspace dependencies and automatically configure `.env` files from templates.
- **Backend Coverage Enforcement**: Integrated `c8` into `apps/api` with strict numeric coverage thresholds (70% lines, 60% branches, 70% statements) under `npm run test:coverage`.
- **End-to-End User Journey Tests**: Added multi-step integration tests covering Mobile study lifecycle (`QuizStudyFlow.test.ts`) and Web creation workflows (`QuizCreationFlow.test.ts`).
- **Isolated Service Mock Stubs**: Added offline in-memory database and email service mocks (`services.mock.js`) for self-contained CI testing.
- **Canonical CI Matrix**: Consolidated GitHub Actions workflows into a single high-performance `ci.yml` pipeline with lint, typecheck, test, and security audit jobs.

### Changed
- Refactored web presentational components to consume unified theme constants from `sharedStyles.ts`.
- Unified ESLint configurations across Mobile, Web, and Backend workspaces.

---

## [1.0.0] - 2026-08-19

### Added
- **AI-Powered Multi-Modal Generator**: Support for parsing PDF, DOCX, PPTX, and raw text files into formatted MCQs and flashcards using Google Gemini 2.0.
- **SM-2 Spaced Repetition Algorithm**: Implementation of full SuperMemo-2 spaced repetition state transitions with interval calculations, ease factor bounding, and due queue scheduling.
- **Real-Time Multiplayer Battle Arena**: Synchronous battle rooms, live score tracking, countdown timers, and speed-based tiebreakers.
- **Cross-Tier Test Suite**: 34 dedicated unit and integration test spec files across Mobile, Web, and Backend with 95+ passing tests.
- **GitHub Actions CI Matrix Pipeline**: Automated multi-tier testing, linting, and type-checking enforcement across Mobile (Expo), Web (Next.js), and Backend (Express).
- **Automated Dependency Maintenance**: Integrated Dependabot and Renovate bots with weekly dependency upgrade schedules.
- **Offline Study Engine**: In-memory caching and persistent local storage enabling seamless offline quiz attempts and automatic synchronization on reconnect.
- **Multi-Language Support**: Complete localization in English, Russian, Hindi, and Spanish.

### Changed
- Refactored monolithic screens into modular component architectures with strict TypeScript typing.
- Migrated state reducers to pure deterministic handlers with comprehensive test coverage.
- Optimized content hashing algorithm with deterministic SHA-256 fingerprinting to eliminate duplicate quiz imports.

### Fixed
- Fixed array access guards and null check crashes on app initialization.
- Resolved TypeScript compiler errors and side-effect CSS import issues across React Native modules.
- Fixed mock audio player unmounting and safe hardware sound release on navigation.

### Security
- Stripped sensitive server tokens from client bundles and enforced sanitized document text processing.
- Implemented environment variable sandboxing for zero-leak CI test execution.

---

## [0.9.0] - 2026-08-01

### Added
- Initial release of Mobile app with Expo SDK 56 and Expo Router.
- Backend Express API with PostgreSQL / Neon persistence and document upload handling.
- Next.js Web landing page and interactive study web preview.
- Google Sign-In and Firebase Authentication integration.

---

## [0.1.0] - 2026-06-01

### Added
- Proof-of-concept AI MCQ generation prototype.
- Initial QST file format specification and parser.
