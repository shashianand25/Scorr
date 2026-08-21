# Architecture Overview

## Domain Hooks

State is organized into six domain hooks, each owning a bounded slice of the application:

| Hook | Responsibility |
|------|----------------|
| `useAuth` | Firebase auth, Neon user sync, login/logout state |
| `useNetworkState` | NetInfo, offline detection, bottom pill toast |
| `useQuizData` | Quiz list, flashcard decks, AsyncStorage persistence, tombstones |
| `useQuizSession` | Active quiz session, preferences, timers |
| `useBattle` | Multiplayer battle state, real-time listeners, battle history |
| `useAIGeneration` | App config fetch, AI generation phase, abort controller |

## Screen Components

Large render blocks extracted from the god-file into focused screen components:

| Component | File |
|-----------|------|
| `AIGeneratingScreen` | `components/AIGeneratingScreen.tsx` |
| `FullscreenBattleCountdown` | `components/AIGeneratingScreen.tsx` |
| `InsightsTabScreen` | `screens/InsightsTabScreen.tsx` |
| `ActiveSessionScreen` | `screens/QuizSessionScreen.tsx` |
| `ResultsScreen` | `screens/QuizSessionScreen.tsx` |
| `BattleLobbyScreen` | `screens/BattleAndFlashcardScreens.tsx` |
| `FlashcardsScreen` | `screens/BattleAndFlashcardScreens.tsx` |
| `AuthScreen` | `screens/AuthScreen.tsx` |

## Data Flow

```
AsyncStorage (offline-first)
    ↕
useQuizData (local state)
    ↕ on login
useAuth (Neon sync)
    ↕
Neon PostgreSQL (cloud)
```
