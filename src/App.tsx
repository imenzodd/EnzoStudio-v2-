import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ControlSidebar } from './components/ControlSidebar';
import { HowItWorks } from './components/HowItWorks';
import { PreviewStage } from './components/PreviewStage';
import { TopBar } from './components/TopBar';
import {
  buildHtmlExport,
  buildSvgExport,
  processSourceToAscii,
  renderFrameToCanvas,
} from './engine/asciiEngine';
import { generateSampleImage, type SampleId } from './engine/sampleGenerator';
import { getTranslation, type TranslationKey } from './i18n/translations';
import {
  DEFAULT_SETTINGS,
  STUDIO_PRESETS,
  type AsciiFrame,
  type Language,
  type MediaSourceType,
  type StudioSettings,
} from './types/studio';

function safeFileBase(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'enzo-ascii'
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('enzo-lang');
      if (saved === 'en' || saved === 'fa') return saved;
    } catch {
      // ignore storage errors
    }
    return (navigator.language || '').toLowerCase().startsWith('fa') ? 'fa' : 'en';
  });

  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [mediaType, setMediaType] = useState<MediaSourceType | null>('sample');
  const [activeSample, setActiveSample] = useState<SampleId | null>('monolith');
  const [mediaName, setMediaName] = useState<string>('monolith-sample.png');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [frame, setFrame] = useState<AsciiFrame | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Offscreen media & processing refs
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const settingsRef = useRef<StudioSettings>(settings);
  settingsRef.current = settings;

  const t = useCallback(
    (key: TranslationKey) => getTranslation(lang, key),
    [lang]
  );

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // Ensure offscreen canvases exist once
  const ensureCanvases = () => {
    if (!workCanvasRef.current) workCanvasRef.current = document.createElement('canvas');
    if (!originalCanvasRef.current) originalCanvasRef.current = document.createElement('canvas');
    if (!exportCanvasRef.current) exportCanvasRef.current = document.createElement('canvas');
  };

  // Sync HTML lang, dir, and document title
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.title = getTranslation(lang, 'pageTitle');
    try {
      localStorage.setItem('enzo-lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Process a still source (image or canvas)
  const renderStillSource = useCallback(
    (source: HTMLImageElement | HTMLCanvasElement, nextSettings: StudioSettings) => {
      ensureCanvases();
      const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      if (!w || !h) return;

      // Sync originalCanvasRef for pixel-aligned split compare
      const orig = originalCanvasRef.current!;
      if (orig.width !== w || orig.height !== h) {
        orig.width = w;
        orig.height = h;
      }
      orig.getContext('2d')!.drawImage(source, 0, 0, w, h);

      const nextFrame = processSourceToAscii(
        source,
        w,
        h,
        nextSettings,
        workCanvasRef.current!
      );
      setFrame(nextFrame);
    },
    []
  );

  // Stop any running video or webcam stream
  const stopDynamicStreams = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
    setWebcamActive(false);
    setIsPlaying(false);
  }, []);

  // Load default sample on initial mount
  useEffect(() => {
    const sampleCanvas = generateSampleImage('monolith');
    sourceImageRef.current = sampleCanvas;
    renderStillSource(sampleCanvas, DEFAULT_SETTINGS);
    return () => {
      stopDynamicStreams();
    };
  }, [renderStillSource, stopDynamicStreams]);

  // Re-render still image/sample whenever settings change
  useEffect(() => {
    if (
      (mediaType === 'image' || mediaType === 'sample') &&
      sourceImageRef.current
    ) {
      renderStillSource(sourceImageRef.current, settings);
    }
  }, [settings, mediaType, renderStillSource]);

  // Real-time loop for Video or Webcam
  useEffect(() => {
    if ((mediaType !== 'video' && mediaType !== 'webcam') || !isPlaying) return;
    let rafId = 0;
    let lastTick = 0;

    const tick = (now: number) => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Throttle to ~30fps for smooth responsiveness
        if (now - lastTick >= 33) {
          lastTick = now;
          ensureCanvases();
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const orig = originalCanvasRef.current!;
          if (orig.width !== vw || orig.height !== vh) {
            orig.width = vw;
            orig.height = vh;
          }
          orig.getContext('2d')!.drawImage(video, 0, 0, vw, vh);

          const nextFrame = processSourceToAscii(
            video,
            vw,
            vh,
            settingsRef.current,
            workCanvasRef.current!
          );
          setFrame(nextFrame);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mediaType, isPlaying]);

  const handleSelectSample = useCallback(
    (sampleId: SampleId) => {
      stopDynamicStreams();
      const canvas = generateSampleImage(sampleId);
      sourceImageRef.current = canvas;
      setMediaType('sample');
      setActiveSample(sampleId);
      setMediaName(`${sampleId}-sample.png`);
      renderStillSource(canvas, settingsRef.current);
    },
    [renderStillSource, stopDynamicStreams]
  );

  const loadImageFile = useCallback(
    (file: File, fromPaste = false) => {
      stopDynamicStreams();
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        sourceImageRef.current = img;
        setMediaType('image');
        setActiveSample(null);
        setMediaName(file.name || 'pasted-image.png');
        renderStillSource(img, settingsRef.current);
        if (fromPaste) notify(t('toastPasted'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        notify(t('toastOpenFail'));
      };
      img.src = url;
    },
    [notify, renderStillSource, stopDynamicStreams, t]
  );

  const loadVideoFile = useCallback(
    (file: File) => {
      stopDynamicStreams();
      const url = URL.createObjectURL(file);
      videoObjectUrlRef.current = url;
      const video = videoRef.current ?? document.createElement('video');
      videoRef.current = video;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.src = url;
      video.onloadeddata = () => {
        setMediaType('video');
        setActiveSample(null);
        setMediaName(file.name);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      };
      video.onerror = () => {
        notify(t('toastOpenFail'));
      };
    },
    [notify, stopDynamicStreams, t]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        loadImageFile(file);
      } else if (file.type.startsWith('video/')) {
        loadVideoFile(file);
      } else {
        notify(t('toastInvalidFile'));
      }
    },
    [loadImageFile, loadVideoFile, notify, t]
  );

  const handleToggleWebcam = useCallback(async () => {
    if (webcamActive) {
      stopDynamicStreams();
      setMediaType(null);
      setMediaName('');
      setFrame(null);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      notify(t('toastWebcamFail'));
      return;
    }

    try {
      stopDynamicStreams();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current ?? document.createElement('video');
      videoRef.current = video;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      setWebcamActive(true);
      setMediaType('webcam');
      setActiveSample(null);
      setMediaName('webcam-live');
      setIsPlaying(true);
      notify(t('toastWebcamOn'));
    } catch {
      notify(t('toastWebcamFail'));
    }
  }, [notify, stopDynamicStreams, t, webcamActive]);

  const handleFreezeWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    snap.getContext('2d')!.drawImage(video, 0, 0, snap.width, snap.height);

    stopDynamicStreams();
    sourceImageRef.current = snap;
    setMediaType('image');
    setActiveSample(null);
    setMediaName('camera-snapshot.png');
    renderStillSource(snap, settingsRef.current);
    notify(t('toastSnapshot'));
  }, [notify, renderStillSource, stopDynamicStreams, t]);

  const handleClearMedia = useCallback(() => {
    stopDynamicStreams();
    sourceImageRef.current = null;
    setMediaType(null);
    setActiveSample(null);
    setMediaName('');
    setFrame(null);
  }, [stopDynamicStreams]);

  const handleUpdateSettings = useCallback((patch: Partial<StudioSettings>) => {
    setActivePreset(null);
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApplyPreset = useCallback((presetId: string) => {
    const found = STUDIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setSettings((prev) => ({ ...prev, ...found.settings }));
  }, []);

  const handleReset = useCallback(() => {
    setActivePreset(null);
    setSettings(DEFAULT_SETTINGS);
    notify(t('toastReset'));
  }, [notify, t]);

  // Global clipboard paste + keyboard shortcuts + window drag prevention
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            loadImageFile(blob, true);
            break;
          }
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'i' || e.key === 'I') {
        setSettings((prev) => ({ ...prev, invert: !prev.invert }));
      } else if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) {
        if (frame?.text) {
          navigator.clipboard
            .writeText(frame.text)
            .then(() => notify(t('toastCopyOk')))
            .catch(() => notify(t('toastCopyFail')));
        }
      } else if (e.code === 'Space' && mediaType === 'video' && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    const preventDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('dragover', preventDrop);
    window.addEventListener('drop', preventDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('dragover', preventDrop);
      window.removeEventListener('drop', preventDrop);
    };
  }, [frame, loadImageFile, mediaType, notify, t]);

  // Exporters
  const handleExportPng = () => {
    if (!frame) return;
    ensureCanvases();
    const expCanvas = exportCanvasRef.current!;
    const fontSize = Math.max(10, Math.min(20, Math.floor(2400 / frame.cols)));
    renderFrameToCanvas(frame, expCanvas, settings, {
      fontSize,
      padding: 36,
      dpr: 1,
    });
    expCanvas.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, `${safeFileBase(mediaName)}-ascii.png`);
      notify(t('toastPngOk'));
    }, 'image/png');
  };

  const handleExportSvg = () => {
    if (!frame) return;
    const svg = buildSvgExport(frame, settings);
    triggerDownload(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
      `${safeFileBase(mediaName)}-ascii.svg`
    );
    notify(t('toastSvgOk'));
  };

  const handleExportHtml = () => {
    if (!frame) return;
    const html = buildHtmlExport(frame, settings);
    triggerDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${safeFileBase(mediaName)}-ascii.html`
    );
    notify(t('toastHtmlOk'));
  };

  const handleExportTxt = () => {
    if (!frame) return;
    triggerDownload(
      new Blob([frame.text], { type: 'text/plain;charset=utf-8' }),
      `${safeFileBase(mediaName)}-ascii.txt`
    );
    notify(t('toastTxtOk'));
  };

  const handleCopyAscii = async () => {
    if (!frame) return;
    try {
      await navigator.clipboard.writeText(frame.text);
      notify(t('toastCopyOk'));
    } catch {
      notify(t('toastCopyFail'));
    }
  };

  const handleCopyMarkdown = async () => {
    if (!frame) return;
    const md = '```text\n' + frame.text + '\n```';
    try {
      await navigator.clipboard.writeText(md);
      notify(t('toastCopyMdOk'));
    } catch {
      notify(t('toastCopyFail'));
    }
  };

  const handleToggleVideoPlay = () => {
    const video = videoRef.current;
    if (!video || mediaType !== 'video') return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const presetLabels: Record<string, TranslationKey> = {
    terminal: 'presetTerminal',
    braille: 'presetBraille',
    blueprint: 'presetBlueprint',
    halftone: 'presetHalftone',
    chromatic: 'presetChromatic',
    editorial: 'presetEditorial',
  };

  return (
    <div className="relative min-h-screen bg-[#090a0f] text-[#f1f2f7]">
      {/* Subtle ambient depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-[#c2ff62]/[0.05] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-96 -right-40 h-96 w-96 rounded-full bg-[#6366f1]/[0.06] blur-[130px]"
      />

      <TopBar
        lang={lang}
        t={t}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'fa' : 'en'))}
      />

      <main className="relative z-10 mx-auto max-w-[1440px] px-6 md:px-10">
        {/* Hero */}
        <section className="max-w-3xl pt-12 pb-8 md:pt-16 md:pb-10">
          <div className="font-mono-tabular flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] text-[#c2ff62]">
            <span className="h-px w-6 bg-[#c2ff62]" aria-hidden="true" />
            <span>{t('eyebrow')}</span>
          </div>
          <h1
            className="mt-5 font-bold tracking-tight text-[#f1f2f7]"
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
              lineHeight: lang === 'fa' ? 1.35 : 1.06,
              textWrap: 'balance',
            }}
          >
            {t('h1a')} <br />
            <span className="text-[#787c8a]">{t('h1b')}</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#9b9eab] md:text-base">
            {t('heroCopy')}
          </p>
        </section>

        {/* Quick Studio Presets Strip */}
        <section id="presets" className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="me-2 text-xs font-semibold text-[#8b8d9b]">
              {t('presetsTitle')}
            </span>
            {STUDIO_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`cursor-pointer whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'border-[#c2ff62] bg-[#252c1b] text-[#c2ff62]'
                      : 'border-[#262936] bg-[#11131b] text-[#b4b7c4] hover:border-[#3e4356] hover:text-[#f1f2f7]'
                  }`}
                >
                  {t(presetLabels[preset.id])}
                </button>
              );
            })}
          </div>
        </section>

        {/* Main 2-Column Studio Workspace */}
        <section
          id="studio"
          aria-label="ASCII art workspace"
          className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[350px_minmax(0,1fr)]"
        >
          <ControlSidebar
            settings={settings}
            mediaType={mediaType}
            mediaName={mediaName}
            activeSample={activeSample}
            webcamActive={webcamActive}
            t={t}
            onUpdateSettings={handleUpdateSettings}
            onFileSelect={handleFileSelect}
            onSelectSample={handleSelectSample}
            onToggleWebcam={handleToggleWebcam}
            onFreezeWebcam={handleFreezeWebcam}
            onClearMedia={handleClearMedia}
            onReset={handleReset}
          />

          <PreviewStage
            frame={frame}
            settings={settings}
            mediaType={mediaType}
            isPlaying={isPlaying}
            originalCanvasRef={originalCanvasRef}
            t={t}
            onTogglePlay={handleToggleVideoPlay}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportHtml={handleExportHtml}
            onExportTxt={handleExportTxt}
            onCopyAscii={handleCopyAscii}
            onCopyMarkdown={handleCopyMarkdown}
          />
        </section>
      </main>

      <HowItWorks t={t} />

      {/* Toast Notification */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#c2ff62] px-4 py-2.5 text-xs font-bold text-[#14190c] shadow-2xl transition-all duration-200 ${
          toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {toastMsg}
      </div>
    </div>
  );
}
