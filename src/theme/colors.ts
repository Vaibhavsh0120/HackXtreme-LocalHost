/**
 * App color palette - Inspired by modern AI/tech aesthetics
 * Matching the Flutter app's beautiful theme
 */
export const DarkAppColors = {
  // Pure black and dark grays
  primaryDark: '#000000',
  primaryMid: '#0A0A0A',
  surfaceCard: '#111111',
  surfaceElevated: '#1A1A1A',

  // Accent colors - Re-purposed to monochrome/classic aesthetic
  accentCyan: '#FFFFFF', // Pure white
  accentViolet: '#D4D4D4', // Light silver
  accentPink: '#A3A3A3', // Mid gray
  accentGreen: '#E5E5E5', // Off-white
  accentOrange: '#737373', // Dark gray

  // Button Gradients
  btnActiveStart: '#333333',
  btnActiveEnd: '#111111',
  btnInactiveStart: '#525252',
  btnInactiveEnd: '#2A2A2A',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#525252',

  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const LightAppColors = {
  primaryDark: '#F5F5F5',
  primaryMid: '#E5E5E5',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  accentCyan: '#111111',
  accentViolet: '#404040',
  accentPink: '#525252',
  accentGreen: '#171717',
  accentOrange: '#737373',
  btnActiveStart: '#111111',
  btnActiveEnd: '#3F3F46',
  btnInactiveStart: '#A3A3A3',
  btnInactiveEnd: '#737373',
  textPrimary: '#0A0A0A',
  textSecondary: '#525252',
  textMuted: '#737373',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
} as const;

export const AppColors = DarkAppColors;

export type AppColorsType = {
  [K in keyof typeof DarkAppColors]: string;
};
