/**
 * Tests for MainContentScreen router — tab delegation.
 */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../../styles/shared', () => ({ styles: {} }));

describe('MainContentScreen', () => {
  it('module loads without errors', () => {
    expect(() => require('../../screens/MainContentScreen')).not.toThrow();
  });

  it('exports a MainContentScreen component', () => {
    const mod = require('../../screens/MainContentScreen');
    expect(typeof mod.MainContentScreen).toBe('function');
  });
});
