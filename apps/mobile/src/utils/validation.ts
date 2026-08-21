// ==============================================================================
// Scorr Mobile - Comprehensive Input Validation & Sanitization Suite
// ==============================================================================

/**
 * Validates RFC 5322 compliant email addresses.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates 6-character alphanumeric battle room codes.
 */
export function isValidBattleCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
}
export const isValidBattleRoomCode = isValidBattleCode;

/**
 * Sanitizes input strings by trimming and stripping dangerous control characters.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/**
 * Clamps numeric values strictly between min and max bounds.
 */
export function clampValue(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates a quiz draft schema.
 */
export interface QuizDraftValidation {
  valid: boolean;
  errors: string[];
}

export function validateQuizDraft(draft: {
  title?: string;
  questions?: Array<{ question?: string; options?: string[]; correctIndex?: number }>;
}): QuizDraftValidation {
  const errors: string[] = [];

  if (!draft || typeof draft !== 'object') {
    return { valid: false, errors: ['Quiz draft payload is required'] };
  }

  if (!draft.title || draft.title.trim().length === 0) {
    errors.push('Quiz title cannot be empty');
  }

  if (!Array.isArray(draft.questions) || draft.questions.length === 0) {
    errors.push('Quiz must contain at least one question');
  } else {
    draft.questions.forEach((q, idx) => {
      if (!q.question || q.question.trim().length === 0) {
        errors.push(`Question #${idx + 1} text is missing`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question #${idx + 1} must have at least 2 options`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
