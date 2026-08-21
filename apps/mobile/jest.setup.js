global.__DEV__ = true;

jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'ios',
      select: (objs) => objs.ios ?? objs.default,
      isTesting: true,
    },
    Animated: {
      Value: class MockAnimatedValue {
        val = 0;
        constructor(v = 0) { this.val = v; }
        setValue(v) { this.val = v; }
        interpolate() { return this; }
      },
      ValueXY: class MockAnimatedValueXY {
        x = { setValue: () => {} };
        y = { setValue: () => {} };
        setValue() {}
        getTranslateTransform() { return []; }
      },
      timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
      spring: () => ({ start: (cb) => cb && cb({ finished: true }) }),
      parallel: () => ({ start: (cb) => cb && cb({ finished: true }) }),
      sequence: () => ({ start: (cb) => cb && cb({ finished: true }) }),
      event: () => jest.fn(),
    },
    Easing: {
      out: () => () => 0,
      ease: () => 0,
    },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
  };
});

jest.mock('expo-crypto', () => {
  const crypto = require('crypto');
  return {
    CryptoDigestAlgorithm: {
      SHA256: 'SHA-256',
    },
    digestStringAsync: async (_algo, str) => {
      return crypto.createHash('sha256').update(str).digest('hex');
    },
  };
});
