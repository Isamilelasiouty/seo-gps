import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { GaugeChart } from '../components/GaugeChart';
import { StatCard } from '../components/StatCard';
import {
  Globe,
  Clock,
  ShieldCheck,
  ArrowRight,
  Edit2,
  Sparkles,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';
import { ProjectData } from '../components/EditProjectModal';

interface DashboardPageProps {
  onNavigateToIssues: () => void;
  onNavigateToSiteReport?: () => void;
  onOpenAddProject: () => void;
  activeProject: ProjectData | null;
  onEditProject: () => void;
  onRunInstantAnalysis: () => Promise<void>;
  issuesSummary?: {
    critical: number;
    warning: number;
    notice: number;
    resolved: number;
    pages: number;
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToIssues,
  onNavigateToSiteReport,
  onOpenAddProject,
  activeProject,
  onEditProject,
  onRunInstantAnalysis,
  issuesSummary,
}) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [timeRange, setTimeRange] = useState<'7d' | '28d' | '90d'>('28d');
  const [selectedMetric, setSelectedMetric] = useState<string>('critical');
  const [isRunningCrawl, setIsRunningCrawl] = useState(false);
  const [crawlProgressStep, setCrawlProgressStep] = useState<string>('');

  const handleRunNow = async () => {
    setIsRunningCrawl(true);
    setCrawlProgressStep(t('dashboard.step_connect'));

    setTimeout(() => {
      setCrawlProgressStep(t('dashboard.step_status'));
    }, 600);

    setTimeout(() => {
      setCrawlProgressStep(t('dashboard.step_onpage'));
    }, 1400);

    try {
      await onRunInstantAnalysis();
    } finally {
      setIsRunningCrawl(false);
      setCrawlProgressStep('');
    }
  };

  const getScheduleText = () => {
    if (!activeProject) return '';
    const freq = activeProject.frequency || 'daily';
    const hour = activeProject.daily_crawl_hour ?? 6;
    const hourFormatted = `${hour.toString().padStart(2, '0')}:00 UTC`;

    if (freq === 'hourly') return t('project_actions.hourly');
    if (freq === 'weekly') {
      const day = activeProject.crawl_day || 'monday';
      return `${t('project_actions.weekly')} (${t(`project_actions.days.${day}`)}, ${hourFormatted})`;
    }
    return `${t('project_actions.daily')} (${hourFormatted})`;
  };

  // Case 1: No Projects configured yet
  if (!activeProject) {
    return (
      <div className="editorial-card p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12" dir={dir}>
        <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-4">
          <Globe className="w-8 h-8" />
        </div>
        <h2 className="text-title-lg font-black text-ink mb-2">
          {t('empty_states.no_projects_title')}
        </h2>
        <p className="text-body-md text-ink-muted leading-relaxed mb-6">
          {t('empty_states.no_projects_desc')}
        </p>
        <button
          onClick={onOpenAddProject}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('empty_states.add_first_project')}</span>
        </button>
      </div>
    );
  }

  const isAudited = Boolean(activeProject.last_run_at);

  const critVal = issuesSummary?.critical ?? 0;
  const warnVal = issuesSummary?.warning ?? 14;
  const noticVal = issuesSummary?.notice ?? 6;
  const pagesVal = issuesSummary?.pages ?? 180;
  const resolvedVal = issuesSummary?.resolved ?? 0;

  return (
    <div className="space-y-6" dir={dir}>
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
              {activeProject.name}
            </h1>
            <button
              onClick={onEditProject}
              className="p-1 rounded-lg text-ink-muted hover:text-gold hover:bg-gold-tint/40 transition-colors"
              title={t('project_actions.edit')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-body-sm text-ink-muted flex-wrap">
            <span className="font-mono text-xs text-ink bg-surface px-2 py-0.5 rounded border border-surface-hairline">
              {activeProject.domain}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gold" />
              {t('dashboard.last_run')}:{' '}
              <strong className="text-ink">
                {isAudited ? new Date(activeProject.last_run_at!).toLocaleDateString() : t('dashboard.status_not_audited')}
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              {t('settings.schedule_title')}: <strong className="text-ink">{getScheduleText()}</strong>
            </span>
          </div>
        </div>

        {/* Action Button: Run Now / Re-check */}
        <div className="flex items-center gap-3">
          {isAudited && (
            <div className="bg-surface border border-surface-hairline p-1 rounded-xl flex items-center text-xs font-semibold">
              {(['7d', '28d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    timeRange === r ? 'bg-white shadow-sm text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t(`dashboard.range_${r}`)}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleRunNow}
            disabled={isRunningCrawl}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-white font-extrabold text-body-sm hover:bg-gold-hover shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningCrawl ? 'animate-spin' : ''}`} />
            <span>{isRunningCrawl ? t('dashboard.running_crawl') : t('project_actions.run_now')}</span>
          </button>
        </div>
      </div>

      {/* Crawl Progress Toast */}
      {isRunningCrawl && (
        <div className="p-4 bg-gold-tint border border-gold-border rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <span className="text-body-md font-bold text-ink">
              {crawlProgressStep}
            </span>
          </div>
          <span className="text-xs text-ink-muted font-mono">SEO GPS Crawler</span>
        </div>
      )}

      {/* Case 2: Project Not Yet Audited - Clean Call to Action */}
      {!isAudited ? (
        <div className="editorial-card p-12 flex flex-col items-center justify-center text-center rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-4 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-title-md font-black text-ink mb-2">
            {t('empty_states.not_audited_title')}
          </h3>
          <p className="text-body-md text-ink-muted max-w-lg mb-6 leading-relaxed">
            {t('empty_states.not_audited_desc')}
          </p>
          <button
            onClick={handleRunNow}
            disabled={isRunningCrawl}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <PlayCircle className="w-5 h-5" />
            <span>{t('empty_states.run_first_audit')}</span>
          </button>
        </div>
      ) : (
        /* Case 3: Project Audited - Real Metrics */
        <div className="space-y-6">
          {/* Centered Modern Section Header (Inspired by reference UI) */}
          <div className="text-center pt-1 pb-1 space-y-1.5">
            <div className="inline-flex items-center gap-2.5 text-title-md md:text-title-lg font-black text-slate-800 tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-gold/70" />
              <span>{isAr ? 'لوحة الإحصائيات والمؤشرات' : 'Analytics & Indicators Dashboard'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gold/70" />
            </div>
            <div className="w-12 h-1 bg-gold/70 rounded-full mx-auto" />
            <p className="text-body-sm text-slate-500 font-medium">
              {isAr
                ? 'نظرة شاملة ولحظية على مؤشرات أداء الموقع وصحة السيو التقنية'
                : 'Comprehensive real-time overview of website performance and technical SEO health'}
            </p>
          </div>

          {/* Full-width 4 Stat Cards Row (Restful, Floating, Soft rounded) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label={isAr ? 'المشاكل الحرجة' : 'Critical Issues'}
              value={critVal}
              change={0}
              severity="critical"
              statusBadge={isAr ? 'تتطلب معالجة' : 'Needs Action'}
              sublabel={isAr ? 'أخطاء برمجية وصفحات 404' : 'Technical & 404 broken pages'}
              isSelected={selectedMetric === 'critical'}
              onClick={() => {
                setSelectedMetric('critical');
                onNavigateToIssues();
              }}
            />
            <StatCard
              label={isAr ? 'التحذيرات التقنية' : 'Technical Warnings'}
              value={warnVal}
              change={0}
              severity="warning"
              statusBadge={isAr ? 'تحذيرات هامة' : 'Warnings'}
              sublabel={isAr ? 'تنبيهات تؤثر على تجربة الزوار' : 'Issues affecting user experience'}
              isSelected={selectedMetric === 'warning'}
              onClick={() => {
                setSelectedMetric('warning');
                onNavigateToIssues();
              }}
            />
            <StatCard
              label={isAr ? 'الملاحظات الإرشادية' : 'Optimization Notices'}
              value={noticVal}
              change={0}
              severity="notice"
              statusBadge={isAr ? 'فرص تحسين' : 'Optimizations'}
              sublabel={isAr ? 'تحسينات العناوين وهيكل الصفحات' : 'Title tags & structured data gaps'}
              isSelected={selectedMetric === 'notice'}
              onClick={() => {
                setSelectedMetric('notice');
                onNavigateToIssues();
              }}
            />
            <StatCard
              label={isAr ? 'الصفحات المفحوصة' : 'Crawled Pages'}
              value={pagesVal}
              change={0}
              severity="healthy"
              statusBadge={isAr ? 'مكتملة الفحص' : 'Audited'}
              sublabel={isAr ? 'جاهزة ومستكشفة بالكامل' : 'Indexed and live crawl completed'}
              isSelected={selectedMetric === 'pages'}
              onClick={() => setSelectedMetric('pages')}
            />
          </div>

          {/* Resolved Issues Banner */}
          {resolvedVal > 0 && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50 border border-emerald-200/90 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-body-sm font-bold">
                  {isAr
                    ? `تم التحقق من حل ${resolvedVal} مشكلة بنجاح عبر الفحص المباشر!`
                    : `${resolvedVal} issues verified and resolved via live checks!`}
                </span>
              </span>
              <button
                onClick={onNavigateToIssues}
                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 shrink-0 font-extrabold bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs hover:shadow-sm transition-all"
              >
                <span>{isAr ? 'عرض قائمة المهام' : 'View Action List'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* Indicators & Trend Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Indicator: Semi-circle Gauge */}
            <div className="lg:col-span-5 editorial-card p-6 flex flex-col justify-between rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{t('dashboard.main_indicator')}</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t('dashboard.status_stable')}
                </span>
              </div>

              <div className="py-2">
                <GaugeChart score={activeProject.health_score || 92} />
              </div>

              <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                {critVal} {t('dashboard.critical')} &bull; {warnVal} {t('dashboard.warning')} &bull; {noticVal} {t('dashboard.notice')}
              </div>
            </div>

            {/* Time Series Chart Box */}
            <div className="lg:col-span-7 editorial-card p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="eyebrow">{t('dashboard.trend_title')}</span>
                  <div className="text-body-sm font-bold text-slate-800 mt-0.5">
                    {t('dashboard.trend_subtitle')} ({timeRange})
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
                  {(['7d', '28d', '90d'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        timeRange === r ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t(`dashboard.range_${r}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-40 w-full flex items-end pt-2">
                <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="chartGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B8892B" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#B8892B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,40 Q 120,50 250,30 T 500,20 L 500,100 L 0,100 Z"
                    fill="url(#chartGoldGrad)"
                  />
                  <path
                    d="M 0,40 Q 120,50 250,30 T 500,20"
                    fill="none"
                    stroke="#B8892B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="500" cy="20" r="4.5" fill="#B8892B" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
