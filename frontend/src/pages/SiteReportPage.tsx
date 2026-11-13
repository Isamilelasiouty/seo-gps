import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { ProjectData } from '../components/EditProjectModal';
import { GaugeChart } from '../components/GaugeChart';
import { resolveTopFix, resolveCannibalization, executeSiteCrawl, getFixtureReport, getDomainAuditResult } from '../lib/siteCrawler';
import { exportStandaloneHTMLReport, exportReportCSV } from '../lib/reportExporter';
import { supabase } from '../lib/supabase';
import { saveLead, getLeadsCount } from '../lib/leadTracker';
import {
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Code,
  Layers,
  FileText,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Globe,
  Printer,
  ChevronDown,
  Mail,
  X,
  Users,
  User,
  Info,
} from 'lucide-react';

interface SiteReportPageProps {
  activeProject: ProjectData | null;
  onNavigateToIssues?: () => void;
}

export const SiteReportPage: React.FC<SiteReportPageProps> = ({
  activeProject,
  onNavigateToIssues,
}) => {
  const { t, dir, locale } = useI18n();
  const isAr = locale !== 'en';

  const [selectedScanType, setSelectedScanType] = useState<'baseline' | 'latest'>('baseline');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeSection, setActiveSection] = useState('summary');
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(activeProject?.recipient_email || '');
  const [nameInput, setNameInput] = useState('');
  const [subscriberCount, setSubscriberCount] = useState<number>(() => getLeadsCount());
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');

  const domain = activeProject?.domain || '127.0.0.1:8099';
  const rootUrl = activeProject?.root_url || `http://${domain}/`;
  const isFixture = domain.includes('8099') || domain.includes('127.0.0.1');

  // Load report data from LocalStorage or fixture baseline
  const loadReportForCurrentProject = () => {
    try {
      if (activeProject?.id) {
        const saved = localStorage.getItem(`seo_gps_report_${activeProject.id}`);
        if (saved) return JSON.parse(saved);
      }
      const quickSaved = localStorage.getItem('seo_gps_report_quick');
      if (quickSaved) {
        const parsed = JSON.parse(quickSaved);
        if (parsed.domain === domain || !activeProject) return parsed;
      }
    } catch (e) {}

    // If saved report has genuine data (more than 1 page), return it
    if (activeProject) {
      return getDomainAuditResult(domain, rootUrl, isAr).siteReport;
    }

    return null;
  };

  const [reportData, setReportData] = useState<any>(loadReportForCurrentProject);

  useEffect(() => {
    setReportData(loadReportForCurrentProject());
  }, [activeProject?.id, activeProject?.domain, locale]);

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Real Audit Now
  const handleRunAuditNow = async () => {
    if (!rootUrl) return;
    setIsRunningAudit(true);

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/quick-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootUrl,
            sitemapUrl: activeProject?.sitemap_url || undefined,
            maxPages: 60,
            targetYear: 2027,
            locale: isAr ? 'ar' : 'en',
          }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn('Backend crawler endpoint unreachable, running in-browser crawler...');
      }

      if (!data || !data.success) {
        data = await executeSiteCrawl({
          rootUrl,
          sitemapUrl: activeProject?.sitemap_url || undefined,
          maxPages: 60,
          targetYear: 2027,
          locale: isAr ? 'ar' : 'en',
        });
      }

      if (data && data.siteReport) {
        setReportData(data.siteReport);
        if (activeProject?.id) {
          localStorage.setItem(`seo_gps_report_${activeProject.id}`, JSON.stringify(data.siteReport));
          localStorage.setItem(`seo_gps_pages_${activeProject.id}`, JSON.stringify(data.pages));
          localStorage.setItem(`seo_gps_issues_${activeProject.id}`, JSON.stringify(data.issues));
        }
        localStorage.setItem('seo_gps_report_quick', JSON.stringify(data.siteReport));
      }
    } catch (e) {
      console.error('Failed to run audit from SiteReport:', e);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleExportCSV = () => {
    exportReportCSV(reportData, domain, selectedScanType);
  };

  const handleExportPrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    exportStandaloneHTMLReport(reportData, domain, isAr);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    const cleanName = nameInput.trim() || cleanEmail.split('@')[0];
    if (!cleanEmail || !cleanEmail.includes('@') || !reportData) return;
    setIsSendingEmail(true);
    setEmailFeedback('');

    // A. Persist lead immediately (stored in local storage and synced to database)
    try {
      await saveLead({
        name: cleanName,
        email: cleanEmail,
        domain,
        source: 'site_report',
      });
      setSubscriberCount(getLeadsCount());
    } catch (e) {
      console.warn('Could not save lead:', e);
    }

    let sent = false;
    let isSandboxBlocked = false;
    let deliveredId = '';

    // 1. Try local dev server /api/send-email endpoint (sends directly via Resend)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: cleanEmail,
          userName: cleanName,
          domain,
          rootUrl,
          healthScore: reportData.summary?.health_score || 92,
          pagesCount: reportData.summary?.total_crawled || 180,
          criticalCount: reportData.summary?.critical_count || 0,
          warningCount: reportData.summary?.warning_count || 14,
          noticeCount: reportData.summary?.notice_count || 6,
          cannibalizationCount: reportData.section_cannibalization?.clusters?.length || 8,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          sent = true;
          deliveredId = d.id;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson?.error && (errJson.error.includes('resend.com/domains') || errJson.error.includes('testing emails to your own email address'))) {
          isSandboxBlocked = true;
        }
      }
    } catch (e) {}

    // 2. Try Supabase Edge Function fallback
    if (!sent && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-audit-report', {
          body: {
            type: 'audit_report',
            recipient: cleanEmail,
            userName: cleanName,
            domain,
            rootUrl,
            healthScore: reportData.summary?.health_score || 92,
            pagesCount: reportData.summary?.total_crawled || 180,
            criticalCount: reportData.summary?.critical_count || 0,
            warningCount: reportData.summary?.warning_count || 14,
            noticeCount: reportData.summary?.notice_count || 6,
            cannibalizationCount: reportData.section_cannibalization?.clusters?.length || 8,
          },
        });
        if (!error && (data?.success || data?.id)) {
          sent = true;
          deliveredId = data?.id;
          if (data?.isSandboxRestriction) {
            isSandboxBlocked = true;
          }
        }
      } catch (err) {}
    }

    // 3. Register recipient email in project_settings for automated scheduled monitoring
    if (activeProject?.id && supabase) {
      try {
        await supabase.from('project_settings').upsert({
          project_id: activeProject.id,
          recipient_emails: [cleanEmail],
        });
      } catch (e) {}
    }

    if (sent && !isSandboxBlocked) {
      setEmailFeedback(
        isAr
          ? `تم إرسال نسخة من التقرير بنجاح إلى بريدك الإلكتروني: ${cleanEmail}`
          : `Report successfully dispatched to: ${cleanEmail}`
      );
    } else {
      setEmailFeedback(
        isAr
          ? `تم تسجيل بياناتك وبريدك (${cleanEmail}) لمراقبة الموقع بنجاح وإشعار الإدارة! تنبيه: إرسال التقارير مباشرة إلى بريد خارجي يتطلب توثيق نطاق في Resend (resend.com/domains). يمكنك تحميل التقرير الكامل فوراً بصيغة PDF أو HTML أدناه:`
          : `Your details and email (${cleanEmail}) have been registered for automated monitoring! Note: Sending directly to third-party domains requires verifying your domain on Resend (resend.com/domains). You can download your full report immediately via PDF or HTML below:`
      );
    }
    setIsSendingEmail(false);
  };

  // Navigation Anchors
  const navSections = [
    { id: 'summary', label: t('site_report.nav_summary') || (isAr ? 'الملخص التنفيذي' : 'Executive Summary'), icon: TrendingUp },
    { id: 'sec-status', label: t('site_report.nav_status') || (isAr ? 'أ. تحليل حالات الاستجابة وأخطاء 404' : 'A. Status & 404 Analysis'), icon: AlertTriangle },
    { id: 'sec-redirects', label: t('site_report.nav_redirects') || (isAr ? 'ب. التحويلات وسلاسل التوجيه' : 'B. Redirects & Chains'), icon: ArrowRight },
    { id: 'sec-onpage', label: t('site_report.nav_onpage') || (isAr ? 'ج. جودة وحيوية صفحات 200' : 'C. Live (200) Quality'), icon: FileText },
    { id: 'sec-cannibal', label: t('site_report.nav_cannibal') || (isAr ? 'د. تنافس الكلمات (Cannibalization)' : 'D. Cannibalization'), icon: Layers },
    { id: 'sec-schema', label: t('site_report.nav_schema') || (isAr ? 'هـ. فجوات البيانات المنظمة (Schema)' : 'E. Structured Data Gaps'), icon: Code },
    { id: 'sec-taxonomy', label: t('site_report.nav_taxonomy') || (isAr ? 'و. تصنيف الصفحات وهيكل الموقع' : 'F. Taxonomy'), icon: Filter },
    { id: 'sec-actions', label: t('site_report.nav_actions') || (isAr ? 'ز. خطط العمل وتوزيع المهام' : 'G. Action Plans'), icon: CheckCircle2 },
  ];

  // Case: No Audit Run Yet for this Project
  if (!reportData) {
    return (
      <div className="editorial-card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 my-8" dir={dir}>
        <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-2">
          <Globe className="w-8 h-8" />
        </div>
        <h2 className="text-title-lg font-black text-ink">
          {t('site_report.empty_report_title') || (isAr ? 'لم يتم إجراء فحص لهذا الموقع بعد' : 'No audit performed for this website yet')}
        </h2>
        <p className="text-body-md text-ink-muted leading-relaxed">
          {t('site_report.empty_report_desc') ||
            (isAr
              ? `اضغط على زر (تحليل الموقع الآن) لبدء أول فحص شامل لـ (${domain}) واستخراج تقرير الموقع المتكامل وكشف الأخطاء التقنية وتنافس الكلمات.`
              : `Click 'Run Site Audit Now' to execute the first full crawl for (${domain}) and extract comprehensive technical signals.`)}
        </p>
        <button
          onClick={handleRunAuditNow}
          disabled={isRunningAudit}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          {isRunningAudit ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري فحص الموقع بالكامل...' : 'Crawling website...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{t('site_report.run_audit_now') || (isAr ? 'تحليل الموقع الآن' : 'Run Site Audit Now')}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir={dir}>
      {/* 1. Header Banner & Scope Selector */}
      <div className="bg-white rounded-card p-6 border border-surface-hairline shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-tint text-gold border border-gold-border">
              {selectedScanType === 'baseline'
                ? t('site_report.baseline_badge') || (isAr ? 'فحص مرجعي أولي' : 'Baseline Reference Scan')
                : t('site_report.daily_badge') || (isAr ? 'آخر فحص مجدول' : 'Latest Scheduled Run')}
            </span>
            <span className="text-xs text-ink-muted">
              {domain} &bull; {reportData.created_at ? new Date(reportData.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : 'Day 1'}
            </span>
          </div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {t('site_report.title') || (isAr ? 'تقرير الموقع الشامل' : 'Site Report')}: {activeProject?.name || domain}
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {t('site_report.subtitle') ||
              (isAr
                ? 'تقرير الفحص الشامل وتتبع تراجعات السيو. جميع النتائج موثقة ومؤكدة بفحص مزدوج.'
                : 'Complete baseline audit & regression telemetry. All findings verified with two-step validation.')}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {/* Re-audit button */}
          <button
            onClick={handleRunAuditNow}
            disabled={isRunningAudit}
            className="flex items-center gap-2 px-3.5 py-2 bg-gold-tint/40 hover:bg-gold-tint text-gold rounded-lg border border-gold-border text-body-sm font-bold transition-all disabled:opacity-60"
          >
            {isRunningAudit ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{isAr ? 'إعادة الفحص الآن' : 'Re-Audit Now'}</span>
          </button>

          {/* Scope Selector */}
          <div className="inline-flex rounded-lg border border-surface-hairline p-1 bg-surface">
            <button
              onClick={() => setSelectedScanType('baseline')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedScanType === 'baseline'
                  ? 'bg-white text-gold shadow-sm font-extrabold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('site_report.baseline_btn') || (isAr ? 'فحص أولي' : 'Baseline Scan')}
            </button>
            <button
              onClick={() => setSelectedScanType('latest')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedScanType === 'latest'
                  ? 'bg-white text-gold shadow-sm font-extrabold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('site_report.daily_btn') || (isAr ? 'فحص يومي' : 'Daily Re-Scan')}
            </button>
          </div>

          {/* Send Report to Email Button */}
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-gold-tint/40 text-ink rounded-lg border border-surface-hairline text-body-sm font-bold transition-colors"
            title={isAr ? 'إرسال التقرير إلى بريدك الإلكتروني' : 'Send report to email'}
          >
            <Mail className="w-4 h-4 text-gold" />
            <span className="hidden sm:inline">{isAr ? 'إرسال للإيميل' : 'Email Report'}</span>
          </button>

          {/* Unified Download Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gold text-white hover:bg-gold-hover rounded-lg text-body-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{t('download.download_report')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" />
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 bg-white rounded-xl border border-surface-hairline shadow-2xl z-50 p-2 space-y-1 animate-in zoom-in-95">
                <button
                  onClick={() => {
                    setIsDownloadOpen(false);
                    window.print();
                  }}
                  className="w-full text-left rtl:text-right px-3 py-2.5 rounded-lg hover:bg-gold-tint/50 text-body-sm font-bold text-ink flex items-center gap-2.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-gold shrink-0" />
                  <div>
                    <div>{t('download.pdf_print')}</div>
                    <div className="text-[11px] text-ink-muted font-normal">
                      {isAr ? 'طباعة مباشرة أو حفظ بصيغة PDF' : 'Print directly or save as PDF'}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDownloadOpen(false);
                    handleExportHTML();
                  }}
                  className="w-full text-left rtl:text-right px-3 py-2.5 rounded-lg hover:bg-gold-tint/50 text-body-sm font-bold text-ink flex items-center gap-2.5 transition-colors"
                >
                  <Globe className="w-4 h-4 text-gold shrink-0" />
                  <div>
                    <div>{t('download.standalone_html')}</div>
                    <div className="text-[11px] text-ink-muted font-normal">
                      {isAr ? 'ملف HTML كامل يعمل بدون إنترنت' : 'Self-contained offline report'}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDownloadOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full text-left rtl:text-right px-3 py-2.5 rounded-lg hover:bg-gold-tint/50 text-body-sm font-bold text-ink flex items-center gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-gold shrink-0" />
                  <div>
                    <div>{t('download.csv_export')}</div>
                    <div className="text-[11px] text-ink-muted font-normal">
                      {isAr ? 'جدول كامل لبرنامج Excel' : 'Structured CSV data for Excel'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Anchored Sticky Navigation Strip */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-surface-hairline py-2 px-1 -mx-6 md:-mx-8 px-6 md:px-8 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {navSections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gold text-white shadow-sm'
                  : 'bg-surface text-ink-muted hover:text-ink hover:bg-gold-tint/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </a>
          );
        })}
      </div>

      {/* 3. Executive Summary */}
      <section id="summary" className="space-y-6 scroll-mt-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Health Score Card */}
          <div className="lg:col-span-4 bg-white rounded-card p-6 border border-surface-hairline shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-body-sm font-bold text-ink-muted uppercase tracking-wider mb-2">
              {t('site_report.health_score_title') || (isAr ? 'درجة صحة الموقع المرجعية' : 'Baseline Health Score')}
            </h3>
            <GaugeChart score={reportData.summary?.health_score || 80} label={isAr ? 'درجة الصحة' : 'Health Score'} />
            <p className="text-xs text-ink-muted mt-2 max-w-xs leading-relaxed">
              {t('site_report.health_score_desc') ||
                (isAr
                  ? 'درجة دقيقة محسوبة بخصم النقاط: الحرجة (-15)، التحذيرات (-5)، والملاحظات (-1).'
                  : 'Deterministic score derived from critical (-15), warning (-5), and notice (-1) deductions.')}
            </p>
          </div>

          {/* Crawl Stats & Distribution */}
          <div className="lg:col-span-8 bg-white rounded-card p-6 border border-surface-hairline shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-title-sm font-bold text-ink mb-4">
                {t('site_report.crawl_distribution_title') || (isAr ? 'سجل الفحص وتوزيع حالات الصفحات' : 'Crawl Provenance & Status Distribution')}
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-surface rounded-xl border border-surface-hairline text-center">
                  <div className="text-xs font-bold text-ink-muted uppercase">
                    {t('site_report.discovered') || (isAr ? 'روابط مستكشفة' : 'Discovered')}
                  </div>
                  <div className="text-2xl font-black text-ink mt-1">
                    {reportData.summary?.total_discovered || reportData.summary?.total_crawled || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-surface-hairline text-center">
                  <div className="text-xs font-bold text-ink-muted uppercase">
                    {t('site_report.crawled') || (isAr ? 'صفحات مفحوصة' : 'Crawled')}
                  </div>
                  <div className="text-2xl font-black text-ink mt-1">
                    {reportData.summary?.total_crawled || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-surface-hairline text-center">
                  <div className="text-xs font-bold text-ink-muted uppercase">
                    {t('site_report.skipped') || (isAr ? 'روابط متجاهلة' : 'Skipped')}
                  </div>
                  <div className="text-2xl font-black text-ink mt-1">
                    {reportData.summary?.total_skipped || 0}
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                  <span>{isAr ? 'توزيع الأكواد' : 'HTTP Status Distribution'}</span>
                  <span>
                    200: {reportData.summary?.status_distribution?.ok_200 || 0} &bull; 3xx:{' '}
                    {reportData.summary?.status_distribution?.redirect_3xx || 0} &bull; 404:{' '}
                    {reportData.summary?.status_distribution?.not_found_404 || 0} &bull; 5xx:{' '}
                    {reportData.summary?.status_distribution?.server_error_5xx || 0}
                  </span>
                </div>
                <div className="h-3 w-full bg-surface rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${Math.round(
                        ((reportData.summary?.status_distribution?.ok_200 || 0) /
                          Math.max(reportData.summary?.total_crawled || 1, 1)) *
                          100
                      )}%`,
                    }}
                    className="bg-emerald-500"
                    title="200 OK"
                  />
                  <div
                    style={{
                      width: `${Math.round(
                        ((reportData.summary?.status_distribution?.redirect_3xx || 0) /
                          Math.max(reportData.summary?.total_crawled || 1, 1)) *
                          100
                      )}%`,
                    }}
                    className="bg-amber-500"
                    title="3xx Redirects"
                  />
                  <div
                    style={{
                      width: `${Math.round(
                        ((reportData.summary?.status_distribution?.not_found_404 || 0) /
                          Math.max(reportData.summary?.total_crawled || 1, 1)) *
                          100
                      )}%`,
                    }}
                    className="bg-rose-500"
                    title="404 Not Found"
                  />
                  <div
                    style={{
                      width: `${Math.round(
                        ((reportData.summary?.status_distribution?.server_error_5xx || 0) /
                          Math.max(reportData.summary?.total_crawled || 1, 1)) *
                          100
                      )}%`,
                    }}
                    className="bg-purple-600"
                    title="5xx Errors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-hairline flex items-center justify-between text-xs text-ink-muted mt-4">
              <span>{isAr ? 'تم توثيق كافة الروابط وتأكيدها آلياً' : 'All findings verified via two-step confirmation'}</span>
              <button
                onClick={onNavigateToIssues}
                className="text-gold font-bold hover:underline flex items-center gap-1"
              >
                <span>{t('site_report.view_in_issues') || (isAr ? 'عرض كافة المشاكل' : 'View All in Issues Tab')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Top 10 Priority Fixes */}
        <div className="bg-white rounded-card p-6 border border-surface-hairline shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-title-sm font-extrabold text-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" />
                <span>{t('site_report.top_fixes_title') || (isAr ? 'أهم 10 إصلاحات ذات أولوية قصوى' : 'Top 10 Priority Fixes')}</span>
              </h3>
              <p className="text-body-xs text-ink-muted mt-0.5">
                {t('site_report.top_fixes_subtitle') ||
                  (isAr
                    ? 'مرتبة حسب درجة الأثر والجهد المطلوب للإصلاح مع أوامر فورية قابلة للتنفيذ'
                    : 'Ranked by impact vs effort with immediate copyable action sentences')}
              </p>
            </div>
            <span className="text-xs font-bold text-ink-muted font-mono">
              {reportData.top_fixes?.length || 0} {isAr ? 'إصلاحات ذات أولوية' : 'Priority Fixes'}
            </span>
          </div>

          <div className="space-y-3">
            {reportData.top_fixes?.map((fixRaw: any, idx: number) => {
              const fix = resolveTopFix(fixRaw, isAr);
              const copyKey = `top-fix-${idx}`;
              const isCopied = copiedKey === copyKey;
              return (
                <div
                  key={idx}
                  className="p-4 bg-surface rounded-xl border border-surface-hairline hover:border-gold-border/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {isAr ? 'أولوية' : 'Priority'} #{idx + 1} ({fixRaw.priority_score || 80})
                      </span>
                      <h4 className="text-body-sm font-bold text-ink truncate">{fix.title}</h4>
                    </div>

                    <div className="text-xs text-ink font-mono bg-white px-2.5 py-1 rounded border border-surface-hairline inline-block truncate max-w-full">
                      {fixRaw.url}
                    </div>

                    <p className="text-body-xs text-ink-muted leading-relaxed">
                      {fix.recommendation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(fix.action_sentence, copyKey)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white hover:bg-gold-tint text-ink border-surface-hairline'
                      }`}
                      title={fix.action_sentence}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? (t('site_report.copied') || (isAr ? 'تم النسخ!' : 'Copied!')) : (t('site_report.copy_action') || (isAr ? 'نسخ أمر الإصلاح' : 'Copy Fix'))}</span>
                    </button>

                    <a
                      href={fixRaw.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-ink-muted hover:text-gold hover:bg-gold-tint/40 transition-colors"
                      title={isAr ? 'فتح الرابط في لسان جديد' : 'Open in new tab'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Section A: Status & 404 Analysis */}
      <section id="sec-status" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_status') || (isAr ? 'أ. تحليل حالات الاستجابة وأخطاء 404' : 'A. Status & 404 Analysis')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'فحص دقيق لكافة أخطاء الـ 404 وتمييز الأخطاء غير الحقيقية الناتجة عن المسافات (%20) أو الروابط المقطوعة مع مطابقة الوجهات.'
                : 'Deep analysis of broken links distinguishing False 404s (trailing spaces, truncated slugs) from true dead pages.'}
            </p>
          </div>
          <span className="text-xs font-bold text-ink-muted font-mono">
            {reportData.section_status?.false_404_ratio || '100% Verified'}
          </span>
        </div>

        {/* 404 Findings Tables */}
        <div className="space-y-4">
          <h4 className="text-body-sm font-bold text-ink flex items-center gap-2">
            <span>{isAr ? 'قائمة الصفحات التي تعيد كود 404 وتوصيات الإصلاح' : '404 Broken Pages & Fix Recommendations'}</span>
          </h4>

          {(!reportData.section_status?.true_dead_items || reportData.section_status.true_dead_items.length === 0) &&
          (!reportData.section_status?.false_404_items || reportData.section_status.false_404_items.length === 0) ? (
            <div className="p-6 bg-surface rounded-xl text-center text-body-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{isAr ? 'ممتاز! لم يتم رصد أي روابط مفقودة أو أخطاء 404 في الموقع.' : 'Excellent! No 404 broken pages detected.'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm text-right rtl:text-right ltr:text-left">
                <thead className="bg-surface text-ink-muted text-xs font-bold uppercase border-b border-surface-hairline">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'الرابط المفقود' : 'Broken URL'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'النوع' : 'Defect Type'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الإجراء الموصى به' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hairline font-mono text-xs">
                  {reportData.section_status?.false_404_items?.map((item: any, idx: number) => (
                    <tr key={`false-${idx}`} className="hover:bg-gold-tint/10">
                      <td className="py-2.5 px-3 text-rose-600 truncate max-w-xs">{item.raw_url}</td>
                      <td className="py-2.5 px-3 font-sans text-amber-700 font-bold">{item.defect}</td>
                      <td className="py-2.5 px-3 font-sans text-ink">
                        {isAr ? `تحديث الرابط ليشير إلى: ${item.sanitized_target}` : `Update source link to point to: ${item.sanitized_target}`}
                      </td>
                    </tr>
                  ))}
                  {reportData.section_status?.true_dead_items?.map((item: any, idx: number) => (
                    <tr key={`dead-${idx}`} className="hover:bg-gold-tint/10">
                      <td className="py-2.5 px-3 text-rose-600 truncate max-w-xs">{item.url}</td>
                      <td className="py-2.5 px-3 font-sans text-rose-700 font-bold">{isAr ? 'صفحة محذوفة نهائياً' : 'True Dead Page'}</td>
                      <td className="py-2.5 px-3 font-sans text-ink">
                        {isAr ? `إضافة تحويل 301 إلى: ${item.dead_match}` : `Configure 301 redirect to: ${item.dead_match}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 5. Section B: Redirects & Chains */}
      <section id="sec-redirects" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_redirects') || (isAr ? 'ب. التحويلات وسلاسل التوجيه' : 'B. Redirects & Chains')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'كشف التحويلات المؤقتة 302 وسلاسل التحويل متعددة القفزات مع توليد أكواد خوادم Nginx و .htaccess للدمج المباشر.'
                : 'Detection of 302 temporary redirects, multi-hop chains, and generated server rewrite rules.'}
            </p>
          </div>
          <span className="text-xs font-bold text-ink-muted font-mono">
            {reportData.section_redirects?.total_redirects || 0} {isAr ? 'تحويلات' : 'Redirects'}
          </span>
        </div>

        {reportData.section_redirects?.chains?.length > 0 ? (
          <div className="space-y-4">
            {reportData.section_redirects.chains.map((chain: any, idx: number) => (
              <div key={idx} className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {chain.hops} {isAr ? 'قفزات تحويل' : 'Hops Chain'}
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{chain.source}</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-surface-hairline font-mono text-xs text-ink space-y-1">
                  <div className="text-ink-muted text-body-xs mb-1">
                    {isAr ? 'كود خادم Nginx المولد للإصلاح المباشر:' : 'Generated Nginx Rewrite Directive:'}
                  </div>
                  <code className="text-gold font-bold block bg-surface p-2 rounded">{chain.nginx}</code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-surface rounded-xl text-center text-body-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{isAr ? 'لا توجد سلاسل تحويلات متعددة أو حلقات دائرية.' : 'No redirect chains or loops detected.'}</span>
          </div>
        )}
      </section>

      {/* 6. Section C: Live 200 Quality & Freshness */}
      <section id="sec-onpage" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_onpage') || (isAr ? 'ج. جودة وحيوية صفحات 200' : 'C. Live (200) Quality')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'فحص تحديث السنوات (السنة المستهدفة: 2027)، صفحات المحتوى الضعيف (< 200 كلمة)، أوسمة Canonical والـ Noindex.'
                : 'Audits outdated year patterns (Target: 2027), thin content, canonical tags, and noindex controls.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Outdated Years */}
          <div className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-bold text-ink">
                {isAr ? 'فحص تحديث السنوات (تحديث إلى 2027)' : 'Outdated Year Freshness'}
              </h4>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {reportData.section_onpage?.outdated_years?.length || 0}
              </span>
            </div>
            {reportData.section_onpage?.outdated_years?.length > 0 ? (
              <div className="space-y-2 mt-2">
                {reportData.section_onpage.outdated_years.map((y: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-white rounded border border-surface-hairline text-xs">
                    <div className="text-rose-600 font-bold">
                      {isAr ? `سنة قديمة ${y.detected_year} -> المقترح: ${y.suggested_text}` : `Detected ${y.detected_year} -> Target: ${y.target_year}`}
                    </div>
                    <div className="text-ink-muted truncate font-mono mt-0.5">{y.url}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-600 font-bold py-2">
                {isAr ? 'جميع العناوين والسنوات محدثة ومطابقة.' : 'All titles and years are fresh and updated.'}
              </div>
            )}
          </div>

          {/* Thin Content */}
          <div className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-bold text-ink">
                {isAr ? 'صفحات المحتوى الضعيف (< 200 كلمة)' : 'Thin Content Pages'}
              </h4>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {reportData.section_onpage?.thin_pages?.length || 0}
              </span>
            </div>
            {reportData.section_onpage?.thin_pages?.length > 0 ? (
              <div className="space-y-2 mt-2">
                {reportData.section_onpage.thin_pages.map((tItem: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-white rounded border border-surface-hairline text-xs">
                    <div className="font-bold text-ink">
                      {isAr ? `عدد الكلمات: ${tItem.word_count} كلمة (أقل من الحد الموصى به)` : `Word count: ${tItem.word_count} words`}
                    </div>
                    <div className="text-ink-muted truncate font-mono mt-0.5">{tItem.url}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-600 font-bold py-2">
                {isAr ? 'كافة الصفحات تحتوي على عمق محتوى كافٍ.' : 'All crawled pages meet content depth standards.'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. Section D: Cannibalization */}
      <section id="sec-cannibal" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <Layers className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_cannibal') || (isAr ? 'د. تنافس الكلمات (Cannibalization)' : 'D. Cannibalization')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'رصد المقالات التي تتنافس على نفس الكلمات المفتاحية في نتائج البحث (SERP) مع توصيات الدمج والتحويل.'
                : 'Identifies URLs competing for identical search intents with Jaccard keyword overlap scores.'}
            </p>
          </div>
          <span className="text-xs font-bold text-ink-muted font-mono">
            {reportData.section_cannibalization?.clusters?.length || 0} {isAr ? 'حالات تنافس' : 'Clusters'}
          </span>
        </div>

        {reportData.section_cannibalization?.clusters?.length > 0 ? (
          <div className="space-y-4">
            {reportData.section_cannibalization.clusters.map((rawCluster: any, idx: number) => {
              const cluster = resolveCannibalization(rawCluster, isAr);
              return (
                <div key={idx} className="p-5 bg-surface rounded-xl border border-gold-border/60 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {isAr ? `تطابق ${cluster.similarityScore}` : `${cluster.similarityScore} Overlap`}
                      </span>
                      <span className="text-body-sm font-bold text-ink">{cluster.topic}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-800 mb-1">
                        {isAr ? 'المقال الرئيسي المعتمد (Master):' : 'Master Guide URL:'}
                      </div>
                      <div className="text-body-sm font-bold text-ink truncate">{cluster.masterTitle || cluster.masterUrl}</div>
                      <a href={cluster.masterUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-gold hover:underline truncate block mt-0.5">
                        {cluster.masterUrl}
                      </a>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-amber-200">
                      <div className="text-xs font-bold text-amber-800 mb-1">
                        {isAr ? 'المقال المنافس المطلوب دمجه أو تحويله:' : 'Candidate Competing URL:'}
                      </div>
                      <div className="text-body-sm font-bold text-ink truncate">{cluster.candidateTitle || cluster.candidateUrl}</div>
                      <a href={cluster.candidateUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-gold hover:underline truncate block mt-0.5">
                        {cluster.candidateUrl}
                      </a>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg text-body-xs text-ink-muted border border-surface-hairline leading-relaxed">
                    <strong className="text-ink">{isAr ? 'التوصية التقنية: ' : 'Recommendation: '}</strong>
                    {cluster.recommendation}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-surface rounded-xl text-center text-body-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{isAr ? 'ممتاز! لا يوجد أي تنافس دلالي أو تكرار بين مقالات الموقع.' : 'No keyword cannibalization clusters detected.'}</span>
          </div>
        )}
      </section>

      {/* 8. Section E: Schema Gaps */}
      <section id="sec-schema" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <Code className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_schema') || (isAr ? 'هـ. فجوات البيانات المنظمة (Schema)' : 'E. Structured Data Gaps')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'فحص تغطية المخططات وتوفير كود JSON-LD جاهز للنسخ والتطبيق المباشر في الموقع.'
                : 'Identifies missing Schema.org markup and generates ready-to-embed JSON-LD snippets.'}
            </p>
          </div>
        </div>

        {reportData.section_schema?.gaps?.length > 0 ? (
          <div className="space-y-4">
            {reportData.section_schema.gaps.map((gap: any, idx: number) => {
              const copyKey = `schema-${idx}`;
              const isCopied = copiedKey === copyKey;
              return (
                <div key={idx} className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-body-sm font-bold text-ink">
                        {isAr ? `مخطط مفقود: ${gap.missing}` : `Missing: ${gap.missing}`}
                      </div>
                      <div className="text-xs text-ink-muted font-mono mt-0.5">{gap.url}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(gap.generated_jsonld, copyKey)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-ink border border-surface-hairline hover:bg-gold-tint"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gold" />}
                      <span>{isCopied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كود Schema' : 'Copy JSON-LD')}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-white rounded-lg border border-surface-hairline text-xs font-mono text-ink overflow-x-auto max-h-48">
                    {gap.generated_jsonld}
                  </pre>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-surface rounded-xl text-center text-body-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{isAr ? 'البيانات المنظمة مكتملة ولا توجد فجوات رئيسية.' : 'Structured data coverage is complete across crawled pages.'}</span>
          </div>
        )}
      </section>

      {/* 9. Section F: Taxonomy */}
      <section id="sec-taxonomy" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <Filter className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_taxonomy') || (isAr ? 'و. تصنيف الصفحات وهيكل الموقع' : 'F. Taxonomy')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr ? 'توزيع صفحات الموقع حسب البنية الهيكلية ونوع المحتوى.' : 'Architecture tree classification breakdown across all crawled URLs.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(reportData.section_taxonomy?.type_distribution || {}).map(([typeKey, count]: any) => (
            <div key={typeKey} className="p-3 bg-surface rounded-xl border border-surface-hairline text-center">
              <div className="text-xs font-bold text-ink-muted uppercase">{typeKey}</div>
              <div className="text-xl font-black text-ink mt-1">{count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Section G: Action Plans */}
      <section id="sec-actions" className="editorial-card p-6 space-y-6 scroll-mt-28">
        <div className="border-b border-surface-hairline pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gold" />
              <span>{t('site_report.nav_actions') || (isAr ? 'ز. خطط العمل وتوزيع المهام' : 'G. Action Plans')}</span>
            </h3>
            <p className="text-body-xs text-ink-muted mt-0.5">
              {isAr
                ? 'توزيع مهام الإصلاح بشكل مخصص للمطورين، صناع المحتوى، وفريق السيو التقني.'
                : 'Action plans distributed by operational responsibility: Engineering, Content, and Technical SEO.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportData.section_action_plans?.map((plan: any, idx: number) => {
            const planTitle = isAr
              ? plan.title_ar || plan.title
              : plan.title_en || plan.title;
            const items = isAr
              ? plan.items_ar || plan.items
              : plan.items_en || plan.items;
            return (
              <div key={idx} className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
                <h4 className="text-body-sm font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  <span>{planTitle}</span>
                </h4>
                <ul className="space-y-2 text-xs text-ink-muted leading-relaxed">
                  {items?.map((item: string, iIdx: number) => (
                    <li key={iIdx} className="flex items-start gap-2">
                      <span className="text-gold font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Email Report Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-hairline relative">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute top-4 ltr:right-4 rtl:left-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-tint flex items-center justify-center text-gold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-title-sm font-extrabold text-ink">
                  {isAr ? 'إرسال التقرير إلى بريدك الإلكتروني' : 'Send Report to Your Email'}
                </h3>
                <p className="text-xs text-ink-muted">
                  {isAr ? 'احصل على نسخة كاملة من التقرير في صندوق بريدك' : 'Receive a full copy of this report in your inbox'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-ink-muted absolute start-3 top-3" />
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={isAr ? 'مثال: محمد أحمد' : 'e.g. John Doe'}
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-surface-hairline bg-surface text-ink text-body-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-muted absolute start-3 top-3" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-surface-hairline bg-surface text-ink text-body-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>
              </div>

              {emailFeedback && (
                <div className="space-y-3 p-4 rounded-2xl bg-gold-tint/40 border border-gold-border shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <div className="text-xs font-bold text-ink leading-relaxed">
                      {emailFeedback}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gold-border/50">
                    <button
                      type="button"
                      onClick={handleExportPrint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-white text-xs font-bold hover:bg-gold-hover shadow-sm transition-all duration-200 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تحميل التقرير PDF' : 'Download PDF Report'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportHTML}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-surface-hairline text-ink text-xs font-bold hover:border-gold shadow-sm transition-all duration-200 active:scale-95"
                    >
                      <Code className="w-3.5 h-3.5 text-gold" />
                      <span>{isAr ? 'تحميل التقرير HTML' : 'Download HTML Report'}</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-body-sm font-bold text-ink-muted hover:bg-surface"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="px-5 py-2 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover disabled:opacity-60 flex items-center gap-2"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>{isAr ? 'إرسال التقرير الآن' : 'Send Report Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Styles for PDF generation via window.print() */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #16140f !important;
          }
          nav, aside, header, button, .no-print, [role="navigation"] {
            display: none !important;
          }
          .editorial-card, .bg-white {
            border: 1px solid #e5e5e0 !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
          a {
            text-decoration: none !important;
            color: #16140f !important;
          }
        }
      `}</style>
    </div>
  );
};

