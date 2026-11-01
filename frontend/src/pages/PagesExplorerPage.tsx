import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Search, ExternalLink, CheckCircle, XCircle, FileText } from 'lucide-react';

export interface PageRecord {
  url: string;
  statusCode: number;
  finalUrl?: string;
  source?: string;
  foundOn?: string;
  pageType?: string;
  title: string;
  description?: string;
  wordCount?: number;
  isIndexable: boolean;
  canonical?: string;
  schemas: string[];
  issueCount?: number;
}

interface PagesExplorerPageProps {
  pages?: PageRecord[];
}

export const PagesExplorerPage: React.FC<PagesExplorerPageProps> = ({ pages = [] }) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filtered = pages.filter((p) => {
    const matchesSearch =
      p.url.toLowerCase().includes(query.toLowerCase()) ||
      p.title.toLowerCase().includes(query.toLowerCase());
    const matchesType = selectedType === 'all' || p.pageType === selectedType;
    return matchesSearch && matchesType;
  });

  const getPageTypeLabel = (type: string) => {
    switch (type) {
      case 'guide':
        return isAr ? 'دليل' : 'Guide';
      case 'blog':
      case 'article':
        return isAr ? 'مقال' : 'Article';
      case 'landing':
      case 'home':
        return isAr ? 'هبوط / رئيسية' : 'Landing / Home';
      case 'category':
        return isAr ? 'تصنيف' : 'Category';
      case 'all':
        return isAr ? 'الكل' : 'All';
      default:
        return isAr ? 'أخرى' : 'Other';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
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
          <div className="editorial-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder={t('pages.search_placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto text-xs">
              {['all', 'guide', 'blog', 'landing', 'category', 'other'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    selectedType === type
                      ? 'bg-ink text-white'
                      : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
                  }`}
                >
                  {getPageTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="editorial-card overflow-hidden">
            <table className="w-full border-collapse text-left rtl:text-right text-body-md">
              <thead>
                <tr className="bg-surface border-b border-surface-hairline text-xs font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4">{t('pages.status')}</th>
                  <th className="py-3 px-4">{t('pages.url')}</th>
                  <th className="py-3 px-4">{t('pages.provenance')}</th>
                  <th className="py-3 px-4">{t('pages.page_type')}</th>
                  <th className="py-3 px-4">{t('pages.title_tag')}</th>
                  <th className="py-3 px-4">{t('pages.indexable')}</th>
                  <th className="py-3 px-4">{t('pages.schemas')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline text-xs">
                {filtered.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gold-tint/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.statusCode === 200
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.statusCode >= 300 && p.statusCode < 400
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink max-w-xs truncate">
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-gold flex items-center gap-1">
                        <span className="truncate">{p.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      {p.finalUrl && p.finalUrl !== p.url && (
                        <div className="text-[10px] text-ink-muted font-mono flex items-center gap-1 mt-0.5">
                          <span>&rarr;</span>
                          <span className="truncate">{p.finalUrl}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-ink-muted">
                      <span className="px-2 py-0.5 rounded bg-surface border text-[10px] font-mono text-ink-light">
                        {p.source || 'sitemap'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink font-semibold">
                      {getPageTypeLabel(p.pageType || 'other')}
                    </td>
                    <td className="py-3 px-4 text-ink font-semibold max-w-xs truncate">
                      {p.title || (isAr ? 'بدون عنوان' : '<No Title>')}
                    </td>
                    <td className="py-3 px-4">
                      {p.isIndexable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> {t('pages.yes')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> {t('pages.noindex')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-ink-muted">
                      {p.schemas && p.schemas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.schemas.map((s, sIdx) => (
                            <span key={sIdx} className="px-1.5 py-0.5 bg-surface rounded border text-ink-light text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">{isAr ? 'لا يوجد' : 'None'}</span>
                      )}
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
