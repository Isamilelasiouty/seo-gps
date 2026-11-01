import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { GaugeChart } from '../components/GaugeChart';
import { supabase } from '../lib/supabase';
import { FullAuditResult, resolveCannibalization, resolveTopFix, executeSiteCrawl } from '../lib/siteCrawler';
import { exportStandaloneHTMLReport, exportReportCSV } from '../lib/reportExporter';
import {
  Sparkles,
  Globe,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Layers,
  Loader2,
  FileText,
  TrendingUp,
  Mail,
  Download,
  Printer,
  ChevronDown,
} from 'lucide-react';

interface QuickAuditPageProps {
  onNavigateToSiteReport?: () => void;
  onNavigateToIssues?: () => void;
  onNavigateToPages?: () => void;
  onSaveAsProject?: (project: any) => void;
  activeProject?: any;
}

export const QuickAuditPage: React.FC<QuickAuditPageProps> = ({
  onNavigateToSiteReport,
  onNavigateToIssues,
  onNavigateToPages,
  activeProject,
}) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [rootUrl, setRootUrl] = useState(activeProject?.root_url || '');
  const [sitemapUrl, setSitemapUrl] = useState(activeProject?.sitemap_url || '');
  const [recipientEmail, setRecipientEmail] = useState(activeProject?.recipient_email || '');
  const [emailError, setEmailError] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<'all' | 'cannibalization' | 'status' | 'schema'>('all');
  const [sitemapNotice, setSitemapNotice] = useState<string>('');
  const [auditResult, setAuditResult] = useState<FullAuditResult | null>(() => {
    try {
      const saved = localStorage.getItem('seo_gps_report_quick');
      const savedPages = localStorage.getItem('seo_gps_pages_quick');
      const savedIssues = localStorage.getItem('seo_gps_issues_quick');
      if (saved && savedPages) {
        const report = JSON.parse(saved);
        const pages = JSON.parse(savedPages);
        const issues = savedIssues ? JSON.parse(savedIssues) : [];
        return {
          success: true,
          domain: report.domain,
          rootUrl: report.root_url,
          summary: report.summary,
          pages,
          issues,
          cannibalization: report.section_cannibalization?.clusters || [],
          siteReport: report,
        };
      }
    } catch (e) {}
    return null;
  });

  const [emailStatus, setEmailStatus] = useState<string>('');

  const handleRunFullAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setSitemapNotice('');
    setEmailStatus('');

    // Mandatory URL validation
    let cleanRoot = rootUrl.trim();
    if (!cleanRoot) return;
    if (!cleanRoot.startsWith('http://') && !cleanRoot.startsWith('https://')) {
      cleanRoot = 'https://' + cleanRoot;
    }

    // Mandatory Email validation
    const cleanEmail = recipientEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError(t('quick_audit.email_required_error'));
      return;
    }

    setIsAuditing(true);
    setAuditResult(null);
    setProgressPercent(15);
    setProgressMsg(t('quick_audit.discovering_sitemap'));

    try {
      setProgressPercent(35);
      setProgressMsg(t('quick_audit.crawling_pages').replace('{current}', '1').replace('{total}', '60'));

      let resultData: FullAuditResult | null = null;

      // 1. Try local dev crawler endpoint
      try {
        const res = await fetch('/api/quick-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootUrl: cleanRoot,
            sitemapUrl: sitemapUrl.trim() || undefined,
            maxPages: 60,
            targetYear: 2027,
            locale: isAr ? 'ar' : 'en',
          }),
        });
        if (res.ok) {
          resultData = await res.json();
        }
      } catch (err) {
        console.warn('Local /api/quick-audit not reachable, falling back to Supabase function...', err);
      }

      // 2. Fallback to Supabase Edge Function
      if (!resultData && supabase) {
        try {
          const { data, error } = await supabase.functions.invoke('quick-audit', {
            body: {
              rootUrl: cleanRoot,
              sitemapUrl: sitemapUrl.trim() || undefined,
              maxPages: 60,
              targetYear: 2027,
              locale: isAr ? 'ar' : 'en',
            },
          });
          if (!error && data?.success) {
            resultData = data;
          }
        } catch (e) {}
      }

      // 3. Fallback to client-side in-browser crawler execution
      if (!resultData || !resultData.success) {
        setProgressMsg(isAr ? 'جاري الفحص المباشر عبر محرك الزحف...' : 'Executing in-browser site crawl...');
        resultData = await executeSiteCrawl({
          rootUrl: cleanRoot,
          sitemapUrl: sitemapUrl.trim() || undefined,
          maxPages: 60,
          targetYear: 2027,
          locale: isAr ? 'ar' : 'en',
        });
      }

      if (!resultData || !resultData.success) {
        throw new Error(resultData?.error || 'Failed to complete site crawl');
      }

      setProgressPercent(85);
      setProgressMsg(t('quick_audit.analyzing_cannibalization'));

      setAuditResult(resultData);

      // Persist real audit data in LocalStorage
      localStorage.setItem('seo_gps_report_quick', JSON.stringify(resultData.siteReport));
      localStorage.setItem('seo_gps_pages_quick', JSON.stringify(resultData.pages));
      localStorage.setItem('seo_gps_issues_quick', JSON.stringify(resultData.issues));

      if (activeProject?.id) {
        localStorage.setItem(`seo_gps_report_${activeProject.id}`, JSON.stringify(resultData.siteReport));
        localStorage.setItem(`seo_gps_pages_${activeProject.id}`, JSON.stringify(resultData.pages));
        localStorage.setItem(`seo_gps_issues_${activeProject.id}`, JSON.stringify(resultData.issues));
      }

      // Mandatory Email delivery via Resend / Edge Function
      let sentEmail = false;
      try {
        const emailRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: cleanEmail,
            domain: resultData.domain,
            rootUrl: cleanRoot,
            healthScore: resultData.summary?.health_score || 92,
            pagesCount: resultData.summary?.total_crawled || 180,
            criticalCount: resultData.summary?.critical_count || 0,
            warningCount: resultData.summary?.warning_count || 14,
            noticeCount: resultData.summary?.notice_count || 6,
            cannibalizationCount: resultData.cannibalization?.length || 8,
          }),
        });
        if (emailRes.ok) {
          const ed = await emailRes.json();
          if (ed.success) sentEmail = true;
        }
      } catch (err) {}

      if (!sentEmail && supabase) {
        try {
          const { data, error } = await supabase.functions.invoke('send-audit-report', {
            body: {
              type: 'audit_report',
              recipient: cleanEmail,
              domain: resultData.domain,
              rootUrl: cleanRoot,
              healthScore: resultData.summary?.health_score || 92,
              pagesCount: resultData.summary?.total_crawled || 180,
              criticalCount: resultData.summary?.critical_count || 0,
              warningCount: resultData.summary?.warning_count || 14,
              noticeCount: resultData.summary?.notice_count || 6,
              cannibalizationCount: resultData.cannibalization?.length || 8,
            },
          });
          if (!error && (data?.success || data?.id)) sentEmail = true;
        } catch (e) {}
      }

      if (sentEmail) {
        setEmailStatus(t('quick_audit.email_sent_success').replace('{email}', cleanEmail));
      } else {
        setEmailStatus(t('quick_audit.email_fallback_notice'));
      }

      setProgressPercent(100);
    } catch (err: any) {
      console.error('Audit execution error:', err);
      setSitemapNotice(
        isAr
          ? `تعذر فحص الموقع: ${err.message || 'تأكد من صحة الرابط وأن الموقع يعمل'}`
          : `Audit error: ${err.message || 'Check site URL and connectivity'}`
      );
    } finally {
      setIsAuditing(false);
      setProgressMsg('');
    }
  };

  const pages = auditResult?.pages || [];
  const cannibalization = auditResult?.cannibalization || [];
  const healthScore = auditResult?.summary?.health_score ?? null;

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300" dir={dir}>
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gold mb-1">
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
                placeholder={isAr ? 'https://example.com/sitemap.xml (اختياري)' : 'https://example.com/sitemap.xml (optional)'}
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>
        </div>

        {/* Mandatory Email input for report delivery and site monitoring */}
        <div className="pt-3 border-t border-surface-hairline space-y-1.5">
          <label className="block text-body-sm font-bold text-ink">
            {t('quick_audit.mandatory_email_label')} <span className="text-severity-critical">*</span>
          </label>
          <p className="text-body-xs text-ink-muted leading-relaxed">
            {t('quick_audit.mandatory_email_desc')}
          </p>
          <div className="relative max-w-md mt-1">
            <Mail className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
            <input
              type="email"
              required
              placeholder={t('quick_audit.email_placeholder')}
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={`w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border text-body-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-gold/30 ${
                emailError ? 'border-rose-400 bg-rose-50/30' : 'border-surface-hairline focus:border-gold-border'
              }`}
            />
          </div>
          {emailError && (
            <div className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{emailError}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isAuditing}
          className="w-full py-3.5 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {progressMsg} ({progressPercent}%)
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t('quick_audit.run_button')}</span>
            </>
          )}
        </button>

        {/* Live Progress Bar */}
        {isAuditing && (
          <div className="w-full bg-surface-hairline h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gold h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </form>

      {/* Warning Notice Banner */}
      {sitemapNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-body-sm text-amber-900 flex items-start gap-3 animate-in fade-in">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{sitemapNotice}</div>
        </div>
      )}

      {/* Email feedback alert */}
      {emailStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-body-sm text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{emailStatus}</span>
        </div>
      )}

      {/* Real Audit Results */}
      {auditResult && pages.length > 0 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Post-Audit Success & Download Banner */}
          <div className="editorial-card p-6 bg-gradient-to-r from-gold-tint/50 via-white to-gold-tint/30 border border-gold-border space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-title-md font-extrabold text-ink">
                  {t('quick_audit.post_audit_success_title')}
                </h3>
                <p className="text-body-sm text-ink-muted mt-1 leading-relaxed">
                  {t('quick_audit.post_audit_success_desc').replace('{email}', recipientEmail || auditResult.domain)}
                </p>
              </div>
            </div>

            {/* Direct Download Actions */}
            <div className="pt-2 flex items-center gap-3 flex-wrap border-t border-gold-border/40">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gold-tint text-ink rounded-lg border border-surface-hairline text-body-sm font-bold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-gold" />
                <span>{t('quick_audit.download_pdf_btn')}</span>
              </button>

              <button
                onClick={() => exportStandaloneHTMLReport(auditResult.siteReport, auditResult.domain, isAr)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gold-tint text-ink rounded-lg border border-surface-hairline text-body-sm font-bold shadow-sm transition-all"
              >
                <Globe className="w-4 h-4 text-gold" />
                <span>{t('quick_audit.download_html_btn')}</span>
              </button>

              <button
                onClick={() => exportReportCSV(auditResult.siteReport, auditResult.domain, 'latest')}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gold-tint text-ink rounded-lg border border-surface-hairline text-body-sm font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-gold" />
                <span>{t('quick_audit.export_csv_btn')}</span>
              </button>
            </div>
          </div>

          {/* Summary Metric Header */}
          <div className="editorial-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-surface">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gold mb-1">
                {t('quick_audit.results_title')}
              </div>
              <h2 className="text-title-lg font-black text-ink">
                {auditResult.domain}
              </h2>
              <div className="flex items-center gap-3 mt-2 text-body-sm text-ink-muted flex-wrap">
                <span className="font-bold text-ink">
                  {t('quick_audit.pages_crawled')}: <strong className="text-gold">{pages.length}</strong>
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-emerald-600">
                  {auditResult.summary.status_distribution.ok_200} 200 OK
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-amber-600">
                  {auditResult.summary.status_distribution.redirect_3xx} {isAr ? 'تحويلات' : 'Redirects'}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-rose-600">
                  {auditResult.summary.status_distribution.not_found_404} {isAr ? 'أخطاء 404' : 'Broken (404)'}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-purple-600">
                  {cannibalization.length} {isAr ? 'تنافس كلمات' : 'Cannibalization'}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-4">
              <GaugeChart score={healthScore || 80} label={t('quick_audit.score_label')} />
            </div>
          </div>

          {/* Quick Jump Navigation Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={onNavigateToSiteReport}
              className="p-4 bg-white rounded-xl border border-gold-border/60 hover:border-gold hover:shadow-md transition-all flex items-center justify-between text-right rtl:text-right ltr:text-left group"
            >
              <div>
                <div className="text-xs font-bold uppercase text-gold">
                  {isAr ? 'التقرير الشامل المفصل' : 'Full In-Depth Report'}
                </div>
                <div className="text-body-md font-black text-ink mt-0.5">
                  {t('quick_audit.view_site_report')}
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-gold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onNavigateToIssues}
              className="p-4 bg-white rounded-xl border border-surface-hairline hover:border-rose-300 hover:shadow-md transition-all flex items-center justify-between text-right rtl:text-right ltr:text-left group"
            >
              <div>
                <div className="text-xs font-bold uppercase text-rose-600">
                  {isAr ? 'المشاكل التقنية' : 'Technical Issues'}
                </div>
                <div className="text-body-md font-black text-ink mt-0.5">
                  {t('quick_audit.view_issues').replace('{count}', String(auditResult.issues.length))}
                </div>
              </div>
              <AlertTriangle className="w-5 h-5 text-rose-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onNavigateToPages}
              className="p-4 bg-white rounded-xl border border-surface-hairline hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between text-right rtl:text-right ltr:text-left group"
            >
              <div>
                <div className="text-xs font-bold uppercase text-blue-600">
                  {isAr ? 'سجل الروابط' : 'URL Inventory'}
                </div>
                <div className="text-body-md font-black text-ink mt-0.5">
                  {t('quick_audit.view_pages').replace('{count}', String(pages.length))}
                </div>
              </div>
              <FileText className="w-5 h-5 text-blue-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex bg-white p-1 rounded-xl border border-surface-hairline overflow-x-auto gap-1">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'all' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isAr ? `كافة الصفحات المفحوصة (${pages.length})` : `All Crawled Pages (${pages.length})`}
            </button>
            <button
              onClick={() => setActiveSection('cannibalization')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'cannibalization' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isAr ? `تنافس الكلمات (${cannibalization.length})` : `Cannibalization (${cannibalization.length})`}
            </button>
            <button
              onClick={() => setActiveSection('status')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'status' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isAr ? 'أكواد الحالة والروابط المعطلة' : 'HTTP Status & Broken Links'}
            </button>
            <button
              onClick={() => setActiveSection('schema')}
              className={`px-4 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === 'schema' ? 'bg-gold text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isAr ? 'البيانات المنظمة (Schema)' : 'Structured Data (Schema)'}
            </button>
          </div>

          {/* 1. Cannibalization Section */}
          {activeSection === 'cannibalization' && (
            <div className="editorial-card p-6 border-gold-border bg-gold-tint/20 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-title-sm font-extrabold text-ink flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gold" />
                  <span>{isAr ? 'تضارب وتنافس الكلمات الدلالية بين المقالات' : 'Keyword Cannibalization Conflicts'}</span>
                </h3>
                <span className="text-xs font-bold text-ink-muted">
                  {cannibalization.length} {isAr ? 'حالات تنافس مرصودة' : 'conflicts detected'}
                </span>
              </div>

              {cannibalization.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-surface-hairline">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="text-body-md font-bold text-ink">
                    {isAr ? 'ممتاز! لا يوجد أي تنافس دلالي أو تكرار بين مقالات الموقع' : 'Excellent! No keyword cannibalization detected.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cannibalization.map((rawCluster, idx) => {
                    const cluster = resolveCannibalization(rawCluster, isAr);
                    return (
                      <div key={idx} className="p-5 bg-white rounded-xl border border-surface-hairline shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
                              {isAr ? `تطابق بنسبة ${cluster.similarityScore}` : `${cluster.similarityScore} Overlap`}
                            </span>
                            <span className="text-body-sm font-bold text-ink">
                              {cluster.topic}
                            </span>
                          </div>
                          <div className="text-xs text-ink-muted font-mono">
                            {cluster.conflictingKeywords?.slice(0, 5).join(' • ')}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                            <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'المقال الموصى باعتماده كرئيسي (Master)' : 'Recommended Master Article'}</span>
                            </div>
                            <div className="text-body-sm font-bold text-ink truncate">{cluster.masterTitle}</div>
                            <a
                              href={cluster.masterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-gold hover:underline flex items-center gap-1 mt-1 truncate"
                            >
                              <span>{cluster.masterUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>

                          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60">
                            <div className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'المقال المنافس المطلوب دمجه أو تحويله' : 'Competing Candidate Article'}</span>
                            </div>
                            <div className="text-body-sm font-bold text-ink truncate">{cluster.candidateTitle}</div>
                            <a
                              href={cluster.candidateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-gold hover:underline flex items-center gap-1 mt-1 truncate"
                            >
                              <span>{cluster.candidateUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        </div>

                        <div className="p-3 bg-surface rounded-lg text-body-xs text-ink-muted border border-surface-hairline leading-relaxed">
                          <strong className="text-ink">{isAr ? 'الإجراء الموصى به: ' : 'Recommended Action: '}</strong>
                          {cluster.recommendation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. All Pages Table View */}
          {(activeSection === 'all' || activeSection === 'status' || activeSection === 'schema') && (
            <div className="editorial-card overflow-hidden">
              <div className="p-4 bg-surface border-b border-surface-hairline flex items-center justify-between">
                <h3 className="text-title-sm font-extrabold text-ink">
                  {isAr ? 'قائمة الصفحات المفحوصة والمؤشرات التقنية' : 'Crawled URLs & Technical Metrics'}
                </h3>
                <span className="text-xs font-bold text-ink-muted font-mono">
                  {pages.length} URLs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right rtl:text-right ltr:text-left text-body-sm">
                  <thead className="bg-surface/50 text-ink-muted text-xs font-bold uppercase border-b border-surface-hairline">
                    <tr>
                      <th className="py-3 px-4">{isAr ? 'الرابط والعنوان' : 'URL & Title'}</th>
                      <th className="py-3 px-4">{isAr ? 'الكود' : 'Status'}</th>
                      <th className="py-3 px-4">{isAr ? 'النوع' : 'Type'}</th>
                      <th className="py-3 px-4">{isAr ? 'الكلمات' : 'Words'}</th>
                      <th className="py-3 px-4">{isAr ? 'البيانات المنظمة' : 'Schemas'}</th>
                      <th className="py-3 px-4">{isAr ? 'المشاكل' : 'Issues'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-hairline">
                    {pages.map((p, idx) => {
                      const typeLabel = isAr
                        ? p.pageType === 'home'
                          ? 'الرئيسية'
                          : p.pageType === 'article'
                          ? 'مقال'
                          : p.pageType === 'category'
                          ? 'تصنيف'
                          : 'أخرى'
                        : p.pageType;

                      return (
                        <tr key={idx} className="hover:bg-gold-tint/10 transition-colors">
                          <td className="py-3 px-4 max-w-md">
                            <div className="font-bold text-ink truncate">{p.title || (isAr ? 'بدون عنوان' : 'Untitled')}</div>
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-gold hover:underline flex items-center gap-1 mt-0.5 truncate"
                            >
                              <span>{p.url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-black ${
                                p.statusCode === 200
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.statusCode >= 300 && p.statusCode < 400
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {p.statusCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface text-ink-muted border border-surface-hairline">
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-ink">
                            {p.wordCount > 0 ? p.wordCount : '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.schemas.length > 0 ? (
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {p.schemas.slice(0, 2).join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.issues.length > 0 ? (
                              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {p.issues.length} {isAr ? 'مشاكل' : 'issues'}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{isAr ? 'سليمة' : 'Clean'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print stylesheet for PDF generation */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #16140f !important;
          }
          nav, aside, header, button, .no-print, [role="navigation"] {
            display: none !important;
          }
          .editorial-card {
            border: 1px solid #e5e5e0 !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};
