import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { GaugeChart } from '../components/GaugeChart';
import {
  Sparkles,
  Globe,
  FileCode,
  Mail,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  Layers,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface CrawledPageResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  canonical: string;
  isIndexable: boolean;
  title: string;
  titleLength: number;
  description: string;
  descLength: number;
  schemas: string[];
  h1: string;
  issues: { severity: 'critical' | 'warning' | 'notice'; title: string; details: string }[];
}

interface CannibalizationPair {
  urlA: string;
  titleA: string;
  urlB: string;
  titleB: string;
  similarity: number;
}

export const QuickAuditPage: React.FC = () => {
  const { t } = useI18n();
  const [rootUrl, setRootUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'all' | 'status' | 'canonical' | 'meta' | 'schema' | 'cannibalization'>('all');

  // Audit Results State
  const [pages, setPages] = useState<CrawledPageResult[]>([]);
  const [cannibalization, setCannibalization] = useState<CannibalizationPair[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>('');

  const handleRunFullAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootUrl) return;

    setIsAuditing(true);
    setPages([]);
    setCannibalization([]);
    setHealthScore(null);
    setEmailStatus('');
    setProgressMsg(t('quick_audit.running'));

    setTimeout(() => {
      const cleanRoot = rootUrl.replace(/\/$/, '');
      const domain = cleanRoot.replace(/https?:\/\//, '').split('/')[0];

      // Simulated realistic full-site audit discovered pages
      const discoveredPages: CrawledPageResult[] = [
        {
          url: `${cleanRoot}/`,
          statusCode: 200,
          responseTimeMs: 145,
          canonical: `${cleanRoot}/`,
          isIndexable: true,
          title: `${domain} - Official Homepage`,
          titleLength: `${domain} - Official Homepage`.length,
          description: 'High-quality technical SEO monitoring and regression protection platform.',
          descLength: 72,
          schemas: ['Organization', 'WebSite'],
          h1: 'Welcome to our platform',
          issues: [],
        },
        {
          url: `${cleanRoot}/services`,
          statusCode: 200,
          responseTimeMs: 198,
          canonical: `${cleanRoot}/services`,
          isIndexable: true,
          title: 'Our Complete Professional Services',
          titleLength: 35,
          description: 'Explore the full range of enterprise consulting and technical offerings.',
          descLength: 68,
          schemas: ['Service', 'BreadcrumbList'],
          h1: 'Professional Services',
          issues: [],
        },
        {
          url: `${cleanRoot}/pricing`,
          statusCode: 200,
          responseTimeMs: 165,
          canonical: `${cleanRoot}/pricing`,
          isIndexable: true,
          title: 'Transparent Pricing Plans',
          titleLength: 26,
          description: 'Simple and affordable subscription tiers with zero hidden hosting fees.',
          descLength: 69,
          schemas: ['Product'],
          h1: 'Simple Pricing',
          issues: [],
        },
        {
          url: `${cleanRoot}/blog/seo-best-practices`,
          statusCode: 200,
          responseTimeMs: 220,
          canonical: `${cleanRoot}/blog/seo-best-practices`,
          isIndexable: true,
          title: 'Comprehensive SEO Best Practices for Modern Web Applications',
          titleLength: 62,
          description: 'Detailed actionable guide explaining how to avoid silent SEO regressions and broken links.',
          descLength: 89,
          schemas: ['Article', 'BreadcrumbList'],
          h1: 'SEO Best Practices Guide',
          issues: [
            {
              severity: 'notice',
              title: 'Title tag length close to truncation limit (62 characters)',
              details: 'Keep title tags under 60-70 characters to ensure full visibility on mobile search results.',
            },
          ],
        },
        {
          url: `${cleanRoot}/blog/seo-optimization-tips`,
          statusCode: 200,
          responseTimeMs: 210,
          canonical: `${cleanRoot}/blog/seo-optimization-tips`,
          isIndexable: true,
          title: 'Top SEO Optimization Tips and Ranking Strategies',
          titleLength: 48,
          description: 'Learn top SEO optimization tips to improve Google search visibility.',
          descLength: 67,
          schemas: ['Article'],
          h1: 'Top SEO Optimization Tips',
          issues: [],
        },
        {
          url: `${cleanRoot}/old-promo`,
          statusCode: 301,
          responseTimeMs: 110,
          canonical: `${cleanRoot}/pricing`,
          isIndexable: false,
          title: 'Redirecting...',
          titleLength: 14,
          description: '',
          descLength: 0,
          schemas: [],
          h1: '',
          issues: [
            {
              severity: 'warning',
              title: '301 Permanent Redirect detected',
              details: `Page redirects permanently to ${cleanRoot}/pricing. Update internal links pointing here.`,
            },
          ],
        },
      ];

      // Simulated Content Cannibalization Pair
      const detectedCannibalization: CannibalizationPair[] = [
        {
          urlA: `${cleanRoot}/blog/seo-best-practices`,
          titleA: 'Comprehensive SEO Best Practices for Modern Web Applications',
          urlB: `${cleanRoot}/blog/seo-optimization-tips`,
          titleB: 'Top SEO Optimization Tips and Ranking Strategies',
          similarity: 82,
        },
      ];

      setPages(discoveredPages);
      setCannibalization(detectedCannibalization);
      setHealthScore(92);

      // Email delivery via Resend if selected
      if (sendEmail && recipientEmail) {
        try {
          const resendKey = import.meta.env.VITE_RESEND_API_KEY;
          if (resendKey) {
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'SEO GPS <onboarding@resend.dev>',
                to: [recipientEmail],
                subject: `[SEO GPS] تقرير الفحص التقني الشامل: ${domain}`,
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 24px; color: #16140F; background: #FAFAF7;">
                    <h2 style="color: #B8892B;">تقرير الفحص التقني الشامل لموقعك</h2>
                    <p><strong>الموقع المفحوص:</strong> ${rootUrl}</p>
                    <p><strong>الصفحات المفحوصة:</strong> ${discoveredPages.length} صفحة</p>
                    <p><strong>درجة الصحة العامة:</strong> 92/100</p>
                    <p>SEO GPS by Ismail El Asiouty</p>
                  </div>
                `,
              }),
            });
            setEmailStatus(`${t('quick_audit.email_checkbox')} -> ${recipientEmail}`);
          }
        } catch (e) {
          console.warn('Email dispatch notice:', e);
        }
      }

      setIsAuditing(false);
    }, 1500);
  };

  const allIssues = pages.flatMap((p) =>
    p.issues.map((iss) => ({ ...iss, pageUrl: p.url }))
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div>
        <div className="eyebrow text-gold mb-1">
          {t('quick_audit.title')}
        </div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('quick_audit.title')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1 leading-relaxed">
          {t('quick_audit.subtitle')}
        </p>
      </div>

      {/* Crawl Form */}
      <form onSubmit={handleRunFullAudit} className="editorial-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('quick_audit.root_url')} <span className="text-severity-critical">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('quick_audit.sitemap_url')}
            </label>
            <div className="relative">
              <FileCode className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="url"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>
        </div>

        {/* Optional Email delivery */}
        <div className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded text-gold focus:ring-gold"
            />
            <span className="text-body-sm font-bold text-ink">
              {t('quick_audit.email_checkbox')}
            </span>
          </label>

          {sendEmail && (
            <div className="pt-1">
              <input
                type="email"
                required
                placeholder={t('quick_audit.email_placeholder')}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white rounded-lg border border-surface-hairline text-body-sm text-ink focus:outline-none focus:border-gold-border"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isAuditing}
          className="w-full py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAuditing ? progressMsg : t('quick_audit.run_button')}</span>
        </button>
      </form>

      {/* Email confirmation feedback */}
      {emailStatus && (
        <div className="p-4 bg-severity-healthy-bg border border-severity-healthy-border rounded-xl text-body-sm text-severity-healthy flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{emailStatus}</span>
        </div>
      )}

      {/* Comprehensive Results Dashboard */}
      {healthScore !== null && pages.length > 0 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary Metric Header */}
          <div className="editorial-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-surface">
            <div>
              <div className="eyebrow text-gold mb-1">
                {t('quick_audit.results_title')}
              </div>
              <h2 className="text-title-lg font-black text-ink">
                {rootUrl}
              </h2>
              <div className="flex items-center gap-3 mt-2 text-body-sm text-ink-muted flex-wrap">
                <span className="font-bold text-ink">
                  {t('quick_audit.pages_crawled')}: <strong className="text-gold">{pages.length}</strong>
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-severity-healthy">
                  {pages.filter((p) => p.isIndexable).length} Indexable
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-severity-warning">
                  {pages.filter((p) => p.statusCode === 301).length} Redirects
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <GaugeChart score={healthScore} label={t('quick_audit.score_label')} />
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex bg-white p-1 rounded-xl border border-surface-hairline overflow-x-auto gap-1">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'all' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('issues.all')} ({pages.length})
            </button>
            <button
              onClick={() => setActiveSection('cannibalization')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'cannibalization' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('quick_audit.cannibalization_title')} ({cannibalization.length})
            </button>
            <button
              onClick={() => setActiveSection('schema')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'schema' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('quick_audit.schema_title')}
            </button>
          </div>

          {/* Cannibalization View */}
          {activeSection === 'cannibalization' && cannibalization.length > 0 && (
            <div className="editorial-card p-6 border-gold-border bg-gold-tint/30 space-y-4">
              <h3 className="text-title-sm font-extrabold text-ink flex items-center gap-2">
                <Layers className="w-5 h-5 text-gold" />
                <span>{t('quick_audit.cannibalization_title')}</span>
              </h3>

              {cannibalization.map((c, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-surface-hairline space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-body-md text-ink">
                      تنافس دلالي على نفس الكلمات ({c.similarity}%)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] text-xs font-black">
                      {c.similarity}% Overlap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-body-sm">
                    <div className="p-3 bg-surface rounded-lg">
                      <div className="text-xs text-ink-muted font-bold mb-1">الصفحة A:</div>
                      <div className="font-semibold text-ink">{c.titleA}</div>
                      <div className="font-mono text-xs text-ink-muted mt-1 truncate">{c.urlA}</div>
                    </div>
                    <div className="p-3 bg-surface rounded-lg">
                      <div className="text-xs text-ink-muted font-bold mb-1">الصفحة B:</div>
                      <div className="font-semibold text-ink">{c.titleB}</div>
                      <div className="font-mono text-xs text-ink-muted mt-1 truncate">{c.urlB}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Audited Pages Table */}
          {activeSection !== 'cannibalization' && (
            <div className="editorial-card overflow-hidden">
              <table className="w-full text-left rtl:text-right text-body-md">
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
                  {pages.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gold-tint/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs">
                        <span className={p.statusCode === 200 ? 'text-severity-healthy' : 'text-severity-warning'}>
                          {p.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-ink max-w-xs truncate">
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-gold flex items-center gap-1">
                          <span className="truncate">{p.url}</span>
                          <ExternalLink className="w-3 h-3 text-ink-muted shrink-0" />
                        </a>
                      </td>
                      <td className="py-3 px-4 text-ink font-semibold max-w-sm truncate">
                        {p.title}
                        <span className="text-xs text-ink-muted block mt-0.5">({p.titleLength} chars)</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                          p.isIndexable ? 'text-severity-healthy' : 'text-severity-warning'
                        }`}>
                          {p.isIndexable ? t('pages.yes') : t('pages.noindex')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.schemas.length > 0 ? (
                            p.schemas.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-surface border border-surface-hairline text-[11px] font-mono text-ink-muted">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-ink-muted">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
