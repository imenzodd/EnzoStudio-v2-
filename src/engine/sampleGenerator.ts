export type SampleId = 'monolith' | 'bust' | 'solaris' | 'nebula';

export function generateSampleImage(id: SampleId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 800;
  const h = 600;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (id === 'monolith') {
    // Brutalist architectural light study with crisp diagonal shadow & sphere
    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, '#0c111d');
    sky.addColorStop(0.55, '#1d283a');
    sky.addColorStop(1, '#090b10');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Subtle atmospheric sun halo
    const sun = ctx.createRadialGradient(580, 140, 10, 580, 140, 220);
    sun.addColorStop(0, '#ffffff');
    sun.addColorStop(0.2, '#d8f99a');
    sun.addColorStop(0.55, 'rgba(130, 180, 90, 0.25)');
    sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    // Architectural slab 1 (left tower)
    const g1 = ctx.createLinearGradient(120, 90, 340, 520);
    g1.addColorStop(0, '#eef2f6');
    g1.addColorStop(0.5, '#7e8899');
    g1.addColorStop(1, '#12151e');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(140, 540);
    ctx.lineTo(180, 110);
    ctx.lineTo(350, 150);
    ctx.lineTo(310, 540);
    ctx.closePath();
    ctx.fill();

    // Shadow face on slab
    ctx.fillStyle = '#0d1017';
    ctx.beginPath();
    ctx.moveTo(310, 540);
    ctx.lineTo(350, 150);
    ctx.lineTo(420, 190);
    ctx.lineTo(385, 540);
    ctx.closePath();
    ctx.fill();

    // Floating sphere in foreground
    const sphere = ctx.createRadialGradient(485, 310, 12, 515, 345, 130);
    sphere.addColorStop(0, '#ffffff');
    sphere.addColorStop(0.35, '#9eb1c7');
    sphere.addColorStop(0.75, '#252e3f');
    sphere.addColorStop(1, '#07090e');
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(515, 345, 120, 0, Math.PI * 2);
    ctx.fill();

    // Ground horizon reflection
    const floor = ctx.createLinearGradient(0, 480, 0, 600);
    floor.addColorStop(0, '#2a3242');
    floor.addColorStop(1, '#050609');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 480, w, 120);

    // Crisp horizon beam
    ctx.fillStyle = '#e5f9c2';
    ctx.fillRect(0, 478, w, 3);
  } else if (id === 'bust') {
    // High-contrast classical sculptural silhouette with dramatic rim lighting
    const bg = ctx.createRadialGradient(400, 280, 30, 400, 300, 420);
    bg.addColorStop(0, '#2c303f');
    bg.addColorStop(0.55, '#11141c');
    bg.addColorStop(1, '#06070a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Geometric halo ring
    ctx.strokeStyle = '#c2ff62';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(400, 260, 195, 0, Math.PI * 2);
    ctx.stroke();

    // Sculptural shoulders + neck + head with chiaroscuro shading
    const rim = ctx.createLinearGradient(250, 110, 540, 560);
    rim.addColorStop(0, '#ffffff');
    rim.addColorStop(0.35, '#b8c0cf');
    rim.addColorStop(0.72, '#353c4d');
    rim.addColorStop(1, '#0a0c12');

    ctx.fillStyle = rim;
    // Shoulders
    ctx.beginPath();
    ctx.moveTo(190, 590);
    ctx.quadraticCurveTo(225, 425, 345, 405);
    ctx.lineTo(455, 405);
    ctx.quadraticCurveTo(575, 425, 610, 590);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillRect(358, 325, 84, 95);

    // Head profile / oval
    ctx.beginPath();
    ctx.ellipse(400, 240, 92, 118, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chiaroscuro shadow mask on right half
    const shadow = ctx.createLinearGradient(360, 120, 520, 420);
    shadow.addColorStop(0, 'rgba(8, 10, 15, 0)');
    shadow.addColorStop(0.55, 'rgba(8, 10, 15, 0.72)');
    shadow.addColorStop(1, 'rgba(8, 10, 15, 0.94)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(400, 240, 92, 118, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle visor / light band across eyes
    const visor = ctx.createLinearGradient(310, 215, 490, 215);
    visor.addColorStop(0, '#ffffff');
    visor.addColorStop(0.5, '#c2ff62');
    visor.addColorStop(1, '#38bdf8');
    ctx.fillStyle = visor;
    ctx.fillRect(322, 210, 156, 16);
  } else if (id === 'solaris') {
    // Concentric interference wave field (ideal for Braille, Dithering & Classic ASCII)
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx1 = (x - w * 0.36) / 28;
        const dy1 = (y - h * 0.45) / 28;
        const dx2 = (x - w * 0.66) / 32;
        const dy2 = (y - h * 0.56) / 32;
        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const wave = (Math.sin(d1 * 1.45) + Math.cos(d2 * 1.3)) * 0.5;
        const norm = Math.max(0, Math.min(1, wave * 0.5 + 0.5));
        const idx = (y * w + x) * 4;
        data[idx] = Math.round(35 + norm * 215);
        data[idx + 1] = Math.round(50 + Math.pow(norm, 0.85) * 205);
        data[idx + 2] = Math.round(80 + (1 - norm) * 140);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else {
    // Nebula: glowing chromatic spiral galaxy
    ctx.fillStyle = '#05060b';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    for (let i = 0; i < 2400; i++) {
      const t = i / 2400;
      const arm = i % 3;
      const angle = t * Math.PI * 6.5 + (arm * Math.PI * 2) / 3;
      const radius = t * 280;
      const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const spread = (1 - t * 0.4) * 38 * (jitter - 0.5);
      const px = cx + Math.cos(angle) * radius + spread;
      const py = cy + Math.sin(angle) * (radius * 0.72) + spread * 0.7;
      const size = (1 - t) * 4.2 + 0.9;

      const r = Math.round(160 + (1 - t) * 95);
      const g = Math.round(90 + Math.sin(t * Math.PI) * 160);
      const b = Math.round(255 - t * 120);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.85 - t * 0.55})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const core = ctx.createRadialGradient(cx, cy, 4, cx, cy, 95);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.35, 'rgba(194, 255, 98, 0.75)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}
