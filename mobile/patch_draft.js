const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'hi', 'ru', 'kk'];
const translations = {
  en: {
    next_btn: "Next: Draft Questions",
    draft_title: "Draft Questions",
    question_prompt: "Question Prompt",
    question_placeholder: "Enter your question prompt here...",
    options: "Options / Choices",
    options_desc: "Type answer texts below and select the correct answer amongst them.",
    add_option: "Add Option",
    create_quiz_btn: "Create Quiz"
  },
  ru: {
    next_btn: "Далее: Составить вопросы",
    draft_title: "Составление вопросов",
    question_prompt: "Текст вопроса",
    question_placeholder: "Введите текст вашего вопроса здесь...",
    options: "Варианты ответов",
    options_desc: "Введите варианты ниже и выберите правильный.",
    add_option: "Добавить вариант",
    create_quiz_btn: "Создать тест"
  },
  kk: {
    next_btn: "Келесі: Сұрақтарды құрастыру",
    draft_title: "Сұрақтар құрастыру",
    question_prompt: "Сұрақтың мәтіні",
    question_placeholder: "Сұрақтың мәтінін осында енгізіңіз...",
    options: "Жауап нұсқалары",
    options_desc: "Нұсқаларды енгізіп, дұрыс жауапты таңдаңыз.",
    add_option: "Нұсқа қосу",
    create_quiz_btn: "Тест жасау"
  },
  es: {
    next_btn: "Siguiente: Redactar Preguntas",
    draft_title: "Redactar Preguntas",
    question_prompt: "Texto de la pregunta",
    question_placeholder: "Escribe tu pregunta aquí...",
    options: "Opciones / Alternativas",
    options_desc: "Escribe las respuestas abajo y selecciona la correcta.",
    add_option: "Agregar Opción",
    create_quiz_btn: "Crear Prueba"
  },
  fr: {
    next_btn: "Suivant: Rédiger les Questions",
    draft_title: "Rédiger les Questions",
    question_prompt: "Texte de la question",
    question_placeholder: "Saisissez votre question ici...",
    options: "Options / Choix",
    options_desc: "Saisissez les réponses ci-dessous et sélectionnez la bonne.",
    add_option: "Ajouter une option",
    create_quiz_btn: "Créer le Quiz"
  },
  hi: {
    next_btn: "अगला: प्रश्न ड्राफ्ट करें",
    draft_title: "प्रश्न ड्राफ्ट करें",
    question_prompt: "प्रश्न टेक्स्ट",
    question_placeholder: "अपना प्रश्न यहाँ दर्ज करें...",
    options: "विकल्प / विकल्प",
    options_desc: "नीचे उत्तर टेक्स्ट टाइप करें और सही उत्तर चुनें।",
    add_option: "विकल्प जोड़ें",
    create_quiz_btn: "क्विज़ बनाएं"
  }
};

locales.forEach(lang => {
  const p = path.join(__dirname, 'src/locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.create = { ...data.create, ...translations[lang] };
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});
