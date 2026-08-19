/**
 * Smoke tests for AIGeneratingScreen component.
 */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('AIGeneratingScreen', () => {
  it('module loads without errors', () => {
    expect(() => require('../../components/AIGeneratingScreen')).not.toThrow();
  });

  it('exports AIGeneratingScreen and FullscreenBattleCountdown', () => {
    const mod = require('../../components/AIGeneratingScreen');
    expect(typeof mod.AIGeneratingScreen).toBe('function');
    expect(typeof mod.FullscreenBattleCountdown).toBe('function');
  });
});
