import { describe, it, expect } from 'vitest';
import { validateRequired, validateEmail, validatePositiveAmount } from '../validation';

describe('validation utils (Android)', () => {
  describe('validateRequired', () => {
    it('returns error when value is empty or undefined', () => {
      expect(validateRequired('', 'Name')).toBe('Name is required');
      expect(validateRequired('   ', 'Name')).toBe('Name is required');
      expect(validateRequired(null, 'Name')).toBe('Name is required');
      expect(validateRequired(undefined, 'Name')).toBe('Name is required');
    });

    it('returns null when value is provided', () => {
      expect(validateRequired('Savings', 'Name')).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('validates email formats correctly', () => {
      expect(validateEmail('invalid-email')).toBe('Please enter a valid email address');
      expect(validateEmail('')).toBe('Please enter a valid email address');
      expect(validateEmail('test@example.com')).toBeNull();
    });
  });

  describe('validatePositiveAmount', () => {
    it('requires amount greater than zero', () => {
      expect(validatePositiveAmount(0, 'Target')).toBe('Target must be greater than zero');
      expect(validatePositiveAmount(-100, 'Target')).toBe('Target must be greater than zero');
      expect(validatePositiveAmount(100, 'Target')).toBeNull();
    });
  });
});
