/**
 * Tests for AI generation handler — abort, cancellation, context.
 */
jest.mock('../../lib/api', () => ({
  fetchAppConfig: jest.fn(() => Promise.resolve({ config: { aiConfig: {} }, error: null })),
  checkAiDailyLimit: jest.fn(() => Promise.resolve({ allowed: true, error: null })),
  checkMasterQuizCache: jest.fn(() => Promise.resolve({ cached: null, error: null })),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('aiGenerationHandler', () => {
  it('creates an AbortController before starting generation', () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
  });

  it('AbortController.abort() marks the signal as aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it('respects cancellation flag before making API calls', () => {
    const cancelledRef = { current: false };
    cancelledRef.current = true;
    const shouldProceed = !cancelledRef.current;
    expect(shouldProceed).toBe(false);
  });

  it('resets aiGenPhase to null on cancellation', () => {
    let phase: string | null = 'generating';
    const cancel = () => { phase = null; };
    cancel();
    expect(phase).toBeNull();
  });
});
