import React from 'react';
import { X, ExternalLink, HelpCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '../i18n';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const topics = [
    {
      title: "Silent Regressions: 404 & 500 Spikes",
      desc: "Occurs when URL routes are modified or server outages occur. Fix by creating 301 redirects to active pages or fixing server application errors.",
    },
    {
      title: "Accidental NOINDEX Directives",
      desc: "One of the most dangerous SEO regressions. Often pushed accidentally from staging to production. Search engines will de-index the affected URLs within days if not removed immediately.",
    },
    {
      title: "Canonical Conflicts & Mismatches",
      desc: "When a canonical points to a redirected URL, non-200 page, or another domain unintentionally, search engines may ignore your canonical tags and select their own.",
    },
    {
      title: "Structured Data / Schema Breakage",
      desc: "Schema changes (e.g. Article, Product, Organization) can break your rich snippets on Google Search. Ensure required properties remain valid JSON-LD.",
    },
    {
      title: "Content & Keyword Cannibalization",
      desc: "When multiple pages target the identical topic or keywords, Google splits ranking authority between them. Consolidate them or differentiate search intent.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right">
        <div className="flex items-center justify-between pb-4 border-b border-surface-hairline">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-title-sm text-ink">{t('header.help')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6 space-y-6 flex-1">
          {topics.map((t, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-surface border border-surface-hairline">
              <h4 className="font-bold text-body-md text-ink mb-1.5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gold shrink-0" />
                {t.title}
              </h4>
              <p className="text-body-sm text-ink-muted leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-surface-hairline text-center text-xs text-ink-muted">
          SEO GPS &bull; Architecture and Design by Ismail El Asiouty
        </div>
      </div>
    </div>
  );
};
