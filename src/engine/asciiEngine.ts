import {
  CHARSETS,
  type AsciiFrame,
  type ColorPalette,
  type StudioSettings,
} from '../types/studio';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function getPaletteColors(mode: ColorPalette): { bg: string; ink: string } {
  switch (mode) {
    case 'green':
      return { bg: '#060a07', ink: '#c2ff62' };
    case 'amber':
      return { bg: '#0b0804', ink: '#ffb53d' };
    case 'cyan':
      return { bg: '#050b12', ink: '#38bdf8' };
    case 'duotone':
      return { bg: '#090612', ink: '#c2ff62' };
    case 'paper':
      return { bg: '#f3f0e6', ink: '#181920' };
    case 'color':
      return { bg: '#08090d', ink: '#e5e7ef' };
    case 'mono':
    default:
      return { bg: '#08090d', ink: '#e5e7ef' };
  }
}

function getEffectiveRamp(settings: StudioSettings): string {
  if (settings.charset === 'custom') {
    const raw = settings.customCharset;
    return raw.length >= 2 ? raw : ' .:-=+*#%@';
  }
  return CHARSETS[settings.charset] || CHARSETS.classic;
}

function applyTone(lum: number, contrastFactor: number, brightnessOffset: number, invert: boolean): number {
  let v = lum + brightnessOffset;
  v = (v - 0.5) * contrastFactor + 0.5;
  v = clamp(v, 0, 1);
  return invert ? 1 - v : v;
}

function interpolateDuotone(lum: number): [number, number, number] {
  // Deep violet (#6d28d9) -> Electric cyan (#22d3ee) -> Acid lime (#c2ff62)
  if (lum < 0.5) {
    const t = lum * 2;
    return [
      Math.round(109 + (34 - 109) * t),
      Math.round(40 + (211 - 40) * t),
      Math.round(217 + (238 - 217) * t),
    ];
  }
  const t = (lum - 0.5) * 2;
  return [
    Math.round(34 + (194 - 34) * t),
    Math.round(211 + (255 - 211) * t),
    Math.round(238 + (98 - 238) * t),
  ];
}

export function processSourceToAscii(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  settings: StudioSettings,
  workCanvas: HTMLCanvasElement
): AsciiFrame {
  const cols = clamp(Math.round(settings.density), 20, 240);
  const ratio = srcHeight / Math.max(1, srcWidth);
  const aspect = clamp(settings.cellAspect, 0.35, 0.9);
  const rows = Math.max(1, Math.round(cols * ratio * aspect));

  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })!;
  const contrastFactor = settings.contrast / 100;
  const brightnessOffset = settings.brightness / 100;
  const { bg, ink } = getPaletteColors(settings.colorMode);

  // Braille uses 2x4 sub-pixel sampling per character cell!
  if (settings.engine === 'braille') {
    const subW = cols * 2;
    const subH = rows * 4;
    workCanvas.width = subW;
    workCanvas.height = subH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, subW, subH);
    ctx.drawImage(source, 0, 0, subW, subH);

    const pixels = ctx.getImageData(0, 0, subW, subH).data;
    const lumGrid = new Float32Array(subW * subH);

    for (let i = 0; i < subW * subH; i++) {
      const p = i * 4;
      const rawLum = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
      lumGrid[i] = applyTone(rawLum, contrastFactor, brightnessOffset, settings.invert);
    }

    if (settings.dither) {
      for (let y = 0; y < subH; y++) {
        for (let x = 0; x < subW; x++) {
          const idx = y * subW + x;
          const oldVal = lumGrid[idx];
          const newVal = oldVal >= 0.5 ? 1 : 0;
          lumGrid[idx] = newVal;
          const err = oldVal - newVal;
          if (x + 1 < subW) lumGrid[idx + 1] += err * (7 / 16);
          if (y + 1 < subH) {
            if (x > 0) lumGrid[(y + 1) * subW + x - 1] += err * (3 / 16);
            lumGrid[(y + 1) * subW + x] += err * (5 / 16);
            if (x + 1 < subW) lumGrid[(y + 1) * subW + x + 1] += err * (1 / 16);
          }
        }
      }
    }

    const lines: string[] = [];
    const colors = new Uint8ClampedArray(cols * rows * 3);
    const dotMap = [
      [0, 0, 0x01],
      [0, 1, 0x02],
      [0, 2, 0x04],
      [0, 3, 0x40],
      [1, 0, 0x08],
      [1, 1, 0x10],
      [1, 2, 0x20],
      [1, 3, 0x80],
    ] as const;

    for (let cy = 0; cy < rows; cy++) {
      let line = '';
      for (let cx = 0; cx < cols; cx++) {
        let mask = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let lumSum = 0;
        for (let d = 0; d < 8; d++) {
          const [dx, dy, bit] = dotMap[d];
          const sx = cx * 2 + dx;
          const sy = cy * 4 + dy;
          const sIdx = sy * subW + sx;
          const val = lumGrid[sIdx];
          lumSum += val;
          if (val >= 0.5) mask |= bit;
          const p = sIdx * 4;
          rSum += pixels[p];
          gSum += pixels[p + 1];
          bSum += pixels[p + 2];
        }
        line += mask === 0 ? ' ' : String.fromCharCode(0x2800 + mask);
        const cIdx = (cy * cols + cx) * 3;
        if (settings.colorMode === 'duotone') {
          const [dr, dg, db] = interpolateDuotone(clamp(lumSum / 8, 0, 1));
          colors[cIdx] = dr;
          colors[cIdx + 1] = dg;
          colors[cIdx + 2] = db;
        } else {
          colors[cIdx] = rSum >> 3;
          colors[cIdx + 1] = gSum >> 3;
          colors[cIdx + 2] = bSum >> 3;
        }
      }
      lines.push(line);
    }

    return {
      lines,
      text: lines.join('\n'),
      colors,
      cols,
      rows,
      bgColor: bg,
      inkColor: ink,
    };
  }

  // Standard ASCII & Edge Detection modes
  workCanvas.width = cols;
  workCanvas.height = rows;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);
  ctx.drawImage(source, 0, 0, cols, rows);

  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const lumGrid = new Float32Array(cols * rows);
  const colors = new Uint8ClampedArray(cols * rows * 3);

  for (let i = 0; i < cols * rows; i++) {
    const p = i * 4;
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const rawLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const adjLum = applyTone(rawLum, contrastFactor, brightnessOffset, settings.invert);
    lumGrid[i] = adjLum;

    const cIdx = i * 3;
    if (settings.colorMode === 'duotone') {
      const [dr, dg, db] = interpolateDuotone(adjLum);
      colors[cIdx] = dr;
      colors[cIdx + 1] = dg;
      colors[cIdx + 2] = db;
    } else {
      colors[cIdx] = r;
      colors[cIdx + 1] = g;
      colors[cIdx + 2] = b;
    }
  }

  const lines: string[] = [];

  if (settings.engine === 'edge') {
    // 3x3 Sobel edge magnitude + directional strokes
    const getL = (x: number, y: number) =>
      lumGrid[clamp(y, 0, rows - 1) * cols + clamp(x, 0, cols - 1)];

    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const tl = getL(x - 1, y - 1);
        const t = getL(x, y - 1);
        const tr = getL(x + 1, y - 1);
        const l = getL(x - 1, y);
        const r = getL(x + 1, y);
        const bl = getL(x - 1, y + 1);
        const b = getL(x, y + 1);
        const br = getL(x + 1, y + 1);

        const gx = -tl - 2 * l - bl + tr + 2 * r + br;
        const gy = -tl - 2 * t - tr + bl + 2 * b + br;
        const mag = Math.sqrt(gx * gx + gy * gy);

        if (mag < 0.24) {
          const base = lumGrid[y * cols + x];
          line += base > 0.72 ? '.' : ' ';
        } else {
          // Angle in [0, pi)
          let angle = Math.atan2(gy, gx);
          if (angle < 0) angle += Math.PI;
          const deg = (angle * 180) / Math.PI;
          // Edge normal is perpendicular to tangent direction
          if (deg < 22.5 || deg >= 157.5) line += '|';
          else if (deg < 67.5) line += '/';
          else if (deg < 112.5) line += '-';
          else line += '\\';
        }
      }
      lines.push(line);
    }

    return {
      lines,
      text: lines.join('\n'),
      colors,
      cols,
      rows,
      bgColor: bg,
      inkColor: ink,
    };
  }

  // Classic / Custom ASCII ramp with optional Floyd-Steinberg dithering
  const ramp = getEffectiveRamp(settings);
  const maxIdx = ramp.length - 1;

  if (settings.dither) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const oldVal = clamp(lumGrid[idx], 0, 1);
        const qIdx = Math.round(oldVal * maxIdx);
        const newVal = qIdx / maxIdx;
        lumGrid[idx] = newVal;
        const err = oldVal - newVal;
        if (x + 1 < cols) lumGrid[idx + 1] += err * (7 / 16);
        if (y + 1 < rows) {
          if (x > 0) lumGrid[(y + 1) * cols + x - 1] += err * (3 / 16);
          lumGrid[(y + 1) * cols + x] += err * (5 / 16);
          if (x + 1 < cols) lumGrid[(y + 1) * cols + x + 1] += err * (1 / 16);
        }
      }
    }
  }

  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const lum = clamp(lumGrid[y * cols + x], 0, 1);
      const charIdx = Math.round(lum * maxIdx);
      line += ramp[charIdx];
    }
    lines.push(line);
  }

  return {
    lines,
    text: lines.join('\n'),
    colors,
    cols,
    rows,
    bgColor: bg,
    inkColor: ink,
  };
}

export function renderFrameToCanvas(
  frame: AsciiFrame,
  canvas: HTMLCanvasElement,
  settings: StudioSettings,
  options: {
    fontSize: number;
    padding?: number;
    dpr?: number;
    shimmerPhase?: number;
  }
): { width: number; height: number; contentRect: { x: number; y: number; w: number; h: number } } {
  const dpr = options.dpr ?? 1;
  const padding = options.padding ?? 0;
  const fontSize = options.fontSize;
  const cellW = fontSize * 0.6;
  const cellH = cellW / clamp(settings.cellAspect, 0.35, 0.9);

  const contentW = Math.ceil(frame.cols * cellW);
  const contentH = Math.ceil(frame.rows * cellH);
  const totalW = contentW + padding * 2;
  const totalH = contentH + padding * 2;

  if (canvas.width !== Math.round(totalW * dpr) || canvas.height !== Math.round(totalH * dpr)) {
    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
  }

  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background fill
  ctx.fillStyle = frame.bgColor;
  ctx.fillRect(0, 0, totalW, totalH);

  ctx.font = `500 ${fontSize}px "DM Mono", "Courier New", monospace`;
  ctx.textBaseline = 'top';

  const useColorArray = settings.colorMode === 'color' || settings.colorMode === 'duotone';
  const useGlow = settings.glow && settings.colorMode !== 'paper';
  const phase = options.shimmerPhase ?? 0;
  const shimmerOn = settings.matrixShimmer && phase > 0;

  if (!useColorArray) {
    ctx.fillStyle = frame.inkColor;
    if (useGlow) {
      ctx.shadowColor = frame.inkColor;
      ctx.shadowBlur = fontSize * 0.45;
    }
  }

  for (let y = 0; y < frame.rows; y++) {
    const line = frame.lines[y];
    const py = padding + y * cellH;
    for (let x = 0; x < frame.cols; x++) {
      const ch = line[x];
      if (ch === ' ') continue;
      const px = padding + x * cellW;

      if (useColorArray) {
        const cIdx = (y * frame.cols + x) * 3;
        const r = frame.colors[cIdx];
        const g = frame.colors[cIdx + 1];
        const b = frame.colors[cIdx + 2];
        const fill = `rgb(${r},${g},${b})`;
        ctx.fillStyle = fill;
        if (useGlow) {
          ctx.shadowColor = fill;
          ctx.shadowBlur = fontSize * 0.35;
        }
      }

      if (shimmerOn) {
        const wave = Math.sin(x * 0.35 + phase * 3.2 - y * 0.12);
        ctx.globalAlpha = wave > 0.7 ? 1 : 0.72 + wave * 0.18;
      }

      ctx.fillText(ch, px, py);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Optional CRT scanline overlay
  if (settings.scanlines) {
    ctx.fillStyle =
      settings.colorMode === 'paper' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.28)';
    for (let sy = padding; sy < totalH - padding; sy += 3) {
      ctx.fillRect(padding, sy, contentW, 1);
    }
  }

  ctx.restore();

  return {
    width: totalW,
    height: totalH,
    contentRect: { x: padding, y: padding, w: contentW, h: contentH },
  };
}

export function buildSvgExport(frame: AsciiFrame, settings: StudioSettings): string {
  const fontSize = 14;
  const cellW = fontSize * 0.6;
  const cellH = cellW / clamp(settings.cellAspect, 0.35, 0.9);
  const pad = 28;
  const w = Math.ceil(frame.cols * cellW + pad * 2);
  const h = Math.ceil(frame.rows * cellH + pad * 2);
  const useColorArray = settings.colorMode === 'color' || settings.colorMode === 'duotone';

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rowsMarkup: string[] = [];
  for (let y = 0; y < frame.rows; y++) {
    const line = frame.lines[y];
    const py = (pad + y * cellH + fontSize * 0.85).toFixed(1);
    if (!useColorArray) {
      rowsMarkup.push(
        `<text x="${pad}" y="${py}" fill="${frame.inkColor}" xml:space="preserve">${esc(line)}</text>`
      );
    } else {
      let tspans = '';
      for (let x = 0; x < frame.cols; x++) {
        const ch = line[x];
        if (ch === ' ') {
          tspans += ' ';
          continue;
        }
        const cIdx = (y * frame.cols + x) * 3;
        const fill = `rgb(${frame.colors[cIdx]},${frame.colors[cIdx + 1]},${frame.colors[cIdx + 2]})`;
        tspans += `<tspan fill="${fill}">${esc(ch)}</tspan>`;
      }
      rowsMarkup.push(`<text x="${pad}" y="${py}" xml:space="preserve">${tspans}</text>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="${frame.bgColor}" />
  <g font-family="DM Mono, Courier New, monospace" font-size="${fontSize}px" font-weight="500">
    ${rowsMarkup.join('\n    ')}
  </g>
</svg>`;
}

export function buildHtmlExport(frame: AsciiFrame, settings: StudioSettings): string {
  const useColorArray = settings.colorMode === 'color' || settings.colorMode === 'duotone';
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let bodyInner = '';
  if (!useColorArray) {
    bodyInner = esc(frame.text);
  } else {
    const rows: string[] = [];
    for (let y = 0; y < frame.rows; y++) {
      const line = frame.lines[y];
      let rowStr = '';
      for (let x = 0; x < frame.cols; x++) {
        const ch = line[x];
        if (ch === ' ') {
          rowStr += ' ';
        } else {
          const cIdx = (y * frame.cols + x) * 3;
          rowStr += `<span style="color:rgb(${frame.colors[cIdx]},${frame.colors[cIdx + 1]},${frame.colors[cIdx + 2]})">${esc(ch)}</span>`;
        }
      }
      rows.push(rowStr);
    }
    bodyInner = rows.join('\n');
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Enzo Studio Export</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: ${frame.bgColor};
    color: ${frame.inkColor};
    padding: 32px;
  }
  pre {
    margin: 0;
    font: 500 9px/1.08 "DM Mono", "Courier New", monospace;
    white-space: pre;
    ${settings.glow && settings.colorMode !== 'paper' ? 'text-shadow: 0 0 6px currentColor;' : ''}
  }
</style>
</head>
<body>
<pre>${bodyInner}</pre>
</body>
</html>`;
}
