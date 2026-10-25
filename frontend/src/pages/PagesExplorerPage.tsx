import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Search, ExternalLink, CheckCircle, XCircle, FileText } from 'lucide-react';

export interface PageRecord {
  url: string;
  statusCode: number;
  title: string;
  isIndexable: boolean;
  canonical: string;
  schemas: string[];
}

interface PagesExplorerPageProps {
  pages?: PageRecord[];
}

export const PagesExplorerPage: React.FC<PagesExplorerPageProps> = ({ pages = [] }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filtered = pages.filter(
    (p) => p.url.toLowerCase().includes(query.toLowerCase()) || p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('pages.title')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          {t('pages.subtitle')}
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="editorial-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-title-md font-extrabold text-ink mb-2">
            {t('empty_states.no_pages_title')}
          </h3>
          <p className="text-body-md text-ink-muted max-w-md">
            {t('empty_states.no_pages_desc')}
          </p>
        </div>
      ) : (
        <>
          <div className="editorial-card p-3">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder={t('pages.search_placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <div className="editorial-card overflow-hidden">
            <table className="w-full border-collapse text-left rtl:text-right text-body-md">
              <thead>
                <tr className="bg-surface border-b border-surface-hairline text-xs font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4">{t('pages.status')}</th>
                  <th className="py-3 px-4">{t('pages.url')}</th>
                  <th className="py-3 px-4">{t('pages.title_tag')}</th>
                  <th className="py-3 px-4">{t('pages.indexable')}</th>
                  <th className="py-3 px-4">{t('pages.schemas')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline">
                {filtered.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gold-tint/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-severity-healthy">
                      {p.statusCode} OK
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-ink max-w-xs truncate">
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-gold flex items-center gap-1">
                        <span className="truncate">{p.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-ink font-semibold text-body-sm max-w-xs truncate">
                      {p.title}
                    </td>
                    <td className="py-3 px-4">
                      {p.isIndexable ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-severity-healthy bg-severity-healthy-bg px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> {t('pages.yes')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-severity-critical bg-severity-critical-bg px-2 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> {t('pages.noindex')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {p.schemas.map((s, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-surface-hairline text-ink"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
