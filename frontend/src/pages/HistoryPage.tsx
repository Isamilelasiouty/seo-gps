import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { History, Calendar, CheckCircle2, AlertTriangle, Eye, ArrowRight, X } from 'lucide-react';

export interface RunEntry {
  id: string;
  date: string;
  time: string;
  healthScore: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  pagesCrawled: number;
  status: 'completed' | 'failed';
}

interface HistoryPageProps {
  runs?: RunEntry[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ runs = [] }) => {
  const { t } = useI18n();
  const [selectedRun, setSelectedRun] = useState<RunEntry | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('history.title')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          {t('history.subtitle')}
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="editorial-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-4">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-title-md font-extrabold text-ink mb-2">
            {t('empty_states.no_history_title')}
          </h3>
          <p className="text-body-md text-ink-muted max-w-md">
            {t('empty_states.no_history_desc')}
          </p>
        </div>
      ) : (
        <div className="editorial-card divide-y divide-surface-hairline overflow-hidden">
          {runs.map((run) => (
            <div
              key={run.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gold-tint/20 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-body-lg text-ink flex items-center gap-2">
                    <span>{run.date}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-muted">
                      {run.time}
                    </span>
                  </div>
                  <div className="text-body-sm text-ink-muted mt-0.5">
                    {t('history.pages_crawled')}: <strong>{run.pagesCrawled}</strong> &bull; {t('dashboard.critical')}: <strong className="text-severity-critical">{run.criticalCount}</strong> &bull; {t('dashboard.warning')}: <strong className="text-severity-warning">{run.warningCount}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right rtl:text-left">
                  <div className="text-xs text-ink-muted font-bold uppercase">{t('history.health_score')}</div>
                  <div className="text-xl font-black text-gold tnum">{run.healthScore}/100</div>
                </div>

                <button
                  onClick={() => setSelectedRun(run)}
                  className="px-3.5 py-2 rounded-xl border border-surface-hairline bg-white hover:border-gold-border hover:bg-gold-tint/40 text-body-sm font-bold text-ink flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4 text-ink-muted" />
                  <span>{t('history.view_details')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-card shadow-2xl p-6 relative border border-surface-hairline animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-hairline">
              <h3 className="text-title-sm font-bold text-ink">
                {t('history.snapshot_details')}
              </h3>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1 rounded-lg hover:bg-surface text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-body-md text-ink">
              <div className="flex justify-between py-1 border-b border-surface-hairline">
                <span className="text-ink-muted">{t('dashboard.last_run')}:</span>
                <span className="font-bold">{selectedRun.date} ({selectedRun.time})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-hairline">
                <span className="text-ink-muted">{t('history.health_score')}:</span>
                <span className="font-black text-gold">{selectedRun.healthScore} / 100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-hairline">
                <span className="text-ink-muted">{t('history.pages_crawled')}:</span>
                <span className="font-bold">{selectedRun.pagesCrawled}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-hairline">
                <span className="text-ink-muted">{t('dashboard.critical')}:</span>
                <span className="font-bold text-severity-critical">{selectedRun.criticalCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-muted">{t('dashboard.warning')}:</span>
                <span className="font-bold text-severity-warning">{selectedRun.warningCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
