import { getUserErrorMessage } from '../../utils/errors';
import { generateMockQuestionsForQuiz, getCategoryIconDetails } from '../../utils/quiz';
import { isValidEmail, isValidBattleRoomCode, sanitizeInput, clampValue, validateQuizDraft } from '../../utils/validation';

describe('mobile utils coverage boost', () => {
  describe('errors.ts', () => {
    it('handles network error strings and error objects', () => {
      expect(getUserErrorMessage('network timeout')).toBe('Please check your internet connection and try again.');
      expect(getUserErrorMessage(new Error('UnknownHostException occurred'))).toBe('Please check your internet connection and try again.');
      expect(getUserErrorMessage('internet disconnected')).toBe('Please check your internet connection and try again.');
    });

    it('handles permission and access denied errors', () => {
      expect(getUserErrorMessage('permission denied')).toBe('Permission denied. Please allow access and try again.');
      expect(getUserErrorMessage(new Error('access denied to storage'))).toBe('Permission denied. Please allow access and try again.');
    });

    it('handles pdf and document picker errors', () => {
      expect(getUserErrorMessage('pdf parse failed')).toContain("Couldn't open this PDF");
      expect(getUserErrorMessage('file picker cancelled or file not found')).toContain("Couldn't open the selected file");
    });

    it('handles firebase and ppt upload errors', () => {
      expect(getUserErrorMessage('auth/user-not-found')).toContain('Unable to connect to your account right now');
      expect(getUserErrorMessage('payload_too_large 413')).toContain('PPT upload limit is 4.5 MB');
    });

    it('handles general fallback errors', () => {
      expect(getUserErrorMessage('something random')).toBe('Something went wrong. Please try again. (something random)');
    });
  });

  describe('quiz.ts', () => {
    it('generates mock questions for quiz with prompt and options', () => {
      const questions = generateMockQuestionsForQuiz('Science', 3);
      expect(questions).toHaveLength(3);
      expect(questions[0].prompt).toContain('Science');
      expect(questions[0].answers).toHaveLength(4);
      expect(questions[0].answers.some(a => a.isCorrect)).toBe(true);
    });

    it('returns category icon details', () => {
      const details = getCategoryIconDetails('Math');
      expect(details.color).toBe('#6366f1');
      expect(details.iconName).toBe('document-text-outline');
    });
  });

  describe('validation.ts', () => {
    it('validates emails correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('validates battle room codes', () => {
      expect(isValidBattleRoomCode('ABCDEF')).toBe(true);
      expect(isValidBattleRoomCode('123456')).toBe(true);
      expect(isValidBattleRoomCode('123')).toBe(false);
      expect(isValidBattleRoomCode('')).toBe(false);
    });

    it('sanitizes input removing control characters', () => {
      expect(sanitizeInput('hello\0world')).toBe('helloworld');
      expect(sanitizeInput(null as any)).toBe('');
    });

    it('clamps numeric values', () => {
      expect(clampValue(5, 0, 10)).toBe(5);
      expect(clampValue(-5, 0, 10)).toBe(0);
      expect(clampValue(15, 0, 10)).toBe(10);
      expect(clampValue(NaN, 0, 10)).toBe(0);
    });

    it('validates quiz draft payloads', () => {
      expect(validateQuizDraft(null as any).valid).toBe(false);
      expect(validateQuizDraft({ title: '' }).valid).toBe(false);
      expect(validateQuizDraft({ title: 'Test', questions: [] }).valid).toBe(false);
      expect(validateQuizDraft({ title: 'Test', questions: [{ question: '', options: ['A'] }] }).valid).toBe(false);
      expect(validateQuizDraft({ title: 'Test', questions: [{ question: 'Q1', options: ['A', 'B'] }] }).valid).toBe(true);
    });
  });
});
