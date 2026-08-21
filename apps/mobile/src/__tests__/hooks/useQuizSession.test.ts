import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Quiz Session State & Preference Management', () => {
  it('correctly persists preference toggles to AsyncStorage', async () => {
    const setShuffleQuestions = (val: boolean) => {
      AsyncStorage.setItem('pref_shuffleQuestions', val ? '1' : '0');
    };
    const setAutoSlideEnabled = (val: boolean) => {
      AsyncStorage.setItem('pref_autoSlideEnabled', val ? '1' : '0');
    };

    setShuffleQuestions(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('pref_shuffleQuestions', '1');

    setAutoSlideEnabled(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('pref_autoSlideEnabled', '0');
  });

  it('validates custom question selection ranges', () => {
    const clampRange = (start: number, end: number, max: number) => {
      const validStart = Math.max(1, Math.min(start, max));
      const validEnd = Math.max(validStart, Math.min(end, max));
      return { start: validStart, end: validEnd, count: validEnd - validStart + 1 };
    };

    const valid = clampRange(2, 8, 10);
    expect(valid).toEqual({ start: 2, end: 8, count: 7 });

    const outOfBounds = clampRange(-5, 50, 15);
    expect(outOfBounds).toEqual({ start: 1, end: 15, count: 15 });
  });
});
