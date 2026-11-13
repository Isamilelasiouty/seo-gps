import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { resolveIssueTitle } from '../lib/siteCrawler';
import {
  Search,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Check,
  Copy,
  EyeOff,
  Eye,
} from 'lucide-react';

export interface IssueItem {
  id: string;
  fingerprint?: string;
  url: string;
  checkId: string;
  title: string;
  title_ar?: string;
  title_en?: string;
  details_ar?: string;
  details_en?: string;
  severity: 'critical' | 'warning' | 'notice';
  confidence?: 'high' | 'medium' | 'low';
  firstSeen: string;
  lastSeen: string;
  daysOpen?: number;
  isBaseline?: boolean;
  status: 'new' | 'persisting' | 'resolved' | 'reappeared' | 'ignored';
  evidence?: any;
  suggestion?: any;
  before?: string;
  after?: string;
}

interface IssuesPageProps {
  issues?: IssueItem[];
  onIgnoreIssue?: (id: string, ignored: boolean) => void;
  onRecheckIssue?: (issue: IssueItem) => void;
}

export const IssuesPage: React.FC<IssuesPageProps> = ({
  issues = [],
  onIgnoreIssue,
  onRecheckIssue,
}) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'persisting' | 'resolved' | 'ignored'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredIssues = issues.filter((iss) => {
    // 1. Tab filter
    if (activeTab === 'new' && iss.status !== 'new') return false;
    if (activeTab === 'persisting' && iss.status !== 'persisting' && iss.status !== 'reappeared') return false;
    if (activeTab === 'resolved' && iss.status !== 'resolved') return false;
    if (activeTab === 'ignored' && iss.status !== 'ignored') return false;

    // 2. Search query
    const resolvedTitle = resolveIssueTitle(iss, isAr);
    const matchesSearch =
      iss.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resolvedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iss.title.toLowerCase().includes(searchTerm.toLowerCase());

    // 3. Severity filter
    const matchesSev = severityFilter === 'all' || iss.severity === severityFilter;

    return matchesSearch && matchesSev;
  });

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      if (selectedIssue && onRecheckIssue) {
        onRecheckIssue(selectedIssue);
      }
    }, 1200);
  };

  const handleExportCSV = () => {
    if (filteredIssues.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['URL,Issue,Severity,Status,Days Open,Is Baseline,Evidence,Suggestion']
        .concat(
          filteredIssues.map(
            (i) =>
              `"${i.url}","${resolveIssueTitle(i, isAr)}","${i.severity}","${i.status}","${i.daysOpen || 0}","${
                i.isBaseline ? 'Yes' : 'No'
              }","${JSON.stringify(i.evidence || {}).replace(/"/g, '""')}","${JSON.stringify(
                i.suggestion || {}
              ).replace(/"/g, '""')}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seo_gps_issues_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts for tabs
  const countNew = issues.filter((i) => i.status === 'new').length;
  const countPersisting = issues.filter((i) => i.status === 'persisting' || i.status === 'reappeared').length;
  const countResolved = issues.filter((i) => i.status === 'resolved').length;
  const countIgnored = issues.filter((i) => i.status === 'ignored').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return isAr ? 'جديدة' : 'NEW';
      case 'resolved':
        return isAr ? 'تم الحل' : 'RESOLVED';
      case 'ignored':
        return isAr ? 'متجاهلة' : 'IGNORED';
      default:
        return isAr ? 'مستمرة' : 'PERSISTING';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {t('issues.title')}
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {t('issues.track_subtitle')}
          </p>
        </div>

        {issues.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-hairline bg-white text-body-sm font-semibold text-ink hover:bg-surface transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-gold" />
              <span>{t('issues.export_csv')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Lifecycle Status Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-hairline pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-ink text-white shadow-sm'
              : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
          }`}
        >
          {t('issues.all_issues')} ({issues.length})
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'new'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-surface text-rose-700 hover:text-rose-800 border border-surface-hairline'
          }`}
        >
          <span>{t('issues.new_regressions')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">{countNew}</span>
        </button>
        <button
          onClick={() => setActiveTab('persisting')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'persisting'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-surface text-amber-700 hover:text-amber-800 border border-surface-hairline'
          }`}
        >
          <span>{t('issues.still_open')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">{countPersisting}</span>
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'resolved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-surface text-emerald-700 hover:text-emerald-800 border border-surface-hairline'
          }`}
        >
          <span>{t('issues.resolved')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">{countResolved}</span>
        </button>
        <button
          onClick={() => setActiveTab('ignored')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'ignored'
              ? 'bg-ink-muted text-white shadow-sm'
              : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
          }`}
        >
          <span>{t('issues.ignored')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">{countIgnored}</span>
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="editorial-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-severity-healthy-bg border border-severity-healthy-border flex items-center justify-center text-severity-healthy mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-title-md font-extrabold text-ink mb-2">
            {t('empty_states.no_issues_title')}
          </h3>
          <p className="text-body-md text-ink-muted max-w-md">
            {t('empty_states.no_issues_desc')}
          </p>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="editorial-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder={t('issues.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'critical', 'warning', 'notice'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    severityFilter === sev
                      ? 'bg-ink text-white'
                      : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
                  }`}
                >
                  {t(`issues.${sev}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Issues Table */}
          <div className="editorial-card overflow-hidden">
            <table className="w-full border-collapse text-left rtl:text-right text-body-md">
              <thead>
                <tr className="bg-surface border-b border-surface-hairline text-xs font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4">{t('issues.severity')}</th>
                  <th className="py-3 px-4">{t('issues.issue_type')}</th>
                  <th className="py-3 px-4">{t('issues.affected_url')}</th>
                  <th className="py-3 px-4">{t('issues.status_age')}</th>
                  <th className="py-3 px-4 text-center">{t('issues.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline">
                {filteredIssues.map((issue) => {
                  const resolvedTitle = resolveIssueTitle(issue, isAr);
                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-gold-tint/20 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            issue.severity === 'critical'
                              ? 'bg-severity-critical-bg text-severity-critical'
                              : issue.severity === 'warning'
                              ? 'bg-severity-warning-bg text-severity-warning'
                              : 'bg-severity-notice-bg text-severity-notice'
                          }`}
                        >
                          {issue.severity === 'critical' ? (
                            <AlertOctagon className="w-3.5 h-3.5" />
                          ) : issue.severity === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Info className="w-3.5 h-3.5" />
                          )}
                          {t(`issues.${issue.severity}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink text-xs">
                        {resolvedTitle}
                      </td>
                      <td className="py-3 px-4 text-ink-muted font-mono text-xs max-w-xs truncate">
                        {(issue.url || '').replace(/^\/+(https?:\/\/)/i, '$1')}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              issue.status === 'new'
                                ? 'bg-rose-100 text-rose-800'
                                : issue.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : issue.status === 'ignored'
                                ? 'bg-surface text-ink-muted border'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {getStatusBadge(issue.status)}
                          </span>
                          {issue.daysOpen !== undefined && issue.daysOpen > 0 && (
                            <span className="text-ink-muted text-[11px] font-medium">
                              {issue.daysOpen} {t('issues.days_open')}
                            </span>
                          )}
                          {issue.isBaseline && (
                            <span className="text-gold font-bold text-[10px] bg-gold-tint px-1.5 py-0.5 rounded">
                              {t('issues.baseline_badge')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ChevronRight className="w-4 h-4 text-ink-muted inline-block rtl:rotate-180" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Row-Click Issue Detail Drawer with Structured Evidence & Suggested Fix */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-hairline">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedIssue.severity === 'critical'
                      ? 'bg-severity-critical-bg text-severity-critical'
                      : selectedIssue.severity === 'warning'
                      ? 'bg-severity-warning-bg text-severity-warning'
                      : 'bg-severity-notice-bg text-severity-notice'
                  }`}
                >
                  {t(`issues.${selectedIssue.severity}`)}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface border text-ink-muted">
                  {getStatusBadge(selectedIssue.status)}
                </span>
                {selectedIssue.isBaseline && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-gold-tint text-gold border border-gold-border">
                    {t('issues.since_baseline')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 rounded-lg hover:bg-surface text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="my-6 space-y-6 flex-1">
              <div>
                <h3 className="text-title-md font-extrabold text-ink mb-2">
                  {resolveIssueTitle(selectedIssue, isAr)}
                </h3>
                <a
                  href={(selectedIssue.url || '').replace(/^\/+(https?:\/\/)/i, '$1')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-gold hover:text-gold-hover flex items-center gap-1 font-mono text-xs break-all"
                >
                  <span>{(selectedIssue.url || '').replace(/^\/+(https?:\/\/)/i, '$1')}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              {/* Accuracy Evidence Block */}
              <div className="editorial-card p-4 bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-ink uppercase tracking-wider">
                    {t('issues.audit_evidence')}
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {t('issues.two_step_confirmed')}
                  </span>
                </div>
                <div className="bg-ink text-white p-3 rounded-lg font-mono text-xs overflow-x-auto max-h-48 scrollbar-thin">
                  <pre>{JSON.stringify(selectedIssue.evidence || { url: selectedIssue.url, status: selectedIssue.status }, null, 2)}</pre>
                </div>
              </div>

              {/* Suggested Fix Block */}
              {selectedIssue.suggestion && (
                <div className="editorial-card p-4 bg-gold-tint/20 border border-gold-border space-y-2">
                  <h4 className="text-xs font-extrabold text-gold-hover uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-gold" />
                    <span>{t('issues.suggested_fix')}</span>
                  </h4>
                  <p className="text-body-sm text-ink-light">
                    {selectedIssue.suggestion.action || selectedIssue.suggestion.fix || JSON.stringify(selectedIssue.suggestion)}
                  </p>
                  {selectedIssue.suggestion.generated_jsonld && (
                    <div className="pt-2">
                      <div className="flex justify-between items-center text-xs font-bold text-ink-muted mb-1">
                        <span>{isAr ? 'كود JSON-LD المولد:' : 'Generated JSON-LD:'}</span>
                        <button
                          onClick={() => copyToClipboard(selectedIssue.suggestion.generated_jsonld, 'drawer-json')}
                          className="text-gold hover:underline flex items-center gap-1 text-xs"
                        >
                          {copiedKey === 'drawer-json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'drawer-json' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                        </button>
                      </div>
                      <pre className="bg-ink text-white p-3 rounded font-mono text-[11px] overflow-x-auto max-h-36">
                        {selectedIssue.suggestion.generated_jsonld}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* History & Provenance */}
              <div className="p-4 rounded-xl border border-surface-hairline text-xs space-y-2">
                <div className="font-bold text-ink-muted uppercase tracking-wider">
                  {isAr ? 'السجل والمصدر الأصلي' : 'Provenance & Timeline'}
                </div>
                <div className="flex justify-between text-ink">
                  <span>{isAr ? 'تاريخ الاكتشاف لأول مرة:' : 'First Discovered:'}</span>
                  <span className="font-bold">{selectedIssue.firstSeen}</span>
                </div>
                <div className="flex justify-between text-ink">
                  <span>{isAr ? 'عدد الأيام مفتوحة:' : 'Days Open:'}</span>
                  <span className="font-bold">{selectedIssue.daysOpen || 0} {t('issues.days_open')}</span>
                </div>
                <div className="flex justify-between text-ink">
                  <span>{isAr ? 'مصدر الرابط:' : 'Origin Source:'}</span>
                  <span className="font-bold text-gold">{selectedIssue.evidence?.source || 'internal_link'}</span>
                </div>
              </div>
            </div>

            {/* Actions: Re-check & Ignore */}
            <div className="pt-4 border-t border-surface-hairline flex items-center gap-3">
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex-1 py-2.5 px-4 bg-gold text-white font-bold rounded-xl hover:bg-gold-hover flex items-center justify-center gap-2 shadow-sm transition-all text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? t('issues.validating') : t('issues.validate_now')}</span>
              </button>

              <button
                onClick={() => {
                  if (onIgnoreIssue) {
                    onIgnoreIssue(selectedIssue.id, selectedIssue.status !== 'ignored');
                    setSelectedIssue(null);
                  }
                }}
                className="py-2.5 px-4 bg-surface hover:bg-gold-tint/40 text-ink font-bold rounded-xl border border-surface-hairline flex items-center gap-1.5 text-xs transition-colors"
              >
                {selectedIssue.status === 'ignored' ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('issues.unignore_issue')}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{t('issues.ignore_issue')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
