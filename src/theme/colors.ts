/**
 * App color palette - Inspired by modern AI/tech aesthetics
 * Matching the Flutter app's beautiful theme
 */
export const AppColors = {
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

export type AppColorsType = typeof AppColors;
