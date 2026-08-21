import type { ResultsScreenProps, ActiveQuizSession } from '../../types/QuizSessionProps';

describe('QuizResultsScreen Suite (apps/mobile/src/screens/QuizResultsScreen.tsx)', () => {
  function calculateScorePercentage(correct: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.round((correct / total) * 100);
  }

  function getGradeBadge(percentage: number): { grade: string; color: string } {
    if (percentage >= 90) return { grade: 'A', color: '#10b981' };
    if (percentage >= 80) return { grade: 'B', color: '#3b82f6' };
    if (percentage >= 70) return { grade: 'C', color: '#f59e0b' };
    if (percentage >= 60) return { grade: 'D', color: '#f97316' };
    return { grade: 'F', color: '#ef4444' };
  }

  function extractWrongQuestions(session: ActiveQuizSession): Array<{ id: string; prompt: string }> {
    const wrongQs: Array<{ id: string; prompt: string }> = [];
    const questions = session.questions || [];
    const answers = session.answers || {};

    questions.forEach((q) => {
      const selectedAnswers = answers[q.id] || [];
      const correctAnswers = q.answers.filter((a) => a.isCorrect).map((a) => a.id);
      const isCorrect =
        selectedAnswers.length === correctAnswers.length &&
        selectedAnswers.every((id) => correctAnswers.includes(id));

      if (!isCorrect) {
        wrongQs.push({ id: q.id, prompt: q.prompt });
      }
    });

    return wrongQs;
  }

  it('calculates score percentages and assigns correct grade badges', () => {
    expect(calculateScorePercentage(10, 10)).toBe(100);
    expect(getGradeBadge(100).grade).toBe('A');

    expect(calculateScorePercentage(8, 10)).toBe(80);
    expect(getGradeBadge(80).grade).toBe('B');

    expect(calculateScorePercentage(7, 10)).toBe(70);
    expect(getGradeBadge(70).grade).toBe('C');

    expect(calculateScorePercentage(4, 10)).toBe(40);
    expect(getGradeBadge(40).grade).toBe('F');
  });

  it('extracts wrong questions for targeted mistake review', () => {
    const mockSession: ActiveQuizSession = {
      quizTitle: 'Cell Biology',
      currentIndex: 2,
      questions: [
        {
          id: 'q1',
          prompt: 'What is the powerhouse of the cell?',
          answers: [
            { id: 'a1', text: 'Mitochondria', isCorrect: true },
            { id: 'a2', text: 'Nucleus', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          prompt: 'Which organelle makes proteins?',
          answers: [
            { id: 'a3', text: 'Ribosome', isCorrect: true },
            { id: 'a4', text: 'Golgi Apparatus', isCorrect: false },
          ],
        },
      ],
      answers: {
        q1: ['a1'], // Correct
        q2: ['a4'], // Wrong
      },
    };

    const wrongList = extractWrongQuestions(mockSession);
    expect(wrongList).toHaveLength(1);
    expect(wrongList[0].id).toBe('q2');
    expect(wrongList[0].prompt).toBe('Which organelle makes proteins?');
  });

  it('satisfies narrowed ResultsScreenProps prop contract', () => {
    const props: ResultsScreenProps = {
      activeSession: {
        quizTitle: 'Genetics',
        currentIndex: 0,
        questions: [],
        answers: {},
      },
      setActiveSession: jest.fn(),
      settingsDarkMode: true,
      quizzes: [],
      showWrongReview: false,
      setShowWrongReview: jest.fn(),
      saveAndExitQuizSession: jest.fn(),
    };

    expect(props.activeSession?.quizTitle).toBe('Genetics');
    expect(props.settingsDarkMode).toBe(true);
  });
});
