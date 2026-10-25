import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Search, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

interface PageRecord {
  url: string;
  statusCode: number;
  title: string;
  isIndexable: boolean;
  canonical: string;
  schemas: string[];
}

const mockPages: PageRecord[] = [
  {
    url: 'https://example.com/',
    statusCode: 200,
    title: 'SEO GPS - Automated Regression Monitor',
    isIndexable: true,
    canonical: 'https://example.com/',
    schemas: ['Organization', 'WebSite'],
  },
  {
    url: 'https://example.com/about',
    statusCode: 200,
    title: 'About Us - Built by Ismail El Asiouty',
    isIndexable: true,
    canonical: 'https://example.com/about',
    schemas: ['AboutPage'],
  },
  {
    url: 'https://example.com/pricing',
    statusCode: 200,
    title: 'Simple Pricing - SEO GPS',
    isIndexable: true,
    canonical: 'https://example.com/pricing',
    schemas: ['Product'],
  },
  {
    url: 'https://example.com/blog/seo-guide',
    statusCode: 200,
    title: 'Comprehensive SEO Guide 2026',
    isIndexable: true,
    canonical: 'https://example.com/blog/seo-guide',
    schemas: ['Article', 'BreadcrumbList'],
  },
];

export const PagesExplorerPage: React.FC = () => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filtered = mockPages.filter(
    (p) => p.url.toLowerCase().includes(query.toLowerCase()) || p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('nav.pages')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Complete inventory of all discovered and crawled URLs with metadata, indexability, and schema types
        </p>
      </div>

      <div className="editorial-card p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder="Search pages by URL, path, or title..."
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
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">URL</th>
              <th className="py-3 px-4">Title Tag</th>
              <th className="py-3 px-4">Indexable</th>
              <th className="py-3 px-4">Schema Types</th>
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
                    <ExternalLink className="w-3 h-3 shrink-0 text-ink-muted" />
                  </a>
                </td>
                <td className="py-3 px-4 font-semibold text-ink max-w-sm truncate">
                  {p.title}
                </td>
                <td className="py-3 px-4">
                  {p.isIndexable ? (
                    <span className="inline-flex items-center gap-1 text-xs text-severity-healthy font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-severity-critical font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Noindex
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {p.schemas.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface border border-surface-hairline text-[11px] font-mono text-ink-muted">
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
    </div>
  );
};
