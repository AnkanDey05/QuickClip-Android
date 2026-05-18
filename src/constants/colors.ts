/**
 * Design tokens — spacing, shadows, and layout constants.
 * Color values come from the dynamic theme system (theme.ts).
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,    // M3 large components (cards, dialogs, bottom sheets)
  full: 9999, // Pills, FABs, search bars
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3.84,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6.0,
    elevation: 6,
  },
};

// Platform brand colors for the grid cards
export const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  youtube: { bg: '#FF0000', text: '#FFFFFF' },
  instagram: { bg: '#E1306C', text: '#FFFFFF' },
  facebook: { bg: '#1877F2', text: '#FFFFFF' },
  tiktok: { bg: '#010101', text: '#FFFFFF' },
  twitter: { bg: '#000000', text: '#FFFFFF' },
  reddit: { bg: '#FF4500', text: '#FFFFFF' },
  pinterest: { bg: '#E60023', text: '#FFFFFF' },
  snapchat: { bg: '#FFFC00', text: '#000000' },
  vimeo: { bg: '#1AB7EA', text: '#FFFFFF' },
  soundcloud: { bg: '#FF5500', text: '#FFFFFF' },
};
