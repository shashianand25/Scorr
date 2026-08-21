import { evaluateAnswers, calculateAccuracyPercentage } from '../../utils/scoring';

describe('Quiz Session Scoring & Evaluation Algorithms', () => {
  const questions = [
    {
      id: 'q1',
      question: 'What is 2 + 2?',
      answers: [
        { id: 'a1', text: '4', isCorrect: true },
        { id: 'a2', text: '5', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      question: 'Select primary colors (multi-select)',
      answers: [
        { id: 'a3', text: 'Red', isCorrect: true },
        { id: 'a4', text: 'Blue', isCorrect: true },
        { id: 'a5', text: 'Green', isCorrect: false },
      ],
    },
  ];

  it('correctly grades perfect single and multi-select answers as 100%', () => {
    const answers = {
      q1: ['a1'],
      q2: ['a3', 'a4'],
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(2);
    expect(result.wrongCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.scorePct).toBe(100);
    expect(result.correctIds).toEqual(['q1', 'q2']);
  });

  it('grades partially correct multi-select answers as wrong', () => {
    const answers = {
      q1: ['a1'],
      q2: ['a3'], // missed 'a4'
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.scorePct).toBe(50);
    expect(result.wrongIds).toEqual(['q2']);
  });

  it('marks unanswered questions as skipped', () => {
    const answers = {
      q1: ['a1'],
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.wrongCount).toBe(0);
    expect(result.scorePct).toBe(50);
  });
});
