describe('Input and Question Schema Validation', () => {
  function validateEmail(email: string): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function validateQuizDraft(title: string, questions: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!title || !title.trim()) errors.push('Title is required');
    if (!Array.isArray(questions) || questions.length === 0) {
      errors.push('At least one question is required');
    } else {
      questions.forEach((q, idx) => {
        if (!q.prompt || !q.prompt.trim()) errors.push('Question ' + (idx + 1) + ' is missing a prompt');
        if (!Array.isArray(q.answers) || q.answers.length < 2) {
          errors.push('Question ' + (idx + 1) + ' must have at least 2 options');
        } else if (!q.answers.some((a: any) => a.isCorrect)) {
          errors.push('Question ' + (idx + 1) + ' must have at least one correct answer');
        }
      });
    }
    return { isValid: errors.length === 0, errors };
  }

  it('validates standard email addresses and rejects invalid inputs', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@sub.domain.org')).toBe(true);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('missing@tld')).toBe(false);
  });

  it('validates quiz draft title and questions structure', () => {
    const validDraft = {
      title: 'Valid Quiz',
      questions: [
        {
          prompt: 'What is 1+1?',
          answers: [
            { text: '2', isCorrect: true },
            { text: '3', isCorrect: false },
          ],
        },
      ],
    };
    expect(validateQuizDraft(validDraft.title, validDraft.questions).isValid).toBe(true);

    const invalidDraft = {
      title: '',
      questions: [
        {
          prompt: '',
          answers: [{ text: '2', isCorrect: false }],
        },
      ],
    };
    const check = validateQuizDraft(invalidDraft.title, invalidDraft.questions);
    expect(check.isValid).toBe(false);
    expect(check.errors.length).toBeGreaterThan(1);
  });
});
