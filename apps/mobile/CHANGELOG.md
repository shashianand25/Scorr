# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Added
- Domain hooks: `useAuth`, `useNetworkState`, `useQuizData`, `useQuizSession`, `useBattle`, `useAIGeneration`
- Modal components: `QuizActionsModal`, `RenameDeleteModals`, `ConfirmationModals`, `OfflineModal`
- Screen components: `AIGeneratingScreen`, `FullscreenBattleCountdown`, `InsightsTabScreen`, `ActiveSessionScreen`, `ResultsScreen`, `BattleLobbyScreen`, `FlashcardsScreen`, `AuthScreen`
- ESLint + Prettier config with TypeScript rules
- `lint` and `format` npm scripts

### Changed
- Architecture: god-file `HomeScreen` refactored into domain-separated hooks and screen components
- `AppModals.tsx` decomposed into individual files under `src/components/modals/`

## [1.0.0] — 2026-08-19 — Initial public release

### Added
- AI-powered quiz and flashcard generation from PDF, DOCX, PPT, YouTube, and text
- Multiplayer battle mode with real-time Firebase sync
- Spaced repetition (SM-2) flashcard engine
- Offline-first architecture: AsyncStorage + Neon cloud sync
- Firebase auth (email/password + Google Sign-In)
- Deep-link quiz sharing (`recall://share/quiz/`)
- Insights dashboard with attempt trends and study streaks
- Library tab with master course catalogue
- Multi-language support via i18next
- Dark/light mode with system preference detection
- Push notifications via expo-notifications
