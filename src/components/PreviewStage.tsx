import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Columns2,
  Copy,
  Download,
  FileCode2,
  FileText,
  Image as ImageIcon,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { TranslationKey } from '../i18n/translations';
import { renderFrameToCanvas } from '../engine/asciiEngine';
import type { AsciiFrame, MediaSourceType, StudioSettings } from '../types/studio';

interface PreviewStageProps {
  frame: AsciiFrame | null;
  settings: StudioSettings;
  mediaType: MediaSourceType | null;
  isPlaying: boolean;
  originalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  t: (key: TranslationKey) => string;
  onTogglePlay: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportHtml: () => void;
  onExportTxt: () => void;
  onCopyAscii: () => void;
  onCopyMarkdown: () => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  frame,
  settings,
  mediaType,
  isPlaying,
  originalCanvasRef,
  t,
  onTogglePlay,
  onExportPng,
  onExportSvg,
  onExportHtml,
  onExportTxt,
  onCopyAscii,
  onCopyMarkdown,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageFrameRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'canvas' | 'text'>('canvas');
  const [zoom, setZoom] = useState<number>(1);
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [draggingSplit, setDraggingSplit] = useState<boolean>(false);
  const [copiedRecently, setCopiedRecently] = useState<boolean>(false);

  // Render ASCII frame to high-DPI display canvas (with optional matrix shimmer loop)
  useEffect(() => {
    if (!frame || viewMode !== 'canvas') return;
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Compute base font size so typical density fits cleanly inside stage
    const baseFontSize = Math.max(5.5, Math.min(13, 920 / frame.cols)) * zoom;

    let rafId = 0;
    const startTime = performance.now();

    const draw = (now: number) => {
      const phase = settings.matrixShimmer ? (now - startTime) / 1000 : 0;
      const metrics = renderFrameToCanvas(frame, canvas, settings, {
        fontSize: baseFontSize,
        padding: 18,
        dpr,
        shimmerPhase: phase,
      });

      // Keep CSS display size matched to logical coordinates
      canvas.style.width = `${metrics.width}px`;
      canvas.style.height = `${metrics.height}px`;

      // Sync original comparison canvas if compare mode is active
      if (compareEnabled && compareCanvasRef.current && originalCanvasRef.current) {
        const cmp = compareCanvasRef.current;
        const src = originalCanvasRef.current;
        if (cmp.width !== Math.round(metrics.width * dpr) || cmp.height !== Math.round(metrics.height * dpr)) {
          cmp.width = Math.round(metrics.width * dpr);
          cmp.height = Math.round(metrics.height * dpr);
        }
        cmp.style.width = `${metrics.width}px`;
        cmp.style.height = `${metrics.height}px`;
        const cctx = cmp.getContext('2d');
        if (cctx && src.width > 0 && src.height > 0) {
          cctx.save();
          cctx.scale(dpr, dpr);
          cctx.fillStyle = frame.bgColor;
          cctx.fillRect(0, 0, metrics.width, metrics.height);
          cctx.drawImage(
            src,
            metrics.contentRect.x,
            metrics.contentRect.y,
            metrics.contentRect.w,
            metrics.contentRect.h
          );
          cctx.restore();
        }
      }

      if (settings.matrixShimmer) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw(startTime);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [frame, settings, zoom, viewMode, compareEnabled, originalCanvasRef]);

  // Pointer drag for split compare slider
  useEffect(() => {
    if (!draggingSplit) return;
    const handleMove = (e: PointerEvent) => {
      const container = stageFrameRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      setSplitPercent(Math.max(4, Math.min(96, pct)));
    };
    const handleUp = () => setDraggingSplit(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingSplit]);

  const handleCopyClick = () => {
    onCopyAscii();
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 1600);
  };

  const hasFrame = Boolean(frame && frame.cols > 0);
  const charCount = frame ? frame.cols * frame.rows : 0;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#242733] bg-[#11131b] p-5">
      {/* Stage Header & Interactive Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold tracking-tight text-[#f1f2f7]">{t('previewTitle')}</h2>
          {mediaType === 'video' && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#2f3342] bg-[#0b0d13] px-2.5 py-1.5 text-xs font-medium text-[#e2e4ec] transition-colors hover:border-[#c2ff62] hover:text-[#c2ff62]"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? t('pause') : t('play')}</span>
            </button>
          )}
        </div>

        {/* View / Compare / Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Canvas vs Raw Text switch */}
          <div className="flex rounded-lg border border-[#282b37] bg-[#0b0d13] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-[#252c1b] text-[#c2ff62]'
                  : 'text-[#8b8d9b] hover:text-[#f1f2f7]'
              }`}
            >
              {t('viewCanvas')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('text')}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'text'
                  ? 'bg-[#252c1b] text-[#c2ff62]'
                  : 'text-[#8b8d9b] hover:text-[#f1f2f7]'
              }`}
            >
              {t('viewText')}
            </button>
          </div>

          {/* Split Compare Toggle */}
          {viewMode === 'canvas' && (
            <button
              type="button"
              disabled={!hasFrame}
              onClick={() => setCompareEnabled((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                compareEnabled
                  ? 'border-[#c2ff62] bg-[#252c1b] text-[#c2ff62]'
                  : 'border-[#282b37] bg-[#0b0d13] text-[#9b9eae] hover:border-[#3e4356] hover:text-[#f1f2f7]'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>{t('compareLabel')}</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div
            dir="ltr"
            className="flex items-center rounded-lg border border-[#282b37] bg-[#0b0d13]"
          >
            <button
              type="button"
              disabled={!hasFrame || zoom <= 0.6}
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              className="cursor-pointer p-1.5 text-[#9b9eae] transition-colors hover:text-[#f1f2f7] disabled:opacity-30"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={!hasFrame}
              onClick={() => setZoom(1)}
              className="font-mono-tabular cursor-pointer px-2 text-[11px] text-[#c8cad4] hover:text-[#c2ff62] disabled:opacity-30"
            >
              {zoom === 1 ? t('zoomFit') : `${Math.round(zoom * 100)}%`}
            </button>
            <button
              type="button"
              disabled={!hasFrame || zoom >= 2}
              onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              className="cursor-pointer p-1.5 text-[#9b9eae] transition-colors hover:text-[#f1f2f7] disabled:opacity-30"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div
        dir="ltr"
        className="relative flex min-h-[480px] flex-1 items-center justify-center overflow-auto rounded-xl border border-[#252834] bg-[#08090d] p-4 md:min-h-[580px]"
      >
        {!hasFrame ? (
          <div className="m-auto max-w-sm px-4 py-12 text-center">
            <div
              aria-hidden="true"
              className="font-ascii mb-6 flex -rotate-3 flex-col text-sm leading-snug tracking-[2px] text-[#454d3c]"
            >
              <span> .:-=+*#%@</span>
              <span className="text-[#697652]"> .:-=+*#%@</span>
              <span className="text-[#c2ff62]"> .:-=+*#%@</span>
              <span className="text-[#697652]"> .:-=+*#%@</span>
              <span> .:-=+*#%@</span>
            </div>
            <h3 className="text-sm font-semibold text-[#f1f2f7]">{t('emptyTitle')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#848896]">{t('emptyText')}</p>
          </div>
        ) : viewMode === 'text' ? (
          <pre
            className="font-ascii m-auto max-w-full select-all whitespace-pre text-left text-[8px] leading-[1.08] tracking-normal"
            style={{
              color: frame!.inkColor,
              backgroundColor: frame!.bgColor,
              padding: '18px',
              borderRadius: '10px',
              fontSize: `${Math.max(5, Math.min(11, 780 / frame!.cols)) * zoom}px`,
            }}
          >
            {frame!.text}
          </pre>
        ) : (
          <div
            ref={stageFrameRef}
            className="relative m-auto inline-block select-none overflow-hidden rounded-lg shadow-2xl"
          >
            <canvas ref={displayCanvasRef} className="block" />

            {/* Original image split overlay */}
            {compareEnabled && (
              <>
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                >
                  <canvas ref={compareCanvasRef} className="block" />
                </div>
                <div
                  role="slider"
                  aria-label={t('compareLabel')}
                  aria-valuemin={4}
                  aria-valuemax={96}
                  aria-valuenow={Math.round(splitPercent)}
                  tabIndex={0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDraggingSplit(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') setSplitPercent((p) => Math.max(4, p - 4));
                    if (e.key === 'ArrowRight') setSplitPercent((p) => Math.min(96, p + 4));
                  }}
                  style={{ left: `${splitPercent}%` }}
                  className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 cursor-ew-resize bg-[#c2ff62] shadow-[0_0_12px_rgba(194,255,98,0.8)]"
                >
                  <span className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#c2ff62] bg-[#090a0f] text-[10px] font-bold text-[#c2ff62]">
                    ↔
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Clean Unboxed Tabular Metrics */}
      <div className="font-mono-tabular flex flex-wrap items-center justify-between gap-2 px-1 py-3.5 text-xs text-[#8b8d9b]">
        <div className="flex items-center gap-2">
          {hasFrame ? (
            <>
              <span>
                {frame!.cols} × {frame!.rows} {t('cells')}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {charCount.toLocaleString()} {t('chars')}
              </span>
            </>
          ) : (
            <span>{t('noMedia')}</span>
          )}
        </div>
        <span className="text-[11px] text-[#6d7180]">{settings.engine.toUpperCase()}</span>
      </div>

      {/* Multi-Format Export Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          disabled={!hasFrame}
          onClick={onExportPng}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#c2ff62] bg-[#c2ff62] px-3 py-2.5 text-xs font-bold text-[#14190c] transition-colors hover:bg-[#d5ff8e] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{t('exportPng')}</span>
        </button>

        <button
          type="button"
          disabled={!hasFrame}
          onClick={onExportSvg}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#313544] bg-[#161923] px-3 py-2.5 text-xs font-semibold text-[#e2e4ec] transition-colors hover:border-[#c2ff62]/60 hover:text-[#c2ff62] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <FileCode2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t('exportSvg')}</span>
        </button>

        <button
          type="button"
          disabled={!hasFrame}
          onClick={onExportHtml}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#313544] bg-[#161923] px-3 py-2.5 text-xs font-semibold text-[#e2e4ec] transition-colors hover:border-[#c2ff62]/60 hover:text-[#c2ff62] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>{t('exportHtml')}</span>
        </button>

        <button
          type="button"
          disabled={!hasFrame}
          onClick={onExportTxt}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#313544] bg-[#161923] px-3 py-2.5 text-xs font-semibold text-[#e2e4ec] transition-colors hover:border-[#c2ff62]/60 hover:text-[#c2ff62] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>{t('exportTxt')}</span>
        </button>

        <button
          type="button"
          disabled={!hasFrame}
          onClick={handleCopyClick}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#313544] bg-[#161923] px-3 py-2.5 text-xs font-semibold text-[#e2e4ec] transition-colors hover:border-[#c2ff62]/60 hover:text-[#c2ff62] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {copiedRecently ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-[#c2ff62]" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{t('copyAscii')}</span>
        </button>

        <button
          type="button"
          disabled={!hasFrame}
          onClick={onCopyMarkdown}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#313544] bg-[#161923] px-3 py-2.5 text-xs font-semibold text-[#e2e4ec] transition-colors hover:border-[#c2ff62]/60 hover:text-[#c2ff62] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          <span>{t('copyMarkdown')}</span>
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-[#737785]">{t('privacy')}</p>
    </section>
  );
};
