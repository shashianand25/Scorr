const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    active_quizzes: "Your Active Quizzes",
    filter_all: "All",
    filter_progress: "In progress",
    filter_notstarted: "Not started",
    filter_completed: "Completed",
    quizzes_label: "Quizzes",
    active_label: "active",
    empty_quiz_create: "Click + to create your first quiz",
    empty_search: "No quizzes match your search",
    empty_active: "No active quizzes"
  },
  ru: {
    active_quizzes: "Ваши активные тесты",
    filter_all: "Все",
    filter_progress: "В процессе",
    filter_notstarted: "Не начато",
    filter_completed: "Завершено",
    quizzes_label: "Тесты",
    active_label: "активных",
    empty_quiz_create: "Нажмите +, чтобы создать свой первый тест",
    empty_search: "Тесты не найдены",
    empty_active: "Нет активных тестов"
  },
  kk: {
    active_quizzes: "Сіздің белсенді тесттеріңіз",
    filter_all: "Барлығы",
    filter_progress: "Орындалуда",
    filter_notstarted: "Басталмаған",
    filter_completed: "Аяқталды",
    quizzes_label: "Тесттер",
    active_label: "белсенді",
    empty_quiz_create: "Алғашқы тестті жасау үшін + басыңыз",
    empty_search: "Тесттер табылмады",
    empty_active: "Белсенді тесттер жоқ"
  },
  es: {
    active_quizzes: "Tus Pruebas Activas",
    filter_all: "Todos",
    filter_progress: "En curso",
    filter_notstarted: "No iniciado",
    filter_completed: "Completado",
    quizzes_label: "Pruebas",
    active_label: "activos",
    empty_quiz_create: "Haz clic en + para crear tu primera prueba",
    empty_search: "No se encontraron pruebas",
    empty_active: "No hay pruebas activas"
  },
  fr: {
    active_quizzes: "Vos Quiz Actifs",
    filter_all: "Tous",
    filter_progress: "En cours",
    filter_notstarted: "Non commencé",
    filter_completed: "Terminé",
    quizzes_label: "Quiz",
    active_label: "actifs",
    empty_quiz_create: "Cliquez sur + pour créer votre premier quiz",
    empty_search: "Aucun quiz ne correspond",
    empty_active: "Aucun quiz actif"
  },
  hi: {
    active_quizzes: "आपके सक्रिय क्विज़",
    filter_all: "सभी",
    filter_progress: "प्रगति में",
    filter_notstarted: "शुरू नहीं हुआ",
    filter_completed: "पूरा हो गया",
    quizzes_label: "क्विज़",
    active_label: "सक्रिय",
    empty_quiz_create: "अपना पहला क्विज़ बनाने के लिए + पर क्लिक करें",
    empty_search: "कोई क्विज़ नहीं मिला",
    empty_active: "कोई सक्रिय क्विज़ नहीं"
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.home = { ...data.home, ...translations[lang] };
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
