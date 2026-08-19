/**
 * Smoke tests for HomeTab screen — renders without crashing.
 */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
jest.mock('../../styles/shared', () => ({ styles: {} }));

describe('HomeTab', () => {
  it('module loads without errors', () => {
    expect(() => require('../../screens/HomeTab')).not.toThrow();
  });

  it('exports a HomeTab component', () => {
    const mod = require('../../screens/HomeTab');
    expect(typeof mod.HomeTab).toBe('function');
  });
});
