/**
 * Tests for API layer — fetchAppConfig, error propagation.
 */
global.fetch = jest.fn();

import { fetchAppConfig } from '../../lib/api';

beforeEach(() => jest.clearAllMocks());

describe('fetchAppConfig', () => {
  it('returns { config, error: null } on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aiConfig: { model: 'gemini-pro' } }),
    });
    const result = await fetchAppConfig();
    expect(result.error).toBeNull();
    expect(result.config).toMatchObject({ aiConfig: expect.any(Object) });
  });

  it('returns { config: null, error } on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchAppConfig();
    expect(result.config).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('returns { config: null, error } on non-ok HTTP response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await fetchAppConfig();
    expect(result.config).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
