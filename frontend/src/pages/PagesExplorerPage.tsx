import React, { useState } from 'react';
import { useI18n } from '../i18n';
import {
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  X,
  Layers,
  Link2,
  Code,
  AlertTriangle,
  ArrowRight,
  Eye,
  Hash,
} from 'lucide-react';

export interface PageRecord {
  url: string;
  statusCode: number;
  finalUrl?: string;
  source?: string;
  foundOn?: string;
  pageType?: string;
  title: string;
  description?: string;
  h1?: string;
  wordCount?: number;
  isIndexable: boolean;
  canonical?: string;
  schemas: string[];
  issueCount?: number;
  internalLinks?: {
    url: string;
    anchor: string;
    statusCode?: number;
    isBroken?: boolean;
  }[];
}

interface PagesExplorerPageProps {
  pages?: PageRecord[];
}

export const PagesExplorerPage: React.FC<PagesExplorerPageProps> = ({ pages = [] }) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'links' | 'schemas' | 'meta'>('links');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkStatusFilter, setLinkStatusFilter] = useState<'all' | '200' | '301' | 'broken'>('all');

  const filtered = pages.filter((p) => {
    const matchesSearch =
      p.url.toLowerCase().includes(query.toLowerCase()) ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      (p.internalLinks && p.internalLinks.some((l) => l.anchor.toLowerCase().includes(query.toLowerCase()) || l.url.toLowerCase().includes(query.toLowerCase())));
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
      case 'project':
        return isAr ? 'مشروع' : 'Project';
      case 'service':
        return isAr ? 'خدمة' : 'Service';
      case 'contact':
        return isAr ? 'اتصل بنا' : 'Contact';
      case 'about':
        return isAr ? 'من نحن' : 'About';
      case 'all':
        return isAr ? 'الكل' : 'All';
      default:
        return isAr ? 'أخرى' : 'Other';
    }
  };

  const totalInternalLinks = pages.reduce((acc, p) => acc + (p.internalLinks?.length || 0), 0);

  // Filter links inside the selected page
  const pageLinks = selectedPage?.internalLinks || [];
  const filteredPageLinks = pageLinks.filter((l) => {
    const matchesQuery =
      l.anchor.toLowerCase().includes(linkSearch.toLowerCase()) ||
      l.url.toLowerCase().includes(linkSearch.toLowerCase());

    if (linkStatusFilter === '200') return matchesQuery && (!l.statusCode || l.statusCode === 200) && !l.isBroken;
    if (linkStatusFilter === '301') return matchesQuery && (l.statusCode === 301 || l.url.includes('www.'));
    if (linkStatusFilter === 'broken') return matchesQuery && (l.isBroken || (l.statusCode && l.statusCode >= 400));
    return matchesQuery;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
      {/* Title & Overview stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {t('pages.title')}
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {t('pages.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-surface border border-surface-hairline text-xs font-bold text-ink">
            <span className="text-ink-muted ltr:mr-1.5 rtl:ml-1.5">{isAr ? 'إجمالي الصفحات:' : 'Total Pages:'}</span>
            <span className="text-gold font-mono">{pages.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface border border-surface-hairline text-xs font-bold text-ink">
            <span className="text-ink-muted ltr:mr-1.5 rtl:ml-1.5">{t('pages.internal_links')}:</span>
            <span className="text-gold font-mono">{totalInternalLinks.toLocaleString()}</span>
          </div>
        </div>
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
          {/* Search & Taxonomy Filter */}
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
              {['all', 'article', 'project', 'service', 'home', 'contact', 'other'].map((type) => (
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

          {/* Pages Table */}
          <div className="editorial-card overflow-hidden">
            <table className="w-full border-collapse text-left rtl:text-right text-body-md">
              <thead>
                <tr className="bg-surface border-b border-surface-hairline text-xs font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4">{t('pages.status')}</th>
                  <th className="py-3 px-4">{t('pages.url')}</th>
                  <th className="py-3 px-4">{t('pages.page_type')}</th>
                  <th className="py-3 px-4">{t('pages.title_tag')}</th>
                  <th className="py-3 px-4">{t('pages.internal_links')}</th>
                  <th className="py-3 px-4">{t('pages.schemas')}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline text-xs">
                {filtered.map((p, idx) => {
                  const linksCount = p.internalLinks?.length || 0;
                  const schemasCount = p.schemas?.length || 0;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedPage(p)}
                      className="hover:bg-gold-tint/20 transition-colors cursor-pointer"
                    >
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
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{p.url}</span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-ink-muted hover:text-gold shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink font-semibold">
                        <span className="px-2 py-0.5 rounded bg-surface border text-[11px] text-ink-light">
                          {getPageTypeLabel(p.pageType || 'other')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink font-semibold max-w-xs truncate" title={p.title}>
                        {p.title || (isAr ? 'بدون عنوان' : '<No Title>')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gold-tint text-gold border border-gold-border">
                          <Link2 className="w-3 h-3" />
                          {linksCount} {isAr ? 'رابط' : 'links'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-muted">
                        {schemasCount > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {p.schemas.slice(0, 3).map((s, sIdx) => (
                              <span key={sIdx} className="px-1.5 py-0.5 bg-surface rounded border text-ink-light text-[10px]">
                                {s}
                              </span>
                            ))}
                            {schemasCount > 3 && (
                              <span className="px-1.5 py-0.5 bg-gold-tint rounded border border-gold-border text-gold text-[10px] font-bold">
                                +{schemasCount - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted italic">{isAr ? 'لا يوجد' : 'None'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPage(p);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-surface-hairline text-ink hover:text-gold hover:border-gold-border text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تفاصيل' : 'Inspect'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Slide-over Page & Links Inspector Drawer */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-surface-hairline max-h-[88vh] flex flex-col overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-surface-hairline pb-4 mb-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedPage.statusCode === 200
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    HTTP {selectedPage.statusCode}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border text-xs font-bold text-ink-muted">
                    {getPageTypeLabel(selectedPage.pageType || 'other')}
                  </span>
                  {selectedPage.isIndexable ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> {t('pages.indexable')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3 h-3" /> {t('pages.noindex')}
                    </span>
                  )}
                </div>
                <h3 className="text-title-sm font-extrabold text-ink line-clamp-1">
                  {selectedPage.title || selectedPage.url}
                </h3>
                <a
                  href={selectedPage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold hover:underline font-mono flex items-center gap-1"
                >
                  <span className="truncate">{selectedPage.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
              <button
                onClick={() => setSelectedPage(null)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-surface-hairline pb-2 mb-4 text-xs font-bold">
              <button
                onClick={() => setInspectorTab('links')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectorTab === 'links'
                    ? 'bg-ink text-white'
                    : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{t('pages.tab_links')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {selectedPage.internalLinks?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setInspectorTab('schemas')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectorTab === 'schemas'
                    ? 'bg-ink text-white'
                    : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>{t('pages.tab_schemas')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {selectedPage.schemas?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setInspectorTab('meta')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectorTab === 'meta'
                    ? 'bg-ink text-white'
                    : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('pages.tab_metadata')}</span>
              </button>
            </div>

            {/* Tab 1: Internal Links & Anchor Texts */}
            {inspectorTab === 'links' && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {/* Search & Status Filters for Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                    <input
                      type="text"
                      placeholder={t('pages.filter_links_placeholder')}
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rtl:pr-8 rtl:pl-3 bg-surface rounded-lg border border-surface-hairline text-ink text-xs focus:outline-none focus:border-gold-border"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => setLinkStatusFilter('all')}
                      className={`px-2 py-1 rounded ${
                        linkStatusFilter === 'all' ? 'bg-ink text-white' : 'bg-surface text-ink-muted border'
                      }`}
                    >
                      {t('pages.all_links')} ({pageLinks.length})
                    </button>
                    <button
                      onClick={() => setLinkStatusFilter('200')}
                      className={`px-2 py-1 rounded ${
                        linkStatusFilter === '200' ? 'bg-emerald-600 text-white' : 'bg-surface text-emerald-700 border'
                      }`}
                    >
                      {t('pages.healthy_links')}
                    </button>
                    <button
                      onClick={() => setLinkStatusFilter('301')}
                      className={`px-2 py-1 rounded ${
                        linkStatusFilter === '301' ? 'bg-amber-600 text-white' : 'bg-surface text-amber-700 border'
                      }`}
                    >
                      {t('pages.redirect_links')}
                    </button>
                  </div>
                </div>

                {filteredPageLinks.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted text-xs bg-surface rounded-xl border border-surface-hairline">
                    {t('pages.no_links_found')}
                  </div>
                ) : (
                  <div className="border border-surface-hairline rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-left rtl:text-right text-xs">
                      <thead>
                        <tr className="bg-surface border-b border-surface-hairline text-[11px] font-bold text-ink-muted uppercase">
                          <th className="py-2.5 px-3">{t('pages.anchor_text')}</th>
                          <th className="py-2.5 px-3">{t('pages.target_url')}</th>
                          <th className="py-2.5 px-3 text-center">{t('pages.link_status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-hairline">
                        {filteredPageLinks.map((l, lIdx) => {
                          const isRedirect = l.statusCode === 301 || l.url.includes('www.');
                          const isBroken = l.isBroken || (l.statusCode && l.statusCode >= 400);
                          return (
                            <tr key={lIdx} className="hover:bg-gold-tint/10 transition-colors">
                              <td className="py-2 px-3 font-bold text-ink max-w-[200px] truncate">
                                <span className="inline-flex items-center gap-1.5 text-ink">
                                  <Link2 className="w-3 h-3 text-gold shrink-0" />
                                  <span>{l.anchor || (isAr ? '<بدون نص>' : '<No Anchor>')}</span>
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-ink-muted max-w-[280px] truncate">
                                <a
                                  href={l.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-gold flex items-center gap-1 truncate"
                                >
                                  <span className="truncate">{l.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isBroken ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    {t('pages.status_broken')}
                                  </span>
                                ) : isRedirect ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    {t('pages.status_redirect')}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {t('pages.status_ok')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Schema.org Markup Inspector */}
            {inspectorTab === 'schemas' && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="p-4 bg-surface rounded-xl border border-surface-hairline flex items-center justify-between">
                  <div>
                    <h4 className="text-body-sm font-extrabold text-ink">
                      {isAr ? 'البيانات المنظمة المكتشفة في الصفحة' : 'Structured Data Detected'}
                    </h4>
                    <p className="text-xs text-ink-muted">
                      {isAr
                        ? 'تساعد وسوم Schema محركات البحث في فهم كيانات الصفحة وعرض النتائج الغنية (Rich Snippets).'
                        : 'Schema markup helps search engines understand page entities and power rich results.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-gold-tint text-gold font-bold text-xs border border-gold-border">
                    {selectedPage.schemas?.length || 0} Schemas
                  </span>
                </div>

                {selectedPage.schemas && selectedPage.schemas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPage.schemas.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-surface-hairline shadow-sm flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-xs shrink-0">
                          <Code className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-ink text-xs">{s}</div>
                          <div className="text-[11px] text-ink-muted">schema.org/{s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-ink-muted text-xs bg-surface rounded-xl border border-surface-hairline">
                    {t('pages.no_schemas_found')}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Meta & Content Signals */}
            {inspectorTab === 'meta' && (
              <div className="flex-1 overflow-y-auto space-y-3">
                <div className="p-3.5 bg-surface rounded-xl border border-surface-hairline space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span>{isAr ? 'وسم عنوان الصفحة (Title Tag)' : 'Title Tag'}</span>
                    <span className="font-mono text-ink-muted">{(selectedPage.title || '').length} chars</span>
                  </div>
                  <div className="text-xs font-semibold text-ink bg-white p-2.5 rounded-lg border border-surface-hairline">
                    {selectedPage.title || (isAr ? '<مفقود>' : '<Missing>')}
                  </div>
                </div>

                <div className="p-3.5 bg-surface rounded-xl border border-surface-hairline space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span>{isAr ? 'الترويسة الرئيسية (H1 Heading)' : 'H1 Heading'}</span>
                  </div>
                  <div className="text-xs font-semibold text-ink bg-white p-2.5 rounded-lg border border-surface-hairline">
                    {selectedPage.h1 || (isAr ? '<مفقود>' : '<Missing>')}
                  </div>
                </div>

                <div className="p-3.5 bg-surface rounded-xl border border-surface-hairline space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span>{isAr ? 'وصف الميتا (Meta Description)' : 'Meta Description'}</span>
                    <span className="font-mono text-ink-muted">{(selectedPage.description || '').length} chars</span>
                  </div>
                  <div className="text-xs text-ink-light bg-white p-2.5 rounded-lg border border-surface-hairline">
                    {selectedPage.description || (isAr ? '<مفقود>' : '<Missing>')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface rounded-xl border border-surface-hairline">
                    <span className="text-xs text-ink-muted block mb-0.5">{isAr ? 'عدد الكلمات' : 'Word Count'}</span>
                    <span className="text-body-md font-bold font-mono text-ink">{selectedPage.wordCount || 0}</span>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-surface-hairline">
                    <span className="text-xs text-ink-muted block mb-0.5">{isAr ? 'الرابط الأساسي (Canonical)' : 'Canonical URL'}</span>
                    <span className="text-xs font-mono text-ink truncate block" title={selectedPage.canonical}>
                      {selectedPage.canonical || selectedPage.url}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
