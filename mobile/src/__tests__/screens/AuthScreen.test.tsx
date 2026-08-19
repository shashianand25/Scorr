/**
 * Smoke tests for AuthScreen.
 */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../../styles/shared', () => ({ styles: {} }));

describe('AuthScreen', () => {
  it('module loads without errors', () => {
    expect(() => require('../../screens/AuthScreen')).not.toThrow();
  });

  it('exports an AuthScreen component', () => {
    const mod = require('../../screens/AuthScreen');
    expect(typeof mod.AuthScreen).toBe('function');
  });
});
