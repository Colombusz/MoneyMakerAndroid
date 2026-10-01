import { describe, it, expect } from 'vitest';
import { formatCentavos, parseToCentavos, centavosToDisplayDecimal } from '../currency';

describe('currency utils (Android)', () => {
  describe('formatCentavos', () => {
    it('formats 0 centavos as default PHP', () => {
      expect(formatCentavos(0)).toBe('₱0.00');
    });

    it('formats positive centavos with grouping', () => {
      expect(formatCentavos(125050)).toBe('₱1,250.50');
    });

    it('formats negative centavos with prefix', () => {
      expect(formatCentavos(-50000)).toBe('-₱500.00');
    });

    it('formats with custom currency code', () => {
      expect(formatCentavos(10000, 'USD')).toBe('USD 100.00');
    });
  });

  describe('parseToCentavos', () => {
    it('parses numeric input', () => {
      expect(parseToCentavos(12.5)).toBe(1250);
    });

    it('parses string input with commas and symbols', () => {
      expect(parseToCentavos('₱1,250.50')).toBe(125050);
    });

    it('handles whole number string', () => {
      expect(parseToCentavos('500')).toBe(50000);
    });

    it('handles empty or invalid string', () => {
      expect(parseToCentavos('')).toBe(0);
      expect(parseToCentavos('abc')).toBe(0);
    });
  });

  describe('centavosToDisplayDecimal', () => {
    it('converts centavos to two-decimal string', () => {
      expect(centavosToDisplayDecimal(125050)).toBe('1250.50');
      expect(centavosToDisplayDecimal(50)).toBe('0.50');
    });
  });
});
