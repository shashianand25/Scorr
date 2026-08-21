const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    insight: {
      peak_score: "Peak Score",
      avg_score: "Avg Score",
      sessions: "Sessions",
      score_trends: "SCORE TRENDS",
      start_test: "Start Test",
      incorrect: "Incorrect",
      quiz_directory: "Quiz Directory",
      attempt_history: "Attempt History",
      attempt: "Attempt"
    },
    actions: {
      start_test: "Start Test",
      statistics: "Statistics",
      rename: "Rename",
      delete: "Delete",
      questions: "questions",
      attempts: "attempts"
    },
    create_menu: {
      import_txt: "Import quiz from file (.txt)",
      flashcard_set: "Flashcard set",
      create_manual: "Create quiz manually"
    }
  },
  ru: {
    insight: {
      peak_score: "Макс. балл",
      avg_score: "Средн. балл",
      sessions: "Сессий",
      score_trends: "ГРАФИК УСПЕВАЕМОСТИ",
      start_test: "Начать тест",
      incorrect: "Ошибки",
      quiz_directory: "Каталог вопросов",
      attempt_history: "История попыток",
      attempt: "Попытка"
    },
    actions: {
      start_test: "Начать тест",
      statistics: "Статистика",
      rename: "Переименовать",
      delete: "Удалить",
      questions: "вопросов",
      attempts: "попыток"
    },
    create_menu: {
      import_txt: "Импорт из файла (.txt)",
      flashcard_set: "Набор карточек",
      create_manual: "Создать вручную"
    }
  },
  kk: {
    insight: {
      peak_score: "Макс. ұпай",
      avg_score: "Орташа ұпай",
      sessions: "Сессиялар",
      score_trends: "ҮЛГЕРІМ ГРАФИГІ",
      start_test: "Тестті бастау",
      incorrect: "Қателер",
      quiz_directory: "Сұрақтар каталогы",
      attempt_history: "Әрекеттер тарихы",
      attempt: "Әрекет"
    },
    actions: {
      start_test: "Тестті бастау",
      statistics: "Статистика",
      rename: "Атын өзгерту",
      delete: "Жою",
      questions: "сұрақ",
      attempts: "әрекет"
    },
    create_menu: {
      import_txt: "Файлдан импорттау (.txt)",
      flashcard_set: "Карточкалар жинағы",
      create_manual: "Қолмен жасау"
    }
  },
  es: {
    insight: {
      peak_score: "Puntuación Máx",
      avg_score: "Puntuación Promedio",
      sessions: "Sesiones",
      score_trends: "TENDENCIAS DE PUNTUACIÓN",
      start_test: "Iniciar Prueba",
      incorrect: "Incorrectos",
      quiz_directory: "Directorio de Prueba",
      attempt_history: "Historial de Intentos",
      attempt: "Intento"
    },
    actions: {
      start_test: "Iniciar Prueba",
      statistics: "Estadísticas",
      rename: "Renombrar",
      delete: "Eliminar",
      questions: "preguntas",
      attempts: "intentos"
    },
    create_menu: {
      import_txt: "Importar de archivo (.txt)",
      flashcard_set: "Conjunto de tarjetas",
      create_manual: "Crear prueba manualmente"
    }
  },
  fr: {
    insight: {
      peak_score: "Score Max",
      avg_score: "Score Moyen",
      sessions: "Sessions",
      score_trends: "TENDANCES DES SCORES",
      start_test: "Commencer",
      incorrect: "Incorrects",
      quiz_directory: "Répertoire du Quiz",
      attempt_history: "Historique des Tentatives",
      attempt: "Tentative"
    },
    actions: {
      start_test: "Commencer le test",
      statistics: "Statistiques",
      rename: "Renommer",
      delete: "Supprimer",
      questions: "questions",
      attempts: "tentatives"
    },
    create_menu: {
      import_txt: "Importer d'un fichier (.txt)",
      flashcard_set: "Jeu de cartes",
      create_manual: "Créer un quiz manuellement"
    }
  },
  hi: {
    insight: {
      peak_score: "अधिकतम स्कोर",
      avg_score: "औसत स्कोर",
      sessions: "सत्र",
      score_trends: "स्कोर रुझान",
      start_test: "टेस्ट शुरू करें",
      incorrect: "गलत",
      quiz_directory: "क्विज़ निर्देशिका",
      attempt_history: "प्रयास इतिहास",
      attempt: "प्रयास"
    },
    actions: {
      start_test: "टेस्ट शुरू करें",
      statistics: "आंकड़े",
      rename: "नाम बदलें",
      delete: "हटाएं",
      questions: "प्रश्न",
      attempts: "प्रयास"
    },
    create_menu: {
      import_txt: "फ़ाइल से आयात करें (.txt)",
      flashcard_set: "फ्लैशकार्ड सेट",
      create_manual: "मैन्युअल रूप से क्विज़ बनाएं"
    }
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.assign(data, translations[lang]);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
