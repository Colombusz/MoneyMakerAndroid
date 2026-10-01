/**
 * Centralized Design System Tokens for MoneyMakerAndroid
 * Visual language: modern SaaS aesthetic with strong rounded geometry,
 * dark charcoal surfaces, pale muted background colors, selective bright accent colors.
 */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  '2xl': 32,
  xxxl: 48,
  '3xl': 48,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;
  transfer: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  tabBar: string;
  tabBarBorder: string;
  accent: string;
  success: string;
  warning: string;
}

/* ========== DARK PALETTE ========== */
export const darkColors: ThemeColors = {
  background: '#232323',
  surface: '#2D2D2D',
  card: '#30302F',
  border: 'rgba(255,255,255,0.08)',
  primary: '#7477FF',
  primaryLight: '#BCF3FF',
  primaryDark: '#5B64D0',
  income: '#9FD5B3',
  incomeLight: '#14532D',
  expense: '#F45E4F',
  expenseLight: '#FF8A78',
  transfer: '#7477FF',
  text: '#F7F7F2',
  textSecondary: '#C5D4CA',
  textMuted: '#979A98',
  tabBar: '#232323',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  accent: '#7477FF',
  success: '#9FD5B3',
  warning: '#F0D35A',
};

/* ========== LIGHT PALETTE ========== */
export const lightColors: ThemeColors = {
  background: '#F7F7F2',
  surface: '#DDE8E0',
  card: '#C5D4CA',
  border: 'rgba(35,35,35,0.08)',
  primary: '#7477FF',
  primaryLight: '#BCF3FF',
  primaryDark: '#5B64D0',
  income: '#166534',      // Dark green (was #9FD5B3 - too light)
  incomeLight: '#D4E8D',  // Kept as light accent for backgrounds
  expense: '#F45E4F',
  expenseLight: '#FF8A78',
  transfer: '#7477FF',
  text: '#232323',
  textSecondary: '#383838',
  textMuted: '#979A98',
  tabBar: '#F7F7F2',
  tabBarBorder: 'rgba(35,35,35,0.08)',
  accent: '#7477FF',
  success: '#166534',     // Dark green (was #9FD5B3 - too light)
  warning: '#F0D35A',
};
