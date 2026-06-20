const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    fc_title: "Flashcards",
    library: "// your library",
    search: "Search decks...",
    all_decks: "All Decks",
    due: "Due to Review",
    progress: "In Progress",
    mastered: "Mastered",
    your_decks: "Your decks",
    deck_singular: "deck",
    deck_plural: "decks",
    empty_create: "Click + to create your first deck",
    empty_search: "No decks match your search"
  },
  ru: {
    fc_title: "Карточки",
    library: "// ваша библиотека",
    search: "Поиск колод...",
    all_decks: "Все колоды",
    due: "К повторению",
    progress: "В процессе",
    mastered: "Изучено",
    your_decks: "Ваши колоды",
    deck_singular: "колода",
    deck_plural: "колод",
    empty_create: "Нажмите +, чтобы создать первую колоду",
    empty_search: "Колоды не найдены"
  },
  kk: {
    fc_title: "Карточкалар",
    library: "// сіздің кітапханаңыз",
    search: "Колодаларды іздеу...",
    all_decks: "Барлық колодалар",
    due: "Қайталауға",
    progress: "Орындалуда",
    mastered: "Меңгерілді",
    your_decks: "Сіздің колодаларыңыз",
    deck_singular: "колода",
    deck_plural: "колода",
    empty_create: "Алғашқы колоданы жасау үшін + басыңыз",
    empty_search: "Колодалар табылмады"
  },
  es: {
    fc_title: "Tarjetas",
    library: "// tu biblioteca",
    search: "Buscar mazos...",
    all_decks: "Todos los Mazos",
    due: "Por Repasar",
    progress: "En Curso",
    mastered: "Dominado",
    your_decks: "Tus mazos",
    deck_singular: "mazo",
    deck_plural: "mazos",
    empty_create: "Haz clic en + para crear tu primer mazo",
    empty_search: "No se encontraron mazos"
  },
  fr: {
    fc_title: "Cartes",
    library: "// votre bibliothèque",
    search: "Rechercher des paquets...",
    all_decks: "Tous les Paquets",
    due: "À Réviser",
    progress: "En Cours",
    mastered: "Maîtrisé",
    your_decks: "Vos paquets",
    deck_singular: "paquet",
    deck_plural: "paquets",
    empty_create: "Cliquez sur + pour créer votre premier paquet",
    empty_search: "Aucun paquet trouvé"
  },
  hi: {
    fc_title: "फ्लैशकार्ड",
    library: "// आपकी लाइब्रेरी",
    search: "डेक खोजें...",
    all_decks: "सभी डेक",
    due: "समीक्षा के लिए",
    progress: "प्रगति में",
    mastered: "महारत हासिल",
    your_decks: "आपके डेक",
    deck_singular: "डेक",
    deck_plural: "डेक",
    empty_create: "अपना पहला डेक बनाने के लिए + पर क्लिक करें",
    empty_search: "कोई डेक नहीं मिला"
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.flashcards = { ...data.flashcards, ...translations[lang] };
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
