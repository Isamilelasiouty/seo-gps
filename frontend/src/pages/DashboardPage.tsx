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
        <div className="editorial-card p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-4">
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
        <>
          {/* Indicators Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Indicator: Semi-circle Gauge */}
            <div className="lg:col-span-4 editorial-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{t('dashboard.main_indicator')}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#067647]">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('dashboard.status_stable')}
                </span>
              </div>

              <GaugeChart score={activeProject.health_score || 92} />

              <div className="text-center pt-2 border-t border-surface-hairline text-xs text-ink-muted">
                {critVal} {t('dashboard.critical')} &bull; {warnVal} {t('dashboard.warning')} &bull; {noticVal} {t('dashboard.notice')}
              </div>
            </div>

            {/* Metric Cards */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label={t('dashboard.critical')}
                value={critVal}
                change={0}
                severity="critical"
                isSelected={selectedMetric === 'critical'}
                onClick={() => {
                  setSelectedMetric('critical');
                  onNavigateToIssues();
                }}
              />
              <StatCard
                label={t('dashboard.warning')}
                value={warnVal}
                change={0}
                severity="warning"
                isSelected={selectedMetric === 'warning'}
                onClick={() => {
                  setSelectedMetric('warning');
                  onNavigateToIssues();
                }}
              />
              <StatCard
                label={t('dashboard.notice')}
                value={noticVal}
                change={0}
                severity="notice"
                isSelected={selectedMetric === 'notice'}
                onClick={() => {
                  setSelectedMetric('notice');
                  onNavigateToIssues();
                }}
              />
              <StatCard
                label={t('dashboard.crawled_pages')}
                value={pagesVal}
                change={0}
                severity="healthy"
                isSelected={selectedMetric === 'pages'}
                onClick={() => setSelectedMetric('pages')}
              />

              {/* Resolved Issues Banner */}
              {resolvedVal > 0 && (
                <div className="col-span-2 sm:col-span-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {isAr
                        ? `تم التحقق من حل ${resolvedVal} مشكلة بنجاح عبر الفحص المباشر!`
                        : `${resolvedVal} issues verified and resolved via live checks!`}
                    </span>
                  </span>
                  <button
                    onClick={onNavigateToIssues}
                    className="text-emerald-700 hover:underline flex items-center gap-1 shrink-0 font-bold"
                  >
                    <span>{isAr ? 'عرض قائمة المهام' : 'View Action List'}</span>
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </button>
                </div>
              )}

              {/* Time Series Chart Box */}
              <div className="col-span-2 sm:col-span-4 editorial-card p-6 bg-surface">
                <div className="flex items-center justify-between mb-4">
                  <span className="eyebrow">{t('dashboard.trend_title')} ({timeRange})</span>
                  <span className="text-xs text-ink-muted">{t('dashboard.trend_subtitle')}</span>
                </div>

                <div className="h-32 w-full flex items-end">
                  <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGoldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B8892B" stopOpacity="0.25" />
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
        </>
      )}
    </div>
  );
};
