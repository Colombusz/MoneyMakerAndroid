/**
 * Utility functions for centavos <-> currency conversions and formatting.
 * Strictly operates on integer minor units (centavos).
 */

export const formatCentavos = (centavos: number = 0, currency: string = 'PHP'): string => {
  const isNegative = centavos < 0;
  const absCentavos = Math.abs(centavos);
  const units = Math.floor(absCentavos / 100);
  const decimals = (absCentavos % 100).toString().padStart(2, '0');

  const formattedUnits = units.toLocaleString('en-US');
  const symbol = currency === 'PHP' ? '₱' : `${currency} `;
  const prefix = isNegative ? '-' : '';

  return `${prefix}${symbol}${formattedUnits}.${decimals}`;
};

export const parseToCentavos = (input: string | number): number => {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;

  const parts = cleaned.split('.');
  const units = parseInt(parts[0] || '0', 10);
  let decimals = 0;
  if (parts.length > 1) {
    const decStr = (parts[1] + '00').slice(0, 2);
    decimals = parseInt(decStr, 10);
  }

  return units * 100 + decimals;
};

export const centavosToDisplayDecimal = (centavos: number): string => {
  return (centavos / 100).toFixed(2);
};
