export type Language = 'en' | 'fa';

export type RenderEngine = 'ascii' | 'braille' | 'edge';

export type CharsetId =
  | 'classic'
  | 'detailed'
  | 'blocks'
  | 'binary'
  | 'soft'
  | 'letters'
  | 'katakana'
  | 'custom';

export type ColorPalette =
  | 'mono'
  | 'color'
  | 'green'
  | 'amber'
  | 'cyan'
  | 'duotone'
  | 'paper';

export type MediaSourceType = 'sample' | 'image' | 'video' | 'webcam';

export interface StudioSettings {
  engine: RenderEngine;
  density: number; // 30..220 columns
  charset: CharsetId;
  customCharset: string;
  colorMode: ColorPalette;
  contrast: number; // 50..220 (represents 0.50x..2.20x)
  brightness: number; // -50..50
  dither: boolean;
  invert: boolean;
  glow: boolean;
  scanlines: boolean;
  matrixShimmer: boolean;
  cellAspect: number; // 0.45..0.75
}

export interface StudioPreset {
  id: string;
  settings: Partial<StudioSettings>;
}

export interface AsciiFrame {
  lines: string[];
  text: string;
  colors: Uint8ClampedArray; // RGB triplets: length = cols * rows * 3
  cols: number;
  rows: number;
  bgColor: string;
  inkColor: string;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  engine: 'ascii',
  density: 115,
  charset: 'classic',
  customCharset: ' .:-=+*#%@',
  colorMode: 'mono',
  contrast: 118,
  brightness: 0,
  dither: false,
  invert: false,
  glow: true,
  scanlines: false,
  matrixShimmer: false,
  cellAspect: 0.56,
};

export const CHARSETS: Record<Exclude<CharsetId, 'custom'>, string> = {
  classic: ' .:-=+*#%@',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks: ' ░▒▓█',
  binary: ' 01',
  soft: ' .oO@',
  letters: ' ASCIIART',
  katakana: ' ･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ',
};

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: 'terminal',
    settings: {
      engine: 'ascii',
      charset: 'classic',
      colorMode: 'green',
      contrast: 125,
      brightness: 5,
      dither: false,
      invert: false,
      glow: true,
      scanlines: true,
    },
  },
  {
    id: 'braille',
    settings: {
      engine: 'braille',
      density: 110,
      colorMode: 'mono',
      contrast: 130,
      brightness: 0,
      dither: true,
      invert: false,
      glow: false,
      scanlines: false,
    },
  },
  {
    id: 'blueprint',
    settings: {
      engine: 'edge',
      density: 130,
      colorMode: 'cyan',
      contrast: 145,
      brightness: 0,
      dither: false,
      invert: false,
      glow: true,
      scanlines: false,
    },
  },
  {
    id: 'halftone',
    settings: {
      engine: 'ascii',
      charset: 'blocks',
      density: 100,
      colorMode: 'amber',
      contrast: 115,
      brightness: 0,
      dither: true,
      invert: false,
      glow: true,
      scanlines: true,
    },
  },
  {
    id: 'chromatic',
    settings: {
      engine: 'ascii',
      charset: 'detailed',
      density: 135,
      colorMode: 'color',
      contrast: 120,
      brightness: 5,
      dither: false,
      invert: false,
      glow: true,
      scanlines: false,
    },
  },
  {
    id: 'editorial',
    settings: {
      engine: 'ascii',
      charset: 'soft',
      density: 115,
      colorMode: 'paper',
      contrast: 125,
      brightness: -5,
      dither: true,
      invert: true,
      glow: false,
      scanlines: false,
    },
  },
];
