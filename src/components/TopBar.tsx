import React from 'react';
import type { Language } from '../types/studio';
import type { TranslationKey } from '../i18n/translations';

interface TopBarProps {
  lang: Language;
  t: (key: TranslationKey) => string;
  onToggleLang: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ lang, t, onToggleLang }) => {
  return (
    <header className="border-b border-white/[0.06] bg-[#090a0f]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-6 md:px-10">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#"
          dir="ltr"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-xs font-extrabold tracking-[0.16em] text-[#f1f2f7] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2ff62]"
          aria-label="Enzo Studio home"
        >
          <span className="font-ascii grid h-8 w-8 place-items-center rounded-lg border border-[#4c543e] bg-[#10130e] text-base font-medium tracking-[-2px]">
            E<span className="text-[#c2ff62]">.</span>
          </span>
          <span>
            ENZO <span className="font-medium text-[#7b7e8c]">STUDIO</span>
          </span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          <a
            href="#studio"
            className="whitespace-nowrap shrink-0 text-sm font-medium text-[#9c9fac] transition-colors hover:text-[#f1f2f7] hover:underline hover:underline-offset-4"
          >
            {t('navStudio')}
          </a>
          <a
            href="#presets"
            className="whitespace-nowrap shrink-0 text-sm font-medium text-[#9c9fac] transition-colors hover:text-[#f1f2f7] hover:underline hover:underline-offset-4"
          >
            {t('navPresets')}
          </a>
          <a
            href="#how-it-works"
            className="whitespace-nowrap shrink-0 text-sm font-medium text-[#9c9fac] transition-colors hover:text-[#f1f2f7] hover:underline hover:underline-offset-4"
          >
            {t('navGuide')}
          </a>
        </nav>

        {/* Zone 3: Primary action (Language Switcher) */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleLang}
            className="cursor-pointer whitespace-nowrap shrink-0 rounded-lg border border-[#323644] bg-[#141720] px-4 py-2 text-xs font-semibold text-[#e6e8f0] transition-colors hover:border-[#c2ff62] hover:text-[#c2ff62] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2ff62]"
            aria-label={lang === 'en' ? 'تغییر زبان به فارسی' : 'Switch language to English'}
          >
            {t('langBtn')}
          </button>
        </div>
      </div>
    </header>
  );
};
