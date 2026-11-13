import React, { useState } from 'react';
import { useI18n } from '../i18n';
import {
  History,
  Calendar,
  X,
  Mail,
  FileSpreadsheet,
} from 'lucide-react';

export interface RunEntry {
  id: string;
  date: string;
  time: string;
  scanType?: 'baseline' | 'daily' | 'manual';
  healthScore: number;
  criticalCount: number;
  warningCount: number;
  noticeCount?: number;
  newCount?: number;
  persistingCount?: number;
  resolvedCount?: number;
  pagesCrawled: number;
  status: 'completed' | 'failed';
  emailSubject?: string;
  emailBody?: string;
}

interface HistoryPageProps {
  runs?: RunEntry[];
  onOpenReport?: (scanId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ runs = [], onOpenReport }) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';
  const [emailPreviewRun, setEmailPreviewRun] = useState<RunEntry | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
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
                <div className="w-10 h-10 rounded-xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-body-lg text-ink flex items-center gap-2 flex-wrap">
                    <span>{run.date}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-muted">
                      {run.time}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        run.scanType === 'baseline'
                          ? 'bg-gold-tint text-gold border border-gold-border'
                          : 'bg-surface text-ink-muted border'
                      }`}
                    >
                      {run.scanType === 'baseline' ? t('history.baseline_scan') : t('history.daily_rescan')}
                    </span>
                  </div>
                  <div className="text-body-sm text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span>{t('history.crawled_count')}: <strong>{run.pagesCrawled}</strong></span>
                    <span>&bull;</span>
                    {run.newCount !== undefined ? (
                      <>
                        <span className="text-rose-700 font-bold">{run.newCount} {t('history.new_count')}</span>
                        <span>&bull;</span>
                        <span className="text-amber-700 font-bold">{run.persistingCount || 0} {t('history.persisting_count')}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-bold">{run.resolvedCount || 0} {t('history.resolved_count')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('dashboard.critical')}: <strong className="text-rose-700">{run.criticalCount}</strong></span>
                        <span>&bull;</span>
                        <span>{t('dashboard.warning')}: <strong className="text-amber-700">{run.warningCount}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right rtl:text-left mr-2">
                  <div className="text-[10px] text-ink-muted font-bold uppercase">{t('history.health_score')}</div>
                  <div className="text-xl font-black text-gold tnum">{run.healthScore}/100</div>
                </div>

                {onOpenReport && (
                  <button
                    onClick={() => onOpenReport(run.id)}
                    className="px-3 py-1.5 rounded-lg border border-surface-hairline bg-white hover:bg-gold-tint/40 text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-gold" />
                    <span>{t('history.view_report')}</span>
                  </button>
                )}

                <button
                  onClick={() => setEmailPreviewRun(run)}
                  className="px-3 py-1.5 rounded-lg border border-surface-hairline bg-white hover:bg-gold-tint/40 text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-gold" />
                  <span>{t('history.email_preview')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreviewRun && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-card shadow-2xl p-6 relative border border-surface-hairline animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-hairline">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gold" />
                <h3 className="text-title-sm font-bold text-ink">
                  {t('history.email_preview')} ({emailPreviewRun.scanType === 'baseline' ? t('history.baseline_scan') : t('history.daily_rescan')})
                </h3>
              </div>
              <button
                onClick={() => setEmailPreviewRun(null)}
                className="p-1 rounded-lg hover:bg-surface text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 flex-1 overflow-y-auto">
              <div className="p-3 bg-surface rounded-lg text-xs space-y-1 font-mono">
                <div><strong>{isAr ? 'الموضوع:' : 'Subject:'}</strong> {emailPreviewRun.emailSubject || `[SEO GPS] ${emailPreviewRun.scanType === 'baseline' ? 'Baseline Report' : 'Daily Alert'} - Health: ${emailPreviewRun.healthScore}/100`}</div>
                <div><strong>{isAr ? 'تاريخ الإرسال:' : 'Date Sent:'}</strong> {emailPreviewRun.date} {emailPreviewRun.time}</div>
                <div><strong>{isAr ? 'الحالة:' : 'Status:'}</strong> {isAr ? 'تم الإرسال بنجاح إلى البريد الإلكتروني' : 'Delivered to inbox via Resend'}</div>
              </div>

              <div className="p-4 rounded-xl border border-surface-hairline bg-white font-sans text-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-surface-hairline">
                  <span className="font-extrabold text-sm text-ink">SEO GPS by Ismail El Asiouty</span>
                  <span className="px-2 py-0.5 rounded bg-gold-tint text-gold font-bold">
                    {t('history.health_score')}: {emailPreviewRun.healthScore}/100
                  </span>
                </div>

                <p className="text-ink-muted">
                  {emailPreviewRun.scanType === 'baseline'
                    ? (isAr ? `اكتمل تقرير الفحص المرجعي الأول بتاريخ ${emailPreviewRun.date}. تم استكشاف وفحص ${emailPreviewRun.pagesCrawled} صفحة.` : `Complete first scan baseline report completed on ${emailPreviewRun.date}. Discovered and crawled ${emailPreviewRun.pagesCrawled} URLs.`)
                    : (isAr ? `رصدت المراقبة اليومية لتراجعات السيو تغييرات جديدة: ${emailPreviewRun.newCount || 0} مشاكل جديدة، ${emailPreviewRun.persistingCount || 0} ما زالت مفتوحة.` : `Daily regression monitoring detected changes. ${emailPreviewRun.newCount || 0} new issues, ${emailPreviewRun.persistingCount || 0} still open.`)}
                </p>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-surface border">
                    <div className="font-bold text-ink">{t('history.crawled_count')}</div>
                    <div className="text-sm font-black">{emailPreviewRun.pagesCrawled}</div>
                  </div>
                  <div className="p-2 rounded bg-surface border">
                    <div className="font-bold text-rose-700">{t('dashboard.critical')}</div>
                    <div className="text-sm font-black text-rose-700">{emailPreviewRun.criticalCount}</div>
                  </div>
                  <div className="p-2 rounded bg-surface border">
                    <div className="font-bold text-amber-700">{t('dashboard.warning')}</div>
                    <div className="text-sm font-black text-amber-700">{emailPreviewRun.warningCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-hairline flex justify-end">
              <button
                onClick={() => setEmailPreviewRun(null)}
                className="px-4 py-2 rounded-lg bg-surface text-ink text-xs font-bold hover:bg-gold-tint/40"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
