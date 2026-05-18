/**
 * Dynamic Material You Theme System
 * Extracts wallpaper accent colors on Android 12+ and maps them to a full MD3 dark theme.
 * Falls back to a curated purple palette on unsupported devices.
 */

import { MD3DarkTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// ─── Try to load Material You (may fail on some devices/emulators) ───
let MaterialYouModule: any = null;
try {
  // Temporarily suppress console.error during import — the module logs a
  // noisy "not linked" error because we disabled its native autolinking
  // (incompatible with RN 0.85 New Architecture).
  const origError = console.error;
  console.error = () => {};
  MaterialYouModule = require('react-native-material-you-colors').default;
  console.error = origError;
} catch (e) {
  // Module not available — fallback palette will be used
}

// ─── Fallback Palette (Deep Purple) ───
const FALLBACK_PALETTE = {
  system_accent1: ['#FFFFFF', '#FEFBFF', '#F3EEFF', '#E8DEFF', '#D0BCFF', '#B69DF8', '#9A82DB', '#7F67BE', '#6750A4', '#4F378B', '#381E72', '#21005D', '#000000'],
  system_accent2: ['#FFFFFF', '#FFFBFF', '#F5EEFA', '#E8DEF8', '#CCC2DC', '#B0A7C0', '#958DA5', '#7A7289', '#625B71', '#4A4458', '#332D41', '#1D192B', '#000000'],
  system_accent3: ['#FFFFFF', '#FFFBFF', '#FFECF1', '#FFD8E4', '#EFB8C8', '#D29DAC', '#B58392', '#986977', '#7D5260', '#633B48', '#492532', '#31111D', '#000000'],
  system_neutral1: ['#FFFFFF', '#FFFBFF', '#F4EFF4', '#E6E0E9', '#CAC4D0', '#AEA9B4', '#938F99', '#79747E', '#605D66', '#49454F', '#322F38', '#1C1B1F', '#0F0D13'],
  system_neutral2: ['#FFFFFF', '#FFFBFF', '#F5EFF7', '#E7E0EC', '#C9C5D0', '#AEA9B4', '#938F99', '#79757F', '#605D66', '#49454F', '#332F38', '#1D1A22', '#000000'],
};

// ─── Get Dynamic Palette ───
function getSystemPalette() {
  try {
    if (MaterialYouModule && MaterialYouModule.isSupported) {
      return MaterialYouModule.getMaterialYouPalette('#7C4DFF');
    }
    if (MaterialYouModule) {
      return MaterialYouModule.generatePaletteFromColor('#7C4DFF');
    }
  } catch (e) {
    console.warn('Failed to get Material You palette:', e);
  }
  return FALLBACK_PALETTE;
}

// ─── Color Blending Utility (for elevation tints) ───
function blendColors(base: string, tint: string, opacity: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  try {
    const b = parseHex(base);
    const t = parseHex(tint);
    const r = Math.round(b.r + (t.r - b.r) * opacity);
    const g = Math.round(b.g + (t.g - b.g) * opacity);
    const bl = Math.round(b.b + (t.b - b.b) * opacity);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  } catch {
    return base;
  }
}

// ─── Build MD3 Dark Theme from Palette ───
export function buildDynamicTheme() {
  const palette = getSystemPalette();

  const a1 = palette.system_accent1;
  const a2 = palette.system_accent2;
  const a3 = palette.system_accent3;
  const n1 = palette.system_neutral1;
  const n2 = palette.system_neutral2;

  const bg = n1[12] || '#0F0D13';

  const colors = {
    primary: a1[4],
    onPrimary: a1[10],
    primaryContainer: a1[9],
    onPrimaryContainer: a1[3],

    secondary: a2[4],
    onSecondary: a2[10],
    secondaryContainer: a2[9],
    onSecondaryContainer: a2[3],

    tertiary: a3[4],
    onTertiary: a3[10],
    tertiaryContainer: a3[9],
    onTertiaryContainer: a3[3],

    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',

    background: bg,
    onBackground: n1[3],

    surface: bg,
    onSurface: n1[3],

    surfaceVariant: n2[9],
    onSurfaceVariant: n2[4],

    surfaceDisabled: `${n1[3]}1F`,
    onSurfaceDisabled: `${n1[3]}61`,

    outline: n2[6],
    outlineVariant: n2[9],

    inverseSurface: n1[3],
    inverseOnSurface: n1[10],
    inversePrimary: a1[8],

    elevation: {
      level0: 'transparent',
      level1: blendColors(bg, a1[4], 0.05),
      level2: blendColors(bg, a1[4], 0.08),
      level3: blendColors(bg, a1[4], 0.11),
      level4: blendColors(bg, a1[4], 0.12),
      level5: blendColors(bg, a1[4], 0.14),
    },

    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  };

  const paperTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      ...colors,
    },
    roundness: 4,
  };

  // Build navigation theme manually (avoids adaptNavigationTheme import issues)
  const navTheme = {
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.elevation.level2,
      text: colors.onSurface,
      border: colors.outlineVariant,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  return { paperTheme, navTheme };
}

// ─── Design Tokens ───
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
  xl: 28,
  full: 9999,
};
