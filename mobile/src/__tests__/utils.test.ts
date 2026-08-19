/**
 * Unit tests for pure utility functions.
 */
import { getUserFirstName, getUserFullName, getUserInitial } from '../utils/user';

describe('getUserFirstName', () => {
  it('returns first word of displayName', () => {
    expect(getUserFirstName({ displayName: 'Shashi Anand', email: null })).toBe('Shashi');
  });
  it('falls back to email prefix', () => {
    expect(getUserFirstName({ displayName: null, email: 'shashi@test.com' })).toBe('shashi');
  });
  it('returns empty string when both null', () => {
    expect(getUserFirstName({ displayName: null, email: null })).toBe('');
  });
});

describe('getUserInitial', () => {
  it('returns first character uppercased', () => {
    expect(getUserInitial({ displayName: 'shashi', email: null })).toBe('S');
  });
});

describe('getUserFullName', () => {
  it('returns full displayName', () => {
    expect(getUserFullName({ displayName: 'Shashi Anand', email: null })).toBe('Shashi Anand');
  });
});
