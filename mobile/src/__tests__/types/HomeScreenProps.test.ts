import type { HomeScreenProps } from '../../types/HomeScreenProps';

describe('HomeScreenProps interface', () => {
  it('accepts nullable fields as null', () => {
    const partial: Partial<HomeScreenProps> = {
      firebaseUser: null, activeSession: null, appConfig: null, battlePopup: null,
    };
    Object.values(partial).forEach(v => expect(v).toBeNull());
  });

  it('accepts correct field types', () => {
    const partial: Partial<HomeScreenProps> = {
      activeTab: 'home', settingsDarkMode: false, quizzes: [], isConnected: true,
    };
    expect(typeof partial.activeTab).toBe('string');
    expect(typeof partial.settingsDarkMode).toBe('boolean');
    expect(Array.isArray(partial.quizzes)).toBe(true);
  });

  it('accepts handler functions', () => {
    const noop = () => {};
    const partial: Partial<HomeScreenProps> = {
      handleFinishSession: noop, handleCancelAiGeneration: noop, triggerConfettiBurst: noop,
    };
    Object.values(partial).forEach(fn => expect(typeof fn).toBe('function'));
  });
});
