import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { History, Calendar, CheckCircle2, AlertTriangle, Eye, ArrowRight, X } from 'lucide-react';

interface RunEntry {
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

const mockRuns: RunEntry[] = [
  {
    id: 'run-1',
    date: '25 Oct 2026',
    time: '06:12 AM',
    healthScore: 94,
    criticalCount: 0,
    warningCount: 2,
    noticeCount: 1,
    pagesCrawled: 142,
    status: 'completed',
  },
  {
    id: 'run-2',
    date: '24 Oct 2026',
    time: '06:05 AM',
    healthScore: 98,
    criticalCount: 0,
    warningCount: 1,
    noticeCount: 0,
    pagesCrawled: 137,
    status: 'completed',
  },
  {
    id: 'run-3',
    date: '23 Oct 2026',
    time: '06:00 AM',
    healthScore: 100,
    criticalCount: 0,
    warningCount: 0,
    noticeCount: 0,
    pagesCrawled: 137,
    status: 'completed',
  },
];

export const HistoryPage: React.FC = () => {
  const { t } = useI18n();
  const [selectedRun, setSelectedRun] = useState<RunEntry | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('nav.history')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Historical log of every scheduled and on-demand crawl snapshot
        </p>
      </div>

      <div className="editorial-card divide-y divide-surface-hairline overflow-hidden">
        {mockRuns.map((run) => (
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
                  Pages Crawled: <strong>{run.pagesCrawled}</strong> &bull; Critical: <strong className="text-severity-critical">{run.criticalCount}</strong> &bull; Warnings: <strong className="text-severity-warning">{run.warningCount}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="text-right rtl:text-left">
                <div className="text-xs text-ink-muted font-bold uppercase">Health Score</div>
                <div className="text-xl font-black text-gold tnum">{run.healthScore}/100</div>
              </div>

              <button
                onClick={() => setSelectedRun(run)}
                className="px-3.5 py-2 rounded-xl border border-surface-hairline bg-white hover:border-gold-border hover:bg-gold-tint/40 text-body-sm font-bold text-ink flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4 text-gold" />
                <span>View Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Past Day's Email Report Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-card shadow-2xl border border-surface-hairline overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-surface-hairline flex items-center justify-between">
              <div>
                <h3 className="text-title-md font-extrabold text-ink">
                  Audit Snapshot Report: {selectedRun.date}
                </h3>
                <span className="text-xs text-ink-muted">Email equivalent snapshot dispatched at {selectedRun.time}</span>
              </div>
              <button onClick={() => setSelectedRun(null)} className="p-1 rounded-lg hover:bg-surface text-ink-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-surface-hairline flex justify-between items-center">
                <span className="font-bold text-ink">Calculated Health Score</span>
                <span className="text-2xl font-black text-gold">{selectedRun.healthScore}/100</span>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-body-md text-ink">Deltas & Issues Logged:</h4>
                <div className="p-3.5 rounded-lg border border-severity-warning-border bg-severity-warning-bg">
                  <div className="font-bold text-body-md text-ink">Title tag changed on /blog/seo-guide</div>
                  <div className="text-xs text-ink-muted mt-1">Severity: Warning &bull; Discovered at 06:12 AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
