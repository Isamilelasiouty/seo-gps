import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { GaugeChart } from '../components/GaugeChart';
import { StatCard } from '../components/StatCard';
import { Play, Calendar, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  onNavigateToIssues: () => void;
  onOpenAddProject: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToIssues,
  onOpenAddProject,
}) => {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'7d' | '28d' | '90d'>('28d');
  const [selectedMetric, setSelectedMetric] = useState<string>('critical');
  const [isRunningCrawl, setIsRunningCrawl] = useState(false);

  const handleRunCrawl = () => {
    setIsRunningCrawl(true);
    setTimeout(() => {
      setIsRunningCrawl(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {t('dashboard.title')}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-body-sm text-ink-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gold" />
              {t('dashboard.last_run')}: <strong className="text-ink">Today, 06:12 AM</strong>
            </span>
            <span>&bull;</span>
            <span>{t('dashboard.next_run')}: Tomorrow, 06:00 AM (UTC)</span>
          </div>
        </div>

        {/* Action Button: Run Now / Re-check */}
        <div className="flex items-center gap-3">
          {/* Time range selector */}
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

          <button
            onClick={handleRunCrawl}
            disabled={isRunningCrawl}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-white ${isRunningCrawl ? 'animate-spin' : ''}`} />
            <span>{isRunningCrawl ? 'Crawling...' : t('header.recheck')}</span>
          </button>
        </div>
      </div>

      {/* 2. Getting Started Progress Pill (Ubersuggest style) */}
      <div className="editorial-card p-4 bg-gold-tint/40 border-gold-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold-border flex items-center justify-center text-gold font-bold">
            3/4
          </div>
          <div>
            <h4 className="font-bold text-body-md text-ink">
              {t('dashboard.getting_started')} (3 of 4 completed)
            </h4>
            <p className="text-body-sm text-ink-muted">
              Add site &bull; Verify ownership &bull; Set alert email &bull; Run first crawl
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAddProject}
          className="text-body-sm font-bold text-gold hover:text-gold-hover flex items-center gap-1 self-start md:self-auto"
        >
          <span>Complete Setup</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* 3. Indicators Grid: Health Gauge + Severity Stat Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Indicator: Semi-circle Gauge */}
        <div className="lg:col-span-4 editorial-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t('dashboard.main_indicator')}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#067647]">
              <ShieldCheck className="w-3.5 h-3.5" /> Stable
            </span>
          </div>

          <GaugeChart score={94} />

          <div className="text-center pt-2 border-t border-surface-hairline text-xs text-ink-muted">
            Computed from 0 Critical &bull; 2 Warnings &bull; 1 Notice
          </div>
        </div>

        {/* Metric Cards (GSC Clickable Tiles) */}
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
            value={2}
            change={+1}
            severity="warning"
            isSelected={selectedMetric === 'warning'}
            onClick={() => setSelectedMetric('warning')}
          />
          <StatCard
            label={t('dashboard.notice')}
            value={1}
            change={-1}
            severity="notice"
            isSelected={selectedMetric === 'notice'}
            onClick={() => setSelectedMetric('notice')}
          />
          <StatCard
            label={t('dashboard.crawled_pages')}
            value={142}
            change={+5}
            severity="healthy"
            isSelected={selectedMetric === 'pages'}
            onClick={() => setSelectedMetric('pages')}
          />

          {/* GSC Time Series Chart Simulation Box */}
          <div className="col-span-2 sm:col-span-4 editorial-card p-6 bg-surface">
            <div className="flex items-center justify-between mb-4">
              <span className="eyebrow">Health & Issue History ({timeRange})</span>
              <span className="text-xs text-ink-muted">Daily Automated Snapshots</span>
            </div>

            {/* Clean SVG Trend Line */}
            <div className="h-36 w-full flex items-end">
              <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8892B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#B8892B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area */}
                <path
                  d="M 0,90 Q 70,85 140,75 T 280,60 T 400,45 T 500,30 L 500,120 L 0,120 Z"
                  fill="url(#chartGoldGrad)"
                />
                {/* Line */}
                <path
                  d="M 0,90 Q 70,85 140,75 T 280,60 T 400,45 T 500,30"
                  fill="none"
                  stroke="#B8892B"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Data points */}
                <circle cx="0" cy="90" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                <circle cx="140" cy="75" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                <circle cx="280" cy="60" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                <circle cx="400" cy="45" r="4" fill="#FFFFFF" stroke="#B8892B" strokeWidth="2" />
                <circle cx="500" cy="30" r="5" fill="#B8892B" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex justify-between text-[11px] text-ink-muted mt-2 border-t border-surface-hairline pt-2">
              <span>{timeRange === '7d' ? '7 days ago' : timeRange === '28d' ? '28 days ago' : '90 days ago'}</span>
              <span>Today (06:00 AM)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. What Changed Today Section */}
      <div className="editorial-card p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-hairline">
          <div>
            <h3 className="font-extrabold text-title-sm text-ink">
              {t('dashboard.changes_today')}
            </h3>
            <p className="text-body-sm text-ink-muted">
              Delta snapshot comparing today vs yesterday
            </p>
          </div>
          <button
            onClick={onNavigateToIssues}
            className="text-body-sm font-bold text-gold hover:text-gold-hover flex items-center gap-1"
          >
            <span>View All Issues</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Change items */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-severity-warning-border bg-severity-warning-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-severity-warning mt-1.5 shrink-0"></span>
              <div>
                <div className="font-bold text-body-md text-ink">
                  Title tag changed &bull; <span className="text-severity-warning">Warning</span>
                </div>
                <div className="text-xs text-ink-muted">
                  https://example.com/blog/seo-guide
                </div>
                <div className="text-body-sm text-ink mt-1">
                  Old: "Top SEO Tips" &rarr; New: "Comprehensive SEO Guide 2026"
                </div>
              </div>
            </div>
            <span className="text-xs text-ink-muted shrink-0">Detected 06:12 AM</span>
          </div>

          <div className="p-3.5 rounded-xl border border-severity-healthy-border bg-severity-healthy-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-severity-healthy mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-body-md text-ink">
                  Resolved: 404 error fixed on /pricing &bull; <span className="text-severity-healthy">Healthy</span>
                </div>
                <div className="text-xs text-ink-muted">
                  Page is now returning HTTP 200 OK.
                </div>
              </div>
            </div>
            <span className="text-xs text-ink-muted shrink-0">Fixed since yesterday</span>
          </div>
        </div>
      </div>
    </div>
  );
};
