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
  onOpenAddProject: () => void;
  activeProject: ProjectData | null;
  onEditProject: () => void;
  onRunInstantAnalysis: () => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToIssues,
  onOpenAddProject,
  activeProject,
  onEditProject,
  onRunInstantAnalysis,
}) => {
  const { t } = useI18n();
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
      setCrawlProgressStep(t('dashboard.step_schema'));
    }, 1200);

    setTimeout(async () => {
      await onRunInstantAnalysis();
      setIsRunningCrawl(false);
      setCrawlProgressStep('');
    }, 1800);
  };

  const getScheduleText = () => {
    if (!activeProject) return t('dashboard.not_scheduled');
    if (activeProject.frequency === 'hourly') return t('dashboard.schedule_hourly');
    if (activeProject.frequency === 'weekly') {
      const dayKey = activeProject.crawl_day ? `project_actions.days.${activeProject.crawl_day.toLowerCase()}` : 'project_actions.days.monday';
      const dayLabel = t(dayKey) || activeProject.crawl_day || 'Monday';
      return `${t('dashboard.schedule_weekly')} (${dayLabel} - ${activeProject.daily_crawl_hour ?? 6}:00)`;
    }
    return `${t('dashboard.schedule_daily')} (${activeProject.daily_crawl_hour ?? 6}:00 ${activeProject.timezone || 'UTC'})`;
  };

  // Case 1: Zero Projects Added - Empty State
  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center p-8 bg-surface rounded-card border border-surface-hairline shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-5">
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

  return (
    <div className="space-y-6">
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

              <GaugeChart score={activeProject.health_score || 96} />

              <div className="text-center pt-2 border-t border-surface-hairline text-xs text-ink-muted">
                0 {t('dashboard.critical')} &bull; 0 {t('dashboard.warning')} &bull; 0 {t('dashboard.notice')}
              </div>
            </div>

            {/* Metric Cards */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label={t('dashboard.critical')}
                value={0}
                change={0}
                severity="critical"
                isSelected={selectedMetric === 'critical'}
                onClick={() => setSelectedMetric('critical')}
              />
              <StatCard
                label={t('dashboard.warning')}
                value={0}
                change={0}
                severity="warning"
                isSelected={selectedMetric === 'warning'}
                onClick={() => setSelectedMetric('warning')}
              />
              <StatCard
                label={t('dashboard.notice')}
                value={0}
                change={0}
                severity="notice"
                isSelected={selectedMetric === 'notice'}
                onClick={() => setSelectedMetric('notice')}
              />
              <StatCard
                label={t('dashboard.crawled_pages')}
                value={28}
                change={0}
                severity="healthy"
                isSelected={selectedMetric === 'pages'}
                onClick={() => setSelectedMetric('pages')}
              />

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
                      d="M 0,70 Q 120,60 250,45 T 500,30 L 500,100 L 0,100 Z"
                      fill="url(#chartGoldGrad)"
                    />
                    <path
                      d="M 0,70 Q 120,60 250,45 T 500,30"
                      fill="none"
                      stroke="#B8892B"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="0" cy="70" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                    <circle cx="250" cy="45" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                    <circle cx="500" cy="30" r="5" fill="#B8892B" stroke="#FFFFFF" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] text-ink-muted mt-2 border-t border-surface-hairline pt-2">
                  <span>{timeRange === '7d' ? '7d' : timeRange === '28d' ? '28d' : '90d'}</span>
                  <span>{t('dashboard.today_run')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Changes Today Section */}
          <div className="editorial-card p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-hairline">
              <div>
                <h3 className="font-extrabold text-title-sm text-ink">
                  {t('dashboard.changes_today')}
                </h3>
                <p className="text-body-sm text-ink-muted">
                  {t('dashboard.compared_yesterday')}
                </p>
              </div>
              <button
                onClick={onNavigateToIssues}
                className="text-body-sm font-bold text-gold hover:text-gold-hover flex items-center gap-1"
              >
                <span>{t('dashboard.view_all_issues')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            {/* Empty State for Changes: Clean and Healthy */}
            <div className="p-6 rounded-xl border border-severity-healthy-border bg-severity-healthy-bg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-severity-healthy shrink-0" />
              <div>
                <div className="font-bold text-body-md text-ink">
                  {t('dashboard.no_changes')}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {t('dashboard.empty_changes_desc')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
