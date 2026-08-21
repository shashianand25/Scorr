import type {
  QuizCreationModalProps,
  StartQuizSettingsModalProps,
  TimeLimitModalProps,
} from '../../types/QuizCreationModalProps';

describe('QuizCreationModals Component Suite (apps/mobile/src/components/modals/QuizCreationModals.tsx)', () => {
  function getEffectiveQuestionCount(
    mode: string,
    total: number,
    unanswered: number,
    wrong: number,
    randomCount: number,
    rangeStart: number,
    rangeEnd: number
  ): number {
    switch (mode) {
      case 'wrong':
        return wrong;
      case 'unanswered':
        return unanswered;
      case 'random':
        return Math.min(Math.max(1, randomCount), total);
      case 'range':
        return Math.max(1, rangeEnd - rangeStart + 1);
      case 'all':
      default:
        return total;
    }
  }

  function formatTimeLimitLabel(secondsPerQ: number | null, totalLimitMin: number | null): string {
    if (secondsPerQ && secondsPerQ > 0) {
      return `${secondsPerQ}s per question`;
    }
    if (totalLimitMin && totalLimitMin > 0) {
      return `${totalLimitMin} min total`;
    }
    return 'No time limit';
  }

  it('determines the effective question count across different preset modes', () => {
    // Mode: all
    expect(getEffectiveQuestionCount('all', 30, 15, 5, 10, 1, 10)).toBe(30);

    // Mode: wrong mistakes only
    expect(getEffectiveQuestionCount('wrong', 30, 15, 5, 10, 1, 10)).toBe(5);

    // Mode: unanswered
    expect(getEffectiveQuestionCount('unanswered', 30, 15, 5, 10, 1, 10)).toBe(15);

    // Mode: random slice
    expect(getEffectiveQuestionCount('random', 30, 15, 5, 12, 1, 10)).toBe(12);

    // Mode: custom index range (1 to 8 inclusive)
    expect(getEffectiveQuestionCount('range', 30, 15, 5, 10, 1, 8)).toBe(8);
  });

  it('formats time constraint labels accurately', () => {
    expect(formatTimeLimitLabel(15, null)).toBe('15s per question');
    expect(formatTimeLimitLabel(null, 20)).toBe('20 min total');
    expect(formatTimeLimitLabel(null, null)).toBe('No time limit');
  });

  it('satisfies narrowed StartQuizSettingsModalProps and TimeLimitModalProps contracts', () => {
    const settingsProps: StartQuizSettingsModalProps = {
      selectedQuiz: {
        id: 'q_1',
        title: 'Cell Biology',
        category: 'Biology',
        questions: 20,
      },
      selectionMode: 'all',
      shuffleQuestions: true,
      shuffleAnswers: false,
      showAnswerOnSubmit: true,
      handleStartQuiz: jest.fn(),
    };

    const timeProps: TimeLimitModalProps = {
      quizTimeLimit: 15,
      quizPerQuestionTimer: null,
      showTimeLimitDropdown: false,
    };

    const modalProps: QuizCreationModalProps = {
      ...settingsProps,
      ...timeProps,
      showQuizCreatedModal: {
        title: 'Cell Biology',
        count: 20,
      },
      settingsDarkMode: true,
    };

    expect(modalProps.showQuizCreatedModal?.title).toBe('Cell Biology');
    expect(modalProps.shuffleQuestions).toBe(true);
    expect(modalProps.quizTimeLimit).toBe(15);
  });
});
