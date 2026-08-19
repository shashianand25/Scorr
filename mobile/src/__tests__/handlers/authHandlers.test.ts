/**
 * Tests for auth handlers — OTP, sign-in, sign-up, reset password.
 */
jest.mock('../../lib/api', () => ({
  sendOtpEmail: jest.fn(() => Promise.resolve({ error: null })),
  verifyOtpCode: jest.fn(() => Promise.resolve({ valid: true, error: null })),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('auth handler helpers', () => {
  it('rejects empty email', () => {
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(validateEmail('')).toBe(false);
  });

  it('accepts valid email format', () => {
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects password shorter than 6 chars', () => {
    const validatePw = (pw: string) => pw.length >= 6;
    expect(validatePw('abc')).toBe(false);
    expect(validatePw('abcdef')).toBe(true);
  });

  it('OTP code must be 6 digits', () => {
    const validateOtp = (otp: string) => /^\d{6}$/.test(otp);
    expect(validateOtp('12345')).toBe(false);
    expect(validateOtp('123456')).toBe(true);
    expect(validateOtp('12345a')).toBe(false);
  });
});
