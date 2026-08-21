import { parseQstText, questionsToSourceText } from '../../utils/text';

describe('QST Parser and Text Serializer', () => {
  const sampleQst = [
    '@title: Biology Basics',
    '@category: Science',
    '',
    '===FLASHCARDS===',
    '',
    '# Mitochondria',
    '= The powerhouse of the cell',
    '',
    '# Ribosome',
    '= Site of protein synthesis',
    '',
    '===MCQS===',
    '',
    '? What organelle performs photosynthesis?',
    '+ Chloroplast',
    '- Mitochondria',
    '- Nucleus',
    '- Endoplasmic reticulum',
    '',
    '? Which base is found in RNA but not DNA?',
    '+ Uracil',
    '- Thymine',
    '- Adenine',
  ].join("\n");

  it('correctly parses headers, flashcards, and MCQs from raw QST text', () => {
    const result = parseQstText(sampleQst);
    expect(result.title).toBe('Biology Basics');
    expect(result.category).toBe('Science');
    expect(result.flashcards.length).toBe(2);
    expect(result.questions.length).toBe(2);

    expect(result.flashcards[0].front).toBe('Mitochondria');
    expect(result.flashcards[0].back).toBe('The powerhouse of the cell');

    expect(result.questions[0].prompt).toBe('What organelle performs photosynthesis?');
    expect(result.questions[0].answers.length).toBe(4);
    const correctAns = result.questions[0].answers.find((a: any) => a.isCorrect);
    expect(correctAns?.text).toBe('Chloroplast');
  });

  it('serializes questions and flashcards back into standard QST text', () => {
    const questions = [
      {
        prompt: 'Capital of France?',
        answers: [
          { text: 'Paris', isCorrect: true },
          { text: 'Rome', isCorrect: false },
        ],
      },
    ];
    const flashcards = [{ front: 'Bonjour', back: 'Hello' }];

    const serialized = questionsToSourceText('French 101', 'Languages', questions, flashcards);
    expect(serialized).toContain('@title: French 101');
    expect(serialized).toContain('@category: Languages');
    expect(serialized).toContain('===FLASHCARDS===');
    expect(serialized).toContain('# Bonjour');
    expect(serialized).toContain('= Hello');
    expect(serialized).toContain('===MCQS===');
    expect(serialized).toContain('? Capital of France?');
    expect(serialized).toContain('+ Paris');
    expect(serialized).toContain('- Rome');
  });

  it('handles empty or malformed QST gracefully without crashing', () => {
    const emptyResult = parseQstText('');
    expect(emptyResult.title).toBe('');
    expect(emptyResult.category).toBe('General');
    expect(emptyResult.questions).toEqual([]);
    expect(emptyResult.flashcards).toEqual([]);
  });
});
