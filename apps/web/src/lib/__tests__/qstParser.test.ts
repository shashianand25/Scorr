import { parseQstText, questionsToSourceText, renderFormattedText } from '../qstParser';

describe('qstParser tests', () => {
  it('handles empty or non-string inputs', () => {
    expect(parseQstText('')).toEqual({ title: '', category: 'General', questions: [], flashcards: [] });
    expect(parseQstText(null as any)).toEqual({ title: '', category: 'General', questions: [], flashcards: [] });
  });

  it('parses title and category metadata', () => {
    const text = `@title: Biology Basics\n@category: Science\n? What is cell?\n+ Basic unit of life\n- Rock`;
    const res = parseQstText(text);
    expect(res.title).toBe('Biology Basics');
    expect(res.category).toBe('Science');
    expect(res.questions).toHaveLength(1);
    expect(res.questions[0].answers).toHaveLength(2);
    expect(res.questions[0].type).toBe('single_choice');
  });

  it('parses sections with explicit headers and flashcards', () => {
    const text = `===FLASHCARDS===\n# Mitochondria\n= Powerhouse of cell\n\n===MCQS===\n? Powerhouse of cell?\n+ Mitochondria\n- Ribosome`;
    const res = parseQstText(text);
    expect(res.flashcards).toHaveLength(1);
    expect(res.flashcards[0].front).toBe('Mitochondria');
    expect(res.flashcards[0].back).toBe('Powerhouse of cell');
    expect(res.questions).toHaveLength(1);
    expect(res.questions[0].answers[0].isCorrect).toBe(true);
  });

  it('handles multiple correct answers as multiple_choice', () => {
    const text = `? Choose even numbers\n+ 2\n+ 4\n- 3`;
    const res = parseQstText(text);
    expect(res.questions[0].type).toBe('multiple_choice');
  });

  it('converts questions back to source text', () => {
    const questions = [
      { prompt: 'What is 1+1?', answers: [{ text: '2', isCorrect: true }, { text: '3', isCorrect: false }] }
    ];
    const flashcards = [{ front: 'Term', back: 'Def' }];
    const source = questionsToSourceText('Math', 'Basics', questions, flashcards);
    expect(source).toContain('@title: Math');
    expect(source).toContain('===FLASHCARDS===');
    expect(source).toContain('===MCQS===');
  });

  it('renders formatted text helper', () => {
    expect(renderFormattedText('**bold** and *italic* and $$math$$ and <u>underline</u> and ---')).toBeDefined();
    expect(renderFormattedText('')).toBeNull();
  });
});
