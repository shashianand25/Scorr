const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    flashcards: {
      term: "term",
      terms: "terms",
      due: "due"
    },
    profile: {
      about_guide_text: "Made to help students study smarter — transform any notes into powerful MCQ quizzes, track your progress, and master any subject faster.",
      guidance: "UNDER THE GUIDANCE OF",
      feedback_title: "Share your thoughts",
      feedback_desc: "Found a bug? Have a suggestion? Want a new feature? We're all ears.",
      feedback_placeholder: "Tell us what you think…",
      send_feedback: "Send Feedback",
      re_attempt_wrong: "Re-attempt Incorrect",
      missed_questions: "missed questions",
      delete_attempt: "Delete Attempt"
    }
  },
  ru: {
    flashcards: {
      term: "термин",
      terms: "терминов",
      due: "к повторению"
    },
    profile: {
      about_guide_text: "Создано, чтобы помочь студентам учиться эффективнее — превращайте любые конспекты в мощные тесты, отслеживайте прогресс и быстрее осваивайте любой предмет.",
      guidance: "ПОД РУКОВОДСТВОМ",
      feedback_title: "Поделитесь своими мыслями",
      feedback_desc: "Нашли ошибку? Есть предложение? Хотите новую функцию? Мы вас внимательно слушаем.",
      feedback_placeholder: "Расскажите, что вы думаете…",
      send_feedback: "Отправить отзыв",
      re_attempt_wrong: "Повторить ошибки",
      missed_questions: "пропущенных вопросов",
      delete_attempt: "Удалить попытку"
    }
  },
  kk: {
    flashcards: {
      term: "термин",
      terms: "термин",
      due: "қайталауға"
    },
    profile: {
      about_guide_text: "Студенттерге тиімді оқуға көмектесу үшін жасалған — кез келген конспектілерді тестке айналдырыңыз, үлгеріміңізді қадағалаңыз және кез келген пәнді тез меңгеріңіз.",
      guidance: "ЖЕТЕКШІЛІГІМЕН",
      feedback_title: "Ойыңызбен бөлісіңіз",
      feedback_desc: "Қате таптыңыз ба? Ұсынысыңыз бар ма? Жаңа функцияны қалайсыз ба? Біз сізді тыңдауға дайынбыз.",
      feedback_placeholder: "Не ойлайтыныңызды айтыңыз…",
      send_feedback: "Пікір жіберу",
      re_attempt_wrong: "Қателерді қайталау",
      missed_questions: "өткізілген сұрақтар",
      delete_attempt: "Әрекетті жою"
    }
  },
  es: {
    flashcards: {
      term: "término",
      terms: "términos",
      due: "pendientes"
    },
    profile: {
      about_guide_text: "Hecho para ayudar a los estudiantes a estudiar de forma más inteligente — transforma cualquier nota en pruebas MCQ, sigue tu progreso y domina cualquier tema más rápido.",
      guidance: "BAJO LA DIRECCIÓN DE",
      feedback_title: "Comparte tus pensamientos",
      feedback_desc: "¿Encontraste un error? ¿Tienes una sugerencia? ¿Quieres una nueva función? Somos todo oídos.",
      feedback_placeholder: "Cuéntanos lo que piensas…",
      send_feedback: "Enviar Comentarios",
      re_attempt_wrong: "Reintentar Incorrectos",
      missed_questions: "preguntas falladas",
      delete_attempt: "Eliminar Intento"
    }
  },
  fr: {
    flashcards: {
      term: "terme",
      terms: "termes",
      due: "à réviser"
    },
    profile: {
      about_guide_text: "Conçu pour aider les étudiants à étudier plus intelligemment — transformez n'importe quelles notes en quiz MCQ, suivez vos progrès et maîtrisez n'importe quel sujet plus rapidement.",
      guidance: "SOUS LA DIRECTION DE",
      feedback_title: "Partagez vos pensées",
      feedback_desc: "Vous avez trouvé un bug ? Vous avez une suggestion ? Vous voulez une nouvelle fonctionnalité ? Nous sommes tout ouïe.",
      feedback_placeholder: "Dites-nous ce que vous pensez…",
      send_feedback: "Envoyer vos commentaires",
      re_attempt_wrong: "Réessayer les erreurs",
      missed_questions: "questions manquées",
      delete_attempt: "Supprimer la tentative"
    }
  },
  hi: {
    flashcards: {
      term: "शब्द",
      terms: "शब्द",
      due: "बाकी"
    },
    profile: {
      about_guide_text: "छात्रों को स्मार्ट तरीके से अध्ययन करने में मदद करने के लिए बनाया गया - किसी भी नोट्स को शक्तिशाली MCQ क्विज़ में बदलें, अपनी प्रगति को ट्रैक करें और किसी भी विषय में तेजी से महारत हासिल करें।",
      guidance: "के मार्गदर्शन में",
      feedback_title: "अपने विचार साझा करें",
      feedback_desc: "कोई बग मिला? कोई सुझाव है? एक नई सुविधा चाहिए? हम सब सुन रहे हैं।",
      feedback_placeholder: "हमें बताएं कि आप क्या सोचते हैं...",
      send_feedback: "प्रतिक्रिया भेजें",
      re_attempt_wrong: "गलतियों का पुनः प्रयास करें",
      missed_questions: "छूटे हुए प्रश्न",
      delete_attempt: "प्रयास हटाएं"
    }
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  
  // Merge flashcards deeply
  if (translations[lang].flashcards) {
    data.flashcards = { ...data.flashcards, ...translations[lang].flashcards };
  }
  // Merge profile deeply
  if (translations[lang].profile) {
    data.profile = { ...data.profile, ...translations[lang].profile };
  }

  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

// Cache bust i18n again
fs.appendFileSync(path.join(__dirname, 'src/lib/i18n.ts'), `\n// Cache bust ${Date.now()}\n`);

