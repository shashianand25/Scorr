const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    pick_title: "Create",
    pick_subtitle: "What would you like to make?",
    quiz_title: "Quiz",
    quiz_sub: "Multiple-choice questions",
    fc_title: "Flashcards",
    fc_sub: "Flip-card study decks",
    tag_timed: "Timed mode",
    tag_shuffle: "Shuffle",
    tag_wrong: "Wrong review",
    tag_multi: "Multi-select",
    tag_frontback: "Front & back",
    tag_flip: "Flip to reveal",
    tag_deck: "Deck mode",
    tag_quick: "Quick recall"
  },
  ru: {
    pick_title: "Создать",
    pick_subtitle: "Что бы вы хотели создать?",
    quiz_title: "Тест",
    quiz_sub: "Вопросы с вариантами ответов",
    fc_title: "Карточки",
    fc_sub: "Колоды карточек для изучения",
    tag_timed: "На время",
    tag_shuffle: "Перемешать",
    tag_wrong: "Работа над ошибками",
    tag_multi: "Множественный выбор",
    tag_frontback: "Лицо и изнанка",
    tag_flip: "Перевернуть",
    tag_deck: "Режим колоды",
    tag_quick: "Быстрое повторение"
  },
  kk: {
    pick_title: "Жасау",
    pick_subtitle: "Не жасағыңыз келеді?",
    quiz_title: "Тест",
    quiz_sub: "Бірнеше жауапты сұрақтар",
    fc_title: "Карточкалар",
    fc_sub: "Оқуға арналған карточкалар колодасы",
    tag_timed: "Уақытпен",
    tag_shuffle: "Араластыру",
    tag_wrong: "Қателерді қайталау",
    tag_multi: "Бірнеше таңдау",
    tag_frontback: "Алды мен арты",
    tag_flip: "Аудару",
    tag_deck: "Колода режимі",
    tag_quick: "Жылдам қайталау"
  },
  es: {
    pick_title: "Crear",
    pick_subtitle: "¿Qué te gustaría hacer?",
    quiz_title: "Prueba",
    quiz_sub: "Preguntas de opción múltiple",
    fc_title: "Tarjetas",
    fc_sub: "Mazos de estudio",
    tag_timed: "Modo temporizado",
    tag_shuffle: "Aleatorio",
    tag_wrong: "Repaso de errores",
    tag_multi: "Selección múltiple",
    tag_frontback: "Frente y dorso",
    tag_flip: "Voltear para revelar",
    tag_deck: "Modo mazo",
    tag_quick: "Recuerdo rápido"
  },
  fr: {
    pick_title: "Créer",
    pick_subtitle: "Que souhaitez-vous faire ?",
    quiz_title: "Quiz",
    quiz_sub: "Questions à choix multiples",
    fc_title: "Cartes",
    fc_sub: "Paquets de cartes à retourner",
    tag_timed: "Mode chronométré",
    tag_shuffle: "Aléatoire",
    tag_wrong: "Révision des erreurs",
    tag_multi: "Choix multiples",
    tag_frontback: "Recto-verso",
    tag_flip: "Retourner pour voir",
    tag_deck: "Mode paquet",
    tag_quick: "Rappel rapide"
  },
  hi: {
    pick_title: "बनाएं",
    pick_subtitle: "आप क्या बनाना चाहेंगे?",
    quiz_title: "क्विज़",
    quiz_sub: "बहुविकल्पीय प्रश्न",
    fc_title: "फ्लैशकार्ड",
    fc_sub: "फ्लिप-कार्ड अध्ययन डेक",
    tag_timed: "समयबद्ध मोड",
    tag_shuffle: "शफ़ल",
    tag_wrong: "गलत समीक्षा",
    tag_multi: "बहु-चयन",
    tag_frontback: "आगे और पीछे",
    tag_flip: "दिखाने के लिए पलटें",
    tag_deck: "डेक मोड",
    tag_quick: "त्वरित स्मरण"
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.create_pick = translations[lang];
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
