// ── Sample quiz — injected once on first launch ──────────────────────────
export const SAMPLE_QUIZ = {
  id: "sample_quiz",
  isSample: true,
  title: "General Knowledge — Sample Quiz",
  category: "General",
  questions: 5,
  attempts: [] as any[],
  wrongQuestions: [] as any[],
  uniqueCorrectIds: [] as string[],
  questionsList: [
    { id: "sq1", prompt: "What is the capital city of Japan?",
      answers: [{ id: "sq1a", text: "Beijing", isCorrect: false }, { id: "sq1b", text: "Seoul", isCorrect: false }, { id: "sq1c", text: "Tokyo", isCorrect: true }, { id: "sq1d", text: "Bangkok", isCorrect: false }] },
    { id: "sq2", prompt: "Which planet is known as the Red Planet?",
      answers: [{ id: "sq2a", text: "Venus", isCorrect: false }, { id: "sq2b", text: "Mars", isCorrect: true }, { id: "sq2c", text: "Jupiter", isCorrect: false }, { id: "sq2d", text: "Saturn", isCorrect: false }] },
    { id: "sq3", prompt: "How many sides does a hexagon have?",
      answers: [{ id: "sq3a", text: "5", isCorrect: false }, { id: "sq3b", text: "7", isCorrect: false }, { id: "sq3c", text: "8", isCorrect: false }, { id: "sq3d", text: "6", isCorrect: true }] },
    { id: "sq4", prompt: "Who painted the Mona Lisa?",
      answers: [{ id: "sq4a", text: "Michelangelo", isCorrect: false }, { id: "sq4b", text: "Leonardo da Vinci", isCorrect: true }, { id: "sq4c", text: "Raphael", isCorrect: false }, { id: "sq4d", text: "Vincent van Gogh", isCorrect: false }] },
    { id: "sq5", prompt: "What is the chemical symbol for water?",
      answers: [{ id: "sq5a", text: "O2", isCorrect: false }, { id: "sq5b", text: "HO", isCorrect: false }, { id: "sq5c", text: "H2O", isCorrect: true }, { id: "sq5d", text: "CO2", isCorrect: false }] },
  ],
};

export const APP_LANGUAGES = [
  { id: "system", name: "System language", code: "en", nativeName: "", flag: "A文" },
  { id: "en", name: "English", code: "en", nativeName: "English", flag: "🇺🇸" },
  { id: "es", name: "Spanish", code: "es", nativeName: "Español", flag: "🇪🇸" },
  { id: "fr", name: "French", code: "fr", nativeName: "Français", flag: "🇫🇷" },
  { id: "hi", name: "Hindi", code: "hi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { id: "ru", name: "Russian", code: "ru", nativeName: "Русский", flag: "🇷🇺" },
  { id: "kk", name: "Kazakh", code: "kk", nativeName: "Қазақ тілі", flag: "🇰🇿" },
];
