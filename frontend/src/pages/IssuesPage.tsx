import React, { useState } from 'react';
import { useI18n } from '../i18n';
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
} from 'lucide-react';

export interface IssueItem {
  id: string;
  url: string;
  checkId: string;
  title: string;
  severity: 'critical' | 'warning' | 'notice';
  firstSeen: string;
  lastSeen: string;
  before: string;
  after: string;
  status: 'open' | 'resolved' | 'ignored';
}

interface IssuesPageProps {
  issues?: IssueItem[];
}

export const IssuesPage: React.FC<IssuesPageProps> = ({ issues = [] }) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const filteredIssues = issues.filter((iss) => {
    const matchesSearch =
      iss.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iss.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = severityFilter === 'all' || iss.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
    }, 1500);
  };

  const handleExportCSV = () => {
    if (filteredIssues.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['URL,Issue,Severity,First Seen,Status']
        .concat(filteredIssues.map((i) => `"${i.url}","${i.title}","${i.severity}","${i.firstSeen}","${i.status}"`))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seo_gps_issues_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {t('issues.title')}
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {t('issues.subtitle')}
          </p>
        </div>

        {issues.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-hairline bg-white text-body-sm font-semibold text-ink hover:bg-surface transition-colors"
            >
              <Download className="w-4 h-4 text-ink-muted" />
              <span>{t('issues.export_csv')}</span>
            </button>
          </div>
        )}
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
                className="w-full pl-9 pr-4 py-2 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
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
                  <th className="py-3 px-4">{t('issues.first_seen')}</th>
                  <th className="py-3 px-4 text-center">{t('issues.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline">
                {filteredIssues.map((issue) => (
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
                    <td className="py-3 px-4 font-bold text-ink">
                      {issue.title}
                    </td>
                    <td className="py-3 px-4 text-ink-muted font-mono text-xs max-w-xs truncate">
                      {issue.url}
                    </td>
                    <td className="py-3 px-4 text-ink-muted text-xs">
                      {issue.firstSeen}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ChevronRight className="w-4 h-4 text-ink-muted inline-block rtl:rotate-180" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Row-Click Issue Detail Drawer */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-4 border-b border-surface-hairline">
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
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 rounded-lg hover:bg-surface text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-6 space-y-6 flex-1">
              <div>
                <h3 className="text-title-md font-extrabold text-ink mb-2">
                  {selectedIssue.title}
                </h3>
                <a
                  href={selectedIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-gold hover:text-gold-hover flex items-center gap-1 break-all"
                >
                  <span>{selectedIssue.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              {/* Before vs After Diff View */}
              <div className="editorial-card p-4 bg-surface">
                <h4 className="eyebrow mb-3">{t('issues.before_after')}</h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <span className="text-xs font-bold text-red-700 block mb-1">Previous:</span>
                    <span className="text-body-sm font-mono text-red-900">{selectedIssue.before}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-xs font-bold text-green-700 block mb-1">Current:</span>
                    <span className="text-body-sm font-mono text-green-900">{selectedIssue.after}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validate Fix / Re-check Button */}
            <div className="pt-4 border-t border-surface-hairline flex items-center gap-3">
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex-1 py-3 px-4 bg-gold text-white font-bold rounded-xl hover:bg-gold-hover flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? 'Checking...' : t('issues.validate_fix')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
