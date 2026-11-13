import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { resolveIssueTitle } from '../lib/siteCrawler';
import { verifyIssueLive, markIssueResolved } from '../lib/snapshotManager';
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
  ListTodo,
  Table as TableIcon,
  Sparkles,
  ShieldCheck,
  ArrowRight,
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
  projectId?: string;
  onIgnoreIssue?: (id: string, ignored: boolean) => void;
  onRecheckIssue?: (issue: IssueItem) => void;
}

export const IssuesPage: React.FC<IssuesPageProps> = ({
  issues = [],
  projectId = 'default-project',
  onIgnoreIssue,
  onRecheckIssue,
}) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [localIssues, setLocalIssues] = useState<IssueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'todo' | 'table'>('todo');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved' | 'critical' | 'warning'>('all');
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    id: string;
    success: boolean;
    reason: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync incoming issues prop with local state and sanitize URLs
  useEffect(() => {
    const cleaned = (issues || [])
      .filter((i) => i && i.checkId !== 'connection_timeout' && !i.url?.startsWith('/http'))
      .map((i) => {
        let rawUrl = (i.url || '').replace(/^\/+(https?:\/\/)/i, '$1');
        try {
          rawUrl = decodeURI(rawUrl);
        } catch (e) {}
        return {
          ...i,
          url: rawUrl,
        };
      });
    setLocalIssues(cleaned);
  }, [issues]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Live Re-Check & Verification Action
  const handleVerifyAndMarkDone = async (issue: IssueItem) => {
    setVerifyingId(issue.id);
    setVerificationFeedback(null);

    const result = await verifyIssueLive(issue.url, issue.checkId, isAr);
    setVerifyingId(null);

    if (result.verified) {
      // Mark as resolved in local state
      setLocalIssues((prev) =>
        prev.map((iss) => (iss.id === issue.id ? { ...iss, status: 'resolved' } : iss))
      );

      // Persist across localStorage and Supabase
      await markIssueResolved(projectId, issue.id, issue);

      setVerificationFeedback({
        id: issue.id,
        success: true,
        reason: result.reason || (isAr ? 'تم التحقق من الإصلاح بنجاح! الرابط يستجيب بصورة سليمة.' : 'Verified successfully! The URL is now responding properly.'),
      });

      if (onRecheckIssue) {
        onRecheckIssue({ ...issue, status: 'resolved' });
      }
    } else {
      // Strict rejection: issue still broken on website
      let failureReason = result.reason || '';
      if (!failureReason) {
        failureReason = isAr
          ? 'لم يتم حل المشكلة: ما زالت المشكلة قائمة في الصفحة المستهدفة على الموقع'
          : 'Issue not resolved: The issue still persists on the target page';
      } else if (!failureReason.startsWith('لم يتم حل المشكلة') && !failureReason.startsWith('Issue not resolved')) {
        failureReason = isAr ? `لم يتم حل المشكلة: ${failureReason}` : `Issue not resolved: ${failureReason}`;
      }

      setVerificationFeedback({
        id: issue.id,
        success: false,
        reason: failureReason,
      });
    }
  };

  const totalCount = localIssues.length;
  const resolvedCount = localIssues.filter((i) => i.status === 'resolved').length;
  const pendingCount = totalCount - resolvedCount;
  const criticalCount = localIssues.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const warningCount = localIssues.filter((i) => i.severity === 'warning' && i.status !== 'resolved').length;
  const progressPercent = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const filteredIssues = localIssues.filter((iss) => {
    // 1. Tab filter
    if (activeTab === 'pending' && iss.status === 'resolved') return false;
    if (activeTab === 'resolved' && iss.status !== 'resolved') return false;
    if (activeTab === 'critical' && (iss.severity !== 'critical' || iss.status === 'resolved')) return false;
    if (activeTab === 'warning' && (iss.severity !== 'warning' || iss.status === 'resolved')) return false;

    // 2. Search
    if (!searchTerm) return true;
    const resolvedTitle = resolveIssueTitle(iss, isAr);
    return (
      resolvedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iss.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iss.checkId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return isAr ? 'جديدة' : 'New';
      case 'persisting':
        return isAr ? 'مستمرة' : 'Persisting';
      case 'resolved':
        return isAr ? 'تم الحل' : 'Resolved';
      case 'ignored':
        return isAr ? 'متجاهلة' : 'Ignored';
      default:
        return status;
    }
  };

  const handleExportCSV = () => {
    if (filteredIssues.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['URL,Issue,Severity,Status,Days Open']
        .concat(
          filteredIssues.map(
            (i) =>
              `"${i.url}","${resolveIssueTitle(i, isAr)}","${i.severity}","${i.status}","${i.daysOpen || 0}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seo-issues-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* 1. Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <span>{isAr ? 'مركز معالجة المشاكل وقائمة المهام' : 'Issue Resolution & Action Checklist'}</span>
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {isAr
              ? 'تتبع وإصلاح مشاكل الـ SEO مع ميزة الفحص والتحقق المباشر من الروابط بمجرد الضغط على تم الحل'
              : 'Track and resolve technical SEO issues with live HTTP verification upon marking tasks as done.'}
          </p>
        </div>

        {/* View Switcher: To-Do vs Table */}
        <div className="flex items-center gap-3">
          <div className="bg-surface border border-surface-hairline p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('todo')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                viewMode === 'todo'
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>{isAr ? 'قائمة المهام' : 'To-Do List'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>{isAr ? 'الجدول التفصيلي' : 'Table View'}</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-tint border border-surface-hairline text-ink font-bold rounded-xl text-xs transition-colors"
          >
            <Download className="w-4 h-4 text-ink-muted" />
            <span>{isAr ? 'تصدير البيانات' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 2. Resolution Progress Overview Card */}
      <div className="editorial-card p-5 bg-gradient-to-r from-surface to-gold-tint/20 border-surface-hairline">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gold uppercase tracking-wider">
                {isAr ? 'معدل إنجاز إصلاح المشاكل' : 'Resolution Progress'}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {resolvedCount} {isAr ? 'تم التحقق وحلها' : 'Verified Fixed'}
              </span>
            </div>
            <div className="text-title-lg font-black text-ink">
              {progressPercent}% {isAr ? 'من إجمالي المشاكل المكتشفة تم إصلاحها' : 'of detected issues resolved'}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-title-md font-black text-severity-critical">{criticalCount}</div>
              <div className="text-[11px] font-bold text-ink-muted">{isAr ? 'حرجة متبقية' : 'Critical Open'}</div>
            </div>
            <div className="text-center">
              <div className="text-title-md font-black text-severity-warning">{warningCount}</div>
              <div className="text-[11px] font-bold text-ink-muted">{isAr ? 'تحذيرات' : 'Warnings'}</div>
            </div>
            <div className="text-center">
              <div className="text-title-md font-black text-emerald-600">{resolvedCount}</div>
              <div className="text-[11px] font-bold text-ink-muted">{isAr ? 'مكتملة' : 'Completed'}</div>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-surface-hairline h-2.5 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: isAr ? 'جميع المهام' : 'All Tasks', count: totalCount },
            { id: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending', count: pendingCount },
            { id: 'critical', label: isAr ? 'حرجة' : 'Critical', count: criticalCount },
            { id: 'warning', label: isAr ? 'تحذيرات' : 'Warnings', count: warningCount },
            { id: 'resolved', label: isAr ? 'تم حلها بنجاح' : 'Resolved', count: resolvedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-surface text-ink-muted hover:text-ink border border-surface-hairline'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-surface-hairline'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالرابط أو اسم المشكلة...' : 'Search URL or issue...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* 4. Main Body: To-Do View vs Table View */}
      {filteredIssues.length === 0 ? (
        <div className="editorial-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-title-md font-bold text-ink mb-1">
            {isAr ? 'لا توجد مشاكل مطابقة في هذا التصنيف' : 'No matching issues found'}
          </h3>
          <p className="text-body-sm text-ink-muted">
            {isAr ? 'كافة المشاكل المحددة تم فحصها أو معالجتها بنجاح.' : 'All specified tasks have been verified or resolved.'}
          </p>
        </div>
      ) : viewMode === 'todo' ? (
        /* Actionable To-Do Checklist View */
        <div className="space-y-3.5">
          {filteredIssues.map((issue) => {
            const isResolved = issue.status === 'resolved';
            const isVerifying = verifyingId === issue.id;
            const feedback = verificationFeedback?.id === issue.id ? verificationFeedback : null;
            const title = resolveIssueTitle(issue, isAr);

            return (
              <div
                key={issue.id}
                className={`editorial-card p-5 transition-all border ${
                  isResolved
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : issue.severity === 'critical'
                    ? 'border-rose-200 hover:border-rose-300'
                    : issue.severity === 'warning'
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-surface-hairline'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Issue Content */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : issue.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : issue.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isResolved
                          ? (isAr ? 'تم الحل بنجاح' : 'Resolved')
                          : issue.severity === 'critical'
                          ? (isAr ? 'حرجة' : 'Critical')
                          : issue.severity === 'warning'
                          ? (isAr ? 'تحذير' : 'Warning')
                          : (isAr ? 'ملاحظة' : 'Notice')}
                      </span>

                      <span className="text-xs font-mono text-ink-muted">
                        {isAr ? 'المعرف:' : 'Check ID:'} {issue.checkId}
                      </span>
                    </div>

                    <h3 className={`text-body-md font-extrabold ${isResolved ? 'line-through text-ink-muted' : 'text-ink'}`}>
                      {title}
                    </h3>

                    {/* URL */}
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted font-mono break-all">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline flex items-center gap-1"
                      >
                        <span>{issue.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>

                    {/* Action Suggestion */}
                    {issue.suggestion && (
                      <div className="mt-2.5 p-3 rounded-lg bg-surface border border-surface-hairline text-xs text-ink space-y-1.5">
                        <div className="font-bold text-gold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isAr ? 'طريقة الإصلاح المقترحة:' : 'Recommended Fix:'}</span>
                        </div>
                        <p className="text-ink-muted leading-relaxed">
                          {issue.suggestion.action || issue.suggestion.fix || JSON.stringify(issue.suggestion)}
                        </p>

                        {issue.suggestion.generated_jsonld && (
                          <div className="pt-2">
                            <button
                              onClick={() => copyToClipboard(issue.suggestion.generated_jsonld, `todo-json-${issue.id}`)}
                              className="text-gold font-bold hover:underline flex items-center gap-1 text-[11px]"
                            >
                              {copiedKey === `todo-json-${issue.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `todo-json-${issue.id}` ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ كود البيانات المنظمة' : 'Copy Suggested Schema')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Verification Feedback Banner */}
                    {feedback && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 mt-2 animate-in fade-in ${
                          feedback.success
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}
                      >
                        {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span>{feedback.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Verification Action Button */}
                  <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                    {isResolved ? (
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{isAr ? 'تم التحقق من الإصلاح' : 'Verified Fixed'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleVerifyAndMarkDone(issue)}
                        disabled={isVerifying}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-hover text-white font-extrabold rounded-xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                        <span>
                          {isVerifying
                            ? (isAr ? 'جاري الفحص المباشر...' : 'Verifying...')
                            : (isAr ? 'فحص والتأكيد كمحلول' : 'Verify & Mark Done')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="editorial-card overflow-hidden">
          <table className="w-full text-right rtl:text-right ltr:text-left text-body-sm">
            <thead className="bg-surface border-b border-surface-hairline text-xs font-bold text-ink-muted uppercase">
              <tr>
                <th className="py-3 px-4">{t('issues.severity')}</th>
                <th className="py-3 px-4">{t('issues.issue_name')}</th>
                <th className="py-3 px-4">{t('issues.page_url')}</th>
                <th className="py-3 px-4">{t('issues.status')}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'التحقق والإصلاح' : 'Verify Fix'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hairline">
              {filteredIssues.map((issue) => {
                const isResolved = issue.status === 'resolved';
                const isVerifying = verifyingId === issue.id;

                return (
                  <tr key={issue.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          issue.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : issue.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {issue.severity === 'critical'
                          ? (isAr ? 'حرجة' : 'Critical')
                          : issue.severity === 'warning'
                          ? (isAr ? 'تحذير' : 'Warning')
                          : (isAr ? 'ملاحظة' : 'Notice')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-ink">
                      {resolveIssueTitle(issue, isAr)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-ink-muted max-w-xs truncate">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="hover:text-gold hover:underline">
                        {issue.url}
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-surface text-ink-muted border'}`}>
                        {getStatusBadge(issue.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isResolved ? (
                        <span className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تم الحل' : 'Resolved'}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVerifyAndMarkDone(issue)}
                          disabled={isVerifying}
                          className="px-3 py-1.5 bg-surface hover:bg-gold hover:text-white border border-surface-hairline text-ink font-bold rounded-lg text-xs transition-colors flex items-center gap-1 mx-auto"
                        >
                          <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                          <span>{isVerifying ? '...' : (isAr ? 'تحقق' : 'Verify')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
