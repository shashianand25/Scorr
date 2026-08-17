export interface QuizQuestionAnswer {
  text?: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id?: string;
  question?: string;
  answers?: QuizQuestionAnswer[];
  explanation?: string;
}

export interface QuizFlashcard {
  id?: string;
  front?: string;
  back?: string;
}

export interface FingerprintableQuiz {
  id?: string;
  title?: string;
  questionsList?: QuizQuestion[];
  flashcards?: QuizFlashcard[];
  sourceText?: string;
  [key: string]: any;
}

/**
 * Conservatively normalizes text for deterministic fingerprinting:
 * - Unicode NFC normalization
 * - Converts CRLF / CR to LF
 * - Collapses repeated horizontal whitespace (spaces/tabs) to a single space
 * - Collapses consecutive newlines to a single newline
 * - Trims leading and trailing whitespace
 */
export function normalizeQuizText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * Builds a deterministic canonical string representation of a quiz's
 * questions, answer choices with correctness flags, and flashcards.
 */
export function buildQuizCanonicalString(quiz: FingerprintableQuiz): string {
  if (!quiz) return '';

  const qList = (quiz.questionsList || []).map((q) => {
    const qText = normalizeQuizText(q.question || '');
    const answers = (q.answers || [])
      .map((a) => {
        const aText = normalizeQuizText(a.text || '');
        const isCorrect = a.isCorrect === true;
        return `[${isCorrect ? 'T' : 'F'}]${aText}`;
      })
      .sort() // Deterministic answer order
      .join('|');
    return `Q:${qText}::A:${answers}`;
  }).sort().join('###'); // Deterministic question order

  const fList = (quiz.flashcards || []).map((f) => {
    const front = normalizeQuizText(f.front || '');
    const back = normalizeQuizText(f.back || '');
    return `F:${front}::B:${back}`;
  }).sort().join('###'); // Deterministic flashcard order

  if (!qList && !fList && quiz.sourceText) {
    return `SRC:${normalizeQuizText(quiz.sourceText)}`;
  }

  return `QUESTIONS:[${qList}]||FLASHCARDS:[${fList}]`;
}

/**
 * Generates a deterministic SHA-256 fingerprint for a quiz.
 * Two quizzes have the same fingerprint ONLY when their question & flashcard
 * content is identical after normalization.
 */
export async function computeQuizFingerprint(quiz: FingerprintableQuiz): Promise<string> {
  const canonicalString = buildQuizCanonicalString(quiz);
  if (!canonicalString || canonicalString === 'QUESTIONS:[]||FLASHCARDS:[]') {
    return '';
  }

  // Dynamic import of expo-crypto for React Native runtime
  try {
    const Crypto = await import('expo-crypto');
    if (Crypto && typeof Crypto.digestStringAsync === 'function') {
      return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalString);
    }
  } catch {
    // In Node.js or test environment where expo-crypto is unavailable
  }

  // Fallback for Node.js / Jest unit test environment
  try {
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(canonicalString).digest('hex');
  } catch {
    return canonicalString;
  }
}
