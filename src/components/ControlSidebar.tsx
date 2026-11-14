import React, { useRef, useState } from 'react';
import { Camera, RotateCcw, Upload, Video, X } from 'lucide-react';
import type { TranslationKey } from '../i18n/translations';
import type { SampleId } from '../engine/sampleGenerator';
import type {
  CharsetId,
  ColorPalette,
  MediaSourceType,
  RenderEngine,
  StudioSettings,
} from '../types/studio';

interface ControlSidebarProps {
  settings: StudioSettings;
  mediaType: MediaSourceType | null;
  mediaName: string;
  activeSample: SampleId | null;
  webcamActive: boolean;
  t: (key: TranslationKey) => string;
  onUpdateSettings: (patch: Partial<StudioSettings>) => void;
  onFileSelect: (file: File) => void;
  onSelectSample: (sample: SampleId) => void;
  onToggleWebcam: () => void;
  onFreezeWebcam: () => void;
  onClearMedia: () => void;
  onReset: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  settings,
  mediaType,
  mediaName,
  activeSample,
  webcamActive,
  t,
  onUpdateSettings,
  onFileSelect,
  onSelectSample,
  onToggleWebcam,
  onFreezeWebcam,
  onClearMedia,
  onReset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const samples: { id: SampleId; label: string }[] = [
    { id: 'monolith', label: t('sampleMonolith') },
    { id: 'bust', label: t('sampleBust') },
    { id: 'solaris', label: t('sampleSolaris') },
    { id: 'nebula', label: t('sampleNebula') },
  ];

  const engines: { id: RenderEngine; label: string }[] = [
    { id: 'ascii', label: t('engineAscii') },
    { id: 'braille', label: t('engineBraille') },
    { id: 'edge', label: t('engineEdge') },
  ];

  const palettes: { id: ColorPalette; label: string; swatch: string }[] = [
    { id: 'mono', label: t('palMono'), swatch: '#e5e7ef' },
    { id: 'color', label: t('palColor'), swatch: 'linear-gradient(135deg,#f43f5e,#f59e0b,#22d3ee)' },
    { id: 'green', label: t('palGreen'), swatch: '#c2ff62' },
    { id: 'amber', label: t('palAmber'), swatch: '#ffb53d' },
    { id: 'cyan', label: t('palCyan'), swatch: '#38bdf8' },
    { id: 'duotone', label: t('palDuotone'), swatch: 'linear-gradient(135deg,#7c3aed,#c2ff62)' },
    { id: 'paper', label: t('palPaper'), swatch: '#f3f0e6' },
  ];

  return (
    <aside className="flex flex-col gap-5 rounded-2xl border border-[#242733] bg-[#11131b] p-5">
      {/* Section 1: Media Input */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-[#f1f2f7]">{t('sourceTitle')}</h2>
          {mediaType && (
            <button
              type="button"
              onClick={onClearMedia}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#8b8d9b] transition-colors hover:text-[#f1f2f7]"
              aria-label={t('removeMedia')}
            >
              <X className="h-3.5 w-3.5" />
              <span>{t('removeMedia')}</span>
            </button>
          )}
        </div>

        <label
          htmlFor="enzo-file-input"
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={handleDrop}
          className={`flex min-h-[124px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-center transition-colors ${
            dragging
              ? 'border-[#c2ff62] bg-[#c2ff62]/[0.06]'
              : 'border-[#383c4b] bg-[#0b0d13] hover:border-[#c2ff62]/70 hover:bg-[#c2ff62]/[0.03]'
          }`}
        >
          <input
            ref={fileInputRef}
            id="enzo-file-input"
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = '';
            }}
          />
          <Upload className="h-5 w-5 text-[#c2ff62]" />
          <div className="text-xs font-semibold text-[#eef0f6]">{t('dropTitle')}</div>
          <div className="text-xs text-[#8b8d9b]">
            {t('or')}{' '}
            <span className="text-[#d7d9e3] underline underline-offset-2">{t('browse')}</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug text-[#6b6f7e]">{t('pasteHint')}</div>
        </label>

        {/* Active file indicator */}
        {mediaName && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-[#242733] bg-[#0b0d13] px-3 py-2 text-xs text-[#c8cad4]">
            <span className="truncate font-mono-tabular">{mediaName}</span>
            <span className="shrink-0 text-[11px] text-[#c2ff62]">
              {mediaType === 'video' ? 'VIDEO' : mediaType === 'webcam' ? 'LIVE' : 'IMG'}
            </span>
          </div>
        )}

        {/* Webcam controls */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onToggleWebcam}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              webcamActive
                ? 'border-[#ef4444]/60 bg-[#ef4444]/10 text-[#fca5a5] hover:bg-[#ef4444]/20'
                : 'border-[#2e3240] bg-[#161923] text-[#dfe1ea] hover:border-[#c2ff62]/70 hover:text-[#c2ff62]'
            }`}
          >
            {webcamActive ? <Video className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            <span>{webcamActive ? t('webcamStop') : t('webcamStart')}</span>
          </button>

          {webcamActive && (
            <button
              type="button"
              onClick={onFreezeWebcam}
              className="cursor-pointer whitespace-nowrap rounded-lg border border-[#c2ff62] bg-[#c2ff62] px-3 py-2.5 text-xs font-bold text-[#14190c] transition-colors hover:bg-[#d5ff8e]"
            >
              {t('snapshot')}
            </button>
          )}
        </div>

        {/* Instant Samples */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-[#8b8d9b]">{t('samplesTitle')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {samples.map((s) => {
              const isSelected = mediaType === 'sample' && activeSample === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSample(s.id)}
                  className={`cursor-pointer truncate rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'border-[#c2ff62]/60 bg-[#252c1b] text-[#c2ff62]'
                      : 'border-[#262a36] bg-[#0b0d13] text-[#a2a5b4] hover:border-[#3d4254] hover:text-[#f1f2f7]'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-px bg-[#242733]" />

      {/* Section 2: Render Engine */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 text-xs font-semibold text-[#d7d8e0]">{t('engineTitle')}</div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#262936] bg-[#0b0d13] p-1">
            {engines.map((eng) => {
              const active = settings.engine === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => onUpdateSettings({ engine: eng.id })}
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#252c1b] text-[#c2ff62]'
                      : 'text-[#8b8d9b] hover:text-[#f1f2f7]'
                  }`}
                >
                  {eng.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Density slider */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="density-slider" className="text-[#d7d8e0]">
              {t('density')}
            </label>
            <output htmlFor="density-slider" className="font-mono-tabular text-[#c2ff62]">
              {settings.density} {t('columns')}
            </output>
          </div>
          <input
            id="density-slider"
            type="range"
            min={35}
            max={220}
            value={settings.density}
            onChange={(e) => onUpdateSettings({ density: Number(e.target.value) })}
            className="enzo-range"
          />
        </div>

        {/* Character set (visible in ASCII mode) */}
        {settings.engine === 'ascii' && (
          <div>
            <label htmlFor="charset-select" className="mb-2 block text-xs text-[#d7d8e0]">
              {t('charset')}
            </label>
            <select
              id="charset-select"
              value={settings.charset}
              onChange={(e) => onUpdateSettings({ charset: e.target.value as CharsetId })}
              className="w-full rounded-lg border border-[#2d3140] bg-[#0b0d13] px-3 py-2.5 text-xs text-[#e3e5ed] outline-none transition-colors focus:border-[#c2ff62]"
            >
              <option value="classic">{t('optClassic')}</option>
              <option value="detailed">{t('optDetailed')}</option>
              <option value="blocks">{t('optBlocks')}</option>
              <option value="binary">{t('optBinary')}</option>
              <option value="soft">{t('optSoft')}</option>
              <option value="letters">{t('optLetters')}</option>
              <option value="katakana">{t('optKatakana')}</option>
              <option value="custom">{t('optCustom')}</option>
            </select>

            {settings.charset === 'custom' && (
              <div className="mt-2.5">
                <label htmlFor="custom-ramp" className="mb-1.5 block text-[11px] text-[#8b8d9b]">
                  {t('customRamp')}
                </label>
                <input
                  id="custom-ramp"
                  type="text"
                  dir="ltr"
                  value={settings.customCharset}
                  onChange={(e) => onUpdateSettings({ customCharset: e.target.value })}
                  placeholder=" .:-=+*#%@"
                  className="font-ascii w-full rounded-lg border border-[#2d3140] bg-[#0b0d13] px-3 py-2 text-xs text-[#f1f2f7] outline-none focus:border-[#c2ff62]"
                />
              </div>
            )}
          </div>
        )}

        {/* Color Palette */}
        <div>
          <div className="mb-2 text-xs text-[#d7d8e0]">{t('colorPalette')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {palettes.map((pal) => {
              const active = settings.colorMode === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => onUpdateSettings({ colorMode: pal.id })}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                    active
                      ? 'border-[#c2ff62] bg-[#252c1b] text-[#c2ff62]'
                      : 'border-[#262936] bg-[#0b0d13] text-[#9a9dae] hover:border-[#3d4254] hover:text-[#f1f2f7]'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{ background: pal.swatch }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{pal.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-px bg-[#242733]" />

      {/* Section 3: Tone & Effects */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="contrast-slider" className="text-[#d7d8e0]">
              {t('contrast')}
            </label>
            <output htmlFor="contrast-slider" className="font-mono-tabular text-[#c2ff62]">
              {(settings.contrast / 100).toFixed(2)}×
            </output>
          </div>
          <input
            id="contrast-slider"
            type="range"
            min={50}
            max={220}
            value={settings.contrast}
            onChange={(e) => onUpdateSettings({ contrast: Number(e.target.value) })}
            className="enzo-range"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="brightness-slider" className="text-[#d7d8e0]">
              {t('brightness')}
            </label>
            <output htmlFor="brightness-slider" className="font-mono-tabular text-[#c2ff62]">
              {settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}%
            </output>
          </div>
          <input
            id="brightness-slider"
            type="range"
            min={-45}
            max={45}
            value={settings.brightness}
            onChange={(e) => onUpdateSettings({ brightness: Number(e.target.value) })}
            className="enzo-range"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="aspect-slider" className="text-[#d7d8e0]">
              {t('aspect')}
            </label>
            <output htmlFor="aspect-slider" className="font-mono-tabular text-[#c2ff62]">
              {settings.cellAspect.toFixed(2)}
            </output>
          </div>
          <input
            id="aspect-slider"
            type="range"
            min={42}
            max={74}
            value={Math.round(settings.cellAspect * 100)}
            onChange={(e) => onUpdateSettings({ cellAspect: Number(e.target.value) / 100 })}
            className="enzo-range"
          />
        </div>

        {/* Feature Toggles */}
        <div className="flex flex-col divide-y divide-[#20232e] border-t border-[#20232e] pt-1">
          {settings.engine !== 'edge' && (
            <ToggleItem
              label={t('dither')}
              sub={t('ditherSub')}
              checked={settings.dither}
              onChange={(v) => onUpdateSettings({ dither: v })}
            />
          )}
          <ToggleItem
            label={t('invert')}
            sub={t('invertSub')}
            checked={settings.invert}
            onChange={(v) => onUpdateSettings({ invert: v })}
          />
          <ToggleItem
            label={t('glow')}
            sub={t('glowSub')}
            checked={settings.glow}
            onChange={(v) => onUpdateSettings({ glow: v })}
          />
          <ToggleItem
            label={t('scanlines')}
            sub={t('scanlinesSub')}
            checked={settings.scanlines}
            onChange={(v) => onUpdateSettings({ scanlines: v })}
          />
          <ToggleItem
            label={t('shimmer')}
            sub={t('shimmerSub')}
            checked={settings.matrixShimmer}
            onChange={(v) => onUpdateSettings({ matrixShimmer: v })}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-1 inline-flex cursor-pointer items-center gap-2 self-start text-xs font-medium text-[#8b8d9b] transition-colors hover:text-[#f1f2f7]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t('reset')}</span>
        </button>
      </div>
    </aside>
  );
};

interface ToggleItemProps {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ label, sub, checked, onChange }) => {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
      <div>
        <div className="text-xs font-semibold text-[#e6e7ef]">{label}</div>
        <div className="mt-0.5 text-[11px] text-[#7a7e8d]">{sub}</div>
      </div>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-[#313543] transition-colors peer-checked:bg-[#495c2b] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#c2ff62]" />
        <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-[#a7aab8] transition-transform peer-checked:translate-x-4 peer-checked:bg-[#c2ff62]" />
      </span>
    </label>
  );
};
