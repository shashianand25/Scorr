/**
 * Smoke tests for OfflineModal.
 */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../../styles/shared', () => ({ styles: {} }));

describe('OfflineModal', () => {
  it('module loads without errors', () => {
    expect(() => require('../../components/modals/OfflineModal')).not.toThrow();
  });

  it('exports an OfflineModal component', () => {
    const mod = require('../../components/modals/OfflineModal');
    expect(typeof mod.OfflineModal).toBe('function');
  });
});
