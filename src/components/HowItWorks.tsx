import React from 'react';
import type { TranslationKey } from '../i18n/translations';

interface HowItWorksProps {
  t: (key: TranslationKey) => string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ t }) => {
  const steps = [
    { num: t('how1n'), title: t('how1t'), desc: t('how1p') },
    { num: t('how2n'), title: t('how2t'), desc: t('how2p') },
    { num: t('how3n'), title: t('how3t'), desc: t('how3p') },
  ];

  const shortcuts = [
    { keys: 'Ctrl / ⌘ + V', label: t('shortcutPaste') },
    { keys: 'I', label: t('shortcutInvert') },
    { keys: 'C', label: t('shortcutCopy') },
    { keys: 'Space', label: t('shortcutSpace') },
  ];

  return (
    <>
      <section id="how-it-works" className="mx-auto max-w-[1440px] px-6 py-20 md:px-10">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#f1f2f7]">{t('howTitle')}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.num}
              className="rounded-2xl border border-[#242733] bg-[#11131b]/70 p-6"
            >
              <div className="font-mono-tabular text-xs font-medium text-[#c2ff62]">
                {step.num}
              </div>
              <h3 className="mt-4 text-base font-bold text-[#f1f2f7]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9295a3]">{step.desc}</p>
            </article>
          ))}
        </div>

        {/* Keyboard shortcuts bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#20232e] bg-[#0d0f16] px-5 py-4">
          <span className="text-xs font-semibold text-[#c5c7d2]">{t('shortcutsTitle')}</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center gap-2 text-xs text-[#8b8d9b]">
                <kbd
                  dir="ltr"
                  className="font-mono-tabular rounded border border-[#303444] bg-[#161923] px-2 py-0.5 text-[11px] text-[#e2e4ec]"
                >
                  {s.keys}
                </kbd>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-7 text-xs text-[#7c808e] md:px-10">
          <span className="font-bold tracking-wide text-[#d4d6e0]">{t('footerLeft')}</span>
          <span>{t('footerRight')}</span>
        </div>
      </footer>
    </>
  );
};
