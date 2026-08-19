# Contributing to Scorr Mobile

Thank you for your interest in contributing!

## Development Setup

```bash
cd mobile
npm install
npx expo start
```

## Code Style

This project uses ESLint and Prettier. Run before committing:

```bash
npm run lint      # check for lint errors
npm run format    # auto-format with Prettier
```

Config files: `.eslintrc.json`, `.prettierrc`

## Architecture

```
src/
├── app/
│   └── index.tsx           # Main HomeScreen orchestrator
├── components/
│   ├── modals/             # Individual modal components
│   │   ├── AppModals.tsx   # Root modal compositor
│   │   ├── ConfirmationModals.tsx
│   │   ├── QuizActionsModal.tsx
│   │   ├── RenameDeleteModals.tsx
│   │   └── OfflineModal.tsx
│   ├── ui/                 # Reusable UI primitives
│   └── layout/
├── screens/                # Full-screen view components
├── hooks/                  # Domain custom hooks
│   ├── useAuth.ts
│   ├── useNetworkState.ts
│   ├── useQuizData.ts
│   ├── useQuizSession.ts
│   ├── useBattle.ts
│   └── useAIGeneration.ts
├── lib/                    # API, Firebase, analytics, i18n
├── styles/                 # Shared StyleSheet
└── utils/                  # Pure utility functions
```

## Branching

- `main` — production
- Feature branches: `feat/<name>`
- Bug fixes: `fix/<name>`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code change that neither fixes a bug nor adds a feature
- `chore:` tooling, config, dependencies
