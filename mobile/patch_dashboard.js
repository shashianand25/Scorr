const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    accuracy: "ACCURACY OVER ALL ATTEMPTS",
    attempt: "attempt",
    attempts: "attempts",
    across: "across",
    quiz: "quiz",
    quizzes: "quizzes",
    completion: "Completion (Mastered)",
    stats_quizzes: "QUIZZES",
    stats_questions: "QUESTIONS",
    stats_decks: "DECKS",
    starred: "Starred",
    starred_title: "Starred Questions",
    saved: "saved"
  },
  ru: {
    accuracy: "ТОЧНОСТЬ ПО ВСЕМ ПОПЫТКАМ",
    attempt: "попытка",
    attempts: "попыток",
    across: "среди",
    quiz: "теста",
    quizzes: "тестов",
    completion: "Завершено (Изучено)",
    stats_quizzes: "ТЕСТЫ",
    stats_questions: "ВОПРОСЫ",
    stats_decks: "КОЛОДЫ",
    starred: "Избранное",
    starred_title: "Избранные вопросы",
    saved: "сохранено"
  },
  kk: {
    accuracy: "БАРЛЫҚ ӘРЕКЕТТЕР БОЙЫНША ДӘЛДІК",
    attempt: "әрекет",
    attempts: "әрекеттер",
    across: "арасында",
    quiz: "тест",
    quizzes: "тесттер",
    completion: "Аяқталды (Меңгерілді)",
    stats_quizzes: "ТЕСТТЕР",
    stats_questions: "СҰРАҚТАР",
    stats_decks: "КОЛОДАЛАР",
    starred: "Таңдаулы",
    starred_title: "Таңдаулы сұрақтар",
    saved: "сақталды"
  },
  es: {
    accuracy: "PRECISIÓN EN TODOS LOS INTENTOS",
    attempt: "intento",
    attempts: "intentos",
    across: "en",
    quiz: "prueba",
    quizzes: "pruebas",
    completion: "Finalización (Dominado)",
    stats_quizzes: "PRUEBAS",
    stats_questions: "PREGUNTAS",
    stats_decks: "MAZOS",
    starred: "Destacado",
    starred_title: "Preguntas destacadas",
    saved: "guardado"
  },
  fr: {
    accuracy: "PRÉCISION SUR TOUTES LES TENTATIVES",
    attempt: "tentative",
    attempts: "tentatives",
    across: "parmi",
    quiz: "quiz",
    quizzes: "quiz",
    completion: "Achèvement (Maîtrisé)",
    stats_quizzes: "QUIZ",
    stats_questions: "QUESTIONS",
    stats_decks: "PAQUETS",
    starred: "Favoris",
    starred_title: "Questions favorites",
    saved: "sauvegardé"
  },
  hi: {
    accuracy: "सभी प्रयासों में सटीकता",
    attempt: "प्रयास",
    attempts: "प्रयास",
    across: "में",
    quiz: "क्विज़",
    quizzes: "क्विज़",
    completion: "पूरा किया (महारत हासिल)",
    stats_quizzes: "क्विज़",
    stats_questions: "प्रश्न",
    stats_decks: "डेक",
    starred: "तारांकित",
    starred_title: "तारांकित प्रश्न",
    saved: "सहेजा गया"
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.dashboard = translations[lang];
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
