describe('API Client Layer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('parses app config response successfully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        aiConfig: { model: 'gemini-2.5-flash', dailyLimit: 10 },
      }),
    });

    const response = await fetch('https://api.scorr.app/config');
    const data = await response.json();
    expect(response.ok).toBe(true);
    expect(data.aiConfig.model).toBe('gemini-2.5-flash');
    expect(data.aiConfig.dailyLimit).toBe(10);
  });

  it('handles server error responses gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Database unreachable' }),
    });

    const response = await fetch('https://api.scorr.app/quizzes');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database unreachable');
  });

  it('handles network disconnection errors', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed'));

    await expect(fetch('https://api.scorr.app/quizzes')).rejects.toThrow('Network request failed');
  });
});
