import { getUserFirstName, getUserFullName, getUserInitial } from '../../utils/user';
import type { User } from '../../lib/firebase';

describe('User Utilities', () => {
  describe('getUserFirstName', () => {
    it('returns first word from displayName', () => {
      const user = { displayName: 'Shashi Anand', email: 'shashi@example.com' } as User;
      expect(getUserFirstName(user)).toBe('Shashi');
    });

    it('extracts and capitalizes simple email prefix when displayName is missing', () => {
      const user = { displayName: null, email: 'alex@example.com' } as unknown as User;
      expect(getUserFirstName(user)).toBe('Alex');
    });

    it('extracts name from dotted email prefix', () => {
      const user = { displayName: null, email: 'john.doe@company.org' } as unknown as User;
      expect(getUserFirstName(user)).toBe('John');
    });

    it('strips numbers and special characters from email prefix', () => {
      const user = { displayName: null, email: 'emma99_test@domain.com' } as unknown as User;
      expect(getUserFirstName(user)).toBe('Emma');
    });

    it('falls back to "User" when user object is null or has no identifiable name', () => {
      expect(getUserFirstName(null)).toBe('User');
      expect(getUserFirstName({ displayName: null, email: null } as unknown as User)).toBe('User');
    });
  });

  describe('getUserFullName', () => {
    it('returns full displayName directly', () => {
      const user = { displayName: 'Dr. Jane Smith', email: 'jane@med.org' } as User;
      expect(getUserFullName(user)).toBe('Dr. Jane Smith');
    });

    it('formats multi-part email addresses into capitalized words', () => {
      const user = { displayName: null, email: 'sarah.connor.1984@sky.net' } as unknown as User;
      expect(getUserFullName(user)).toBe('Sarah Connor');
    });

    it('falls back to "Scorr User" when user is null or empty', () => {
      expect(getUserFullName(null)).toBe('Scorr User');
      expect(getUserFullName({ displayName: null, email: null } as unknown as User)).toBe('Scorr User');
    });
  });

  describe('getUserInitial', () => {
    it('returns uppercase first initial of displayName', () => {
      const user = { displayName: 'alexander' } as unknown as User;
      expect(getUserInitial(user)).toBe('A');
    });

    it('returns uppercase first initial of derived email name', () => {
      const user = { displayName: null, email: 'benjamin@mail.com' } as unknown as User;
      expect(getUserInitial(user)).toBe('B');
    });

    it('returns "S" for default fallback "Scorr User"', () => {
      expect(getUserInitial(null)).toBe('S');
    });
  });
});
