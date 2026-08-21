const express = require('express');
const router = express.Router();

// Gemini prompt templates — loaded from env or fallback to defaults
const GEMINI_MCQ_PROMPT_TEMPLATE = process.env.GEMINI_MCQ_PROMPT_TEMPLATE || `You are an expert tutor and you need to get me full marks.

First output all flashcards under the ===FLASHCARDS=== header.
Then output all quiz questions under the ===MCQS=== header.

===FLASHCARDS===
Generate at least {{MIN_FLASHCARDS}} flashcards covering all the given text.
Flashcards are TERM → DEFINITION, NOT question → answer.
Example:
# SI unit of force
= Newton

===MCQS===
Generate at least {{MIN_MCQS}} quiz covering all the given text.
Example:
? What is the SI unit of force?
+ Newton
- Joule
- Pascal
- Watt

If this is a list of questions generate exactly that many questions and flashcards as given.

Text:
[PASTE YOUR TEXT HERE]`;

const GEMINI_MCQ_PROMPT_TEMPLATE_RU = process.env.GEMINI_MCQ_PROMPT_TEMPLATE_RU || `Вы — опытный преподаватель, и ваша цель — помочь мне сдать тест на высший балл.

Сначала выведите все карточки для запоминания под заголовком ===FLASHCARDS===.
Затем выведите все тестовые вопросы с вариантами ответов под заголовком ===MCQS===.
Все карточки, вопросы и варианты ответов должны быть строго на русском языке.

===FLASHCARDS===
Создайте не менее {{MIN_FLASHCARDS}} карточек, охватывающих весь предоставленный текст.
Карточки должны быть в формате ТЕРМИН → ОПРЕДЕЛЕНИЕ, а НЕ вопрос → ответ.
Пример:
# Единица измерения силы в СИ
= Ньютон

===MCQS===
Создайте тест минимум из {{MIN_MCQS}} вопросов с вариантами ответов, охватывающих весь предоставленный текст.
Каждый вопрос должен начинаться со знака ?, правильный ответ со знака +, а неправильные со знака -.
Пример:
? Какова единица измерения силы в Международной системе единиц (СИ)?
+ Ньютон
- Джоуль
- Паскаль
- Ватт

Если предоставлен список вопросов, создайте ровно столько вопросов и карточек, сколько дано в тексте.

Текст:
[PASTE YOUR TEXT HERE]`;

// Prompt for image-heavy PDFs and PPTX files where text extraction is poor.
const GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL = process.env.GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL || `You are an expert tutor. Carefully read and analyse all visual content in the provided file (slides, diagrams, images, charts, tables and any text visible in the document).

Generate as many flashcards and quiz questions as possible from the content.

First output all flashcards under the ===FLASHCARDS=== header.
Then output all quiz questions under the ===MCQS=== header.

===FLASHCARDS===
Flashcards are TERM → DEFINITION, NOT question → answer.
Example:
# SI unit of force
= Newton

===MCQS===
Example:
? What is the SI unit of force?
+ Newton
- Joule
- Pascal
- Watt`;

// ── Android App Links (.well-known) ──────────────────────────────────────────
router.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      "relation": [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": "com.radium230sorganization.quizforge",
        "sha256_cert_fingerprints": [
          "B9:EA:79:75:64:39:B4:77:63:2F:97:BE:0C:D2:57:D4:81:B2:63:44:B7:86:D1:A0:70:AF:85:13:F0:28:84:96",
          "B2:8B:64:5B:AB:95:20:D5:EE:7E:53:03:1F:DE:AB:5C:F9:8A:59:E5:F2:4B:EA:F4:37:AD:E8:44:80:4A:E7:55",
          "B9:EA:79:75:64:39:B4:77:63:2F:97:BE:0C:D2:57:D4:81:B2:63:44:B7:86:D1:A0:70:AF:85:13:F0:28",
          "B2:8B:64:5B:AB:95:20:D5:EE:7E:53:03:1F:DE:AB:5C:F9:8A:59:E5:F2:4B:EA:F4:37:AD:E8:44:80:4A"
        ]
      }
    }
  ]);
});

// ── Gemini Config ───────────────────────────────────────────────────────────
router.get('/api/gemini-config', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  const lang = (req.query.lang || '').toLowerCase();
  const activePrompt = (lang === 'ru' || lang === 'kk') ? GEMINI_MCQ_PROMPT_TEMPLATE_RU : GEMINI_MCQ_PROMPT_TEMPLATE;
  res.json({
    key: GEMINI_API_KEY,
    prompt: activePrompt,
    promptEn: GEMINI_MCQ_PROMPT_TEMPLATE,
    promptRu: GEMINI_MCQ_PROMPT_TEMPLATE_RU,
  });
});

router.get('/api/gemini-config-ru', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  res.json({ key: GEMINI_API_KEY, prompt: GEMINI_MCQ_PROMPT_TEMPLATE_RU });
});

// ── App Config ──────────────────────────────────────────────────────────────
router.get('/api/app-config', (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_URL = process.env.GEMINI_MODEL_URL;

  if (!GEMINI_API_KEY) {
    console.error("[Backend] Missing GEMINI_API_KEY environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_API_KEY" });
  }
  if (!GEMINI_MODEL_URL) {
    console.error("[Backend] Missing GEMINI_MODEL_URL environment variable.");
    return res.status(500).json({ error: "Server is missing AI configuration.", devError: "Missing GEMINI_MODEL_URL" });
  }

  res.json({
    featureFlags: {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      disableAI:       process.env.DISABLE_AI       === 'true',
      disableBattles:  process.env.DISABLE_BATTLES  === 'true',
    },
    aiConfig: {
      geminiKey: GEMINI_API_KEY,
      modelUrl: GEMINI_MODEL_URL,
      promptTemplate: GEMINI_MCQ_PROMPT_TEMPLATE,
      promptTemplateRu: GEMINI_MCQ_PROMPT_TEMPLATE_RU,
      promptTemplateVisual: GEMINI_MCQ_PROMPT_TEMPLATE_VISUAL,
      chunkSize: 10000,
      maxChunks: 10,
      concurrencyLimit: parseInt(process.env.GEMINI_CONCURRENCY_LIMIT || '10', 10),
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '65536', 10),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
      generationTimeoutMs: parseInt(process.env.AI_GENERATION_TIMEOUT_MS || '60000', 10),
      generationRanges: [
        { max: 2000, minF: "9-14", expF: "11-16" },
        { max: 5000, minF: "18-23", expF: "22-27" },
        { max: 10000, minF: "22-27", expF: "22-32" },
        { max: 15000, minF: "27-29", expF: "27-36" },
        { max: 20000, minF: "36-41", expF: "36-49" },
        { max: 25000, minF: "46-49", expF: "46-61" },
        { max: 9999999, minF: "55-61", expF: "55-73" }
      ],
      maxDailyGenerations: parseInt(process.env.AI_DAILY_LIMIT || '10', 10),
    },
    fileLimits: {
      pdfExtractThresholdMB: 4.2,
      pptMaxMB: 4.5
    },
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "sample-firebase-ai-app-228f1.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "sample-firebase-ai-app-228f1",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "sample-firebase-ai-app-228f1.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "767058687564",
      appId: process.env.FIREBASE_APP_ID || "1:767058687564:web:8e16972e2cf66f0ee826e9",
    },
    appLinks: {
      shareBaseUrl: "https://scorrapp.com/share/quiz/",
      playStoreUrl: "https://scorrapp.com/download",
      downloadUrl: "https://scorrapp.com/download",
      tutorialUrl: "https://youtu.be/jLiU-vW5EuA"
    }
  });
});

// ── App Download & Store Redirect ──────────────────────────────────────────
router.get(['/download', '/api/download'], (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge";
  const appStoreUrl = "https://apps.apple.com/app/scorr/id6746505023";

  if (isIOS) {
    return res.redirect(appStoreUrl);
  }
  return res.redirect(playStoreUrl);
});

// ── App Updates ────────────────────────────────────────────────────────────
router.get('/api/version-config', (req, res) => {
  if (!process.env.APP_MINIMUM_VERSION) {
    console.error("[Backend] Missing APP_MINIMUM_VERSION env var — force-update will never trigger.");
  }
  if (!process.env.APP_LATEST_VERSION) {
    console.error("[Backend] Missing APP_LATEST_VERSION env var.");
  }
  const scheduleStr = process.env.UPDATE_PROMPT_SCHEDULE_DAYS;
  const updatePromptScheduleDays = scheduleStr
    ? scheduleStr.split(',').map(Number).filter(n => !isNaN(n))
    : [0, 7, 14, 30];
  res.json({
    latestVersion: process.env.APP_LATEST_VERSION || "1.0.0",
    minimumVersion: process.env.APP_MINIMUM_VERSION || "1.0.0",
    updateTitle: process.env.APP_UPDATE_TITLE || "Update Required",
    updateMessage: process.env.APP_UPDATE_MESSAGE || "A critical update is available for Scorr. Please update to the latest version to continue using the app.",
    updateButtonText: process.env.APP_UPDATE_BUTTON_TEXT || "Update Now",
    updatePromptScheduleDays
  });
});

module.exports = router;

