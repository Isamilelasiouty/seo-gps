import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';
import { getAllLeads, LeadSubscriber } from '../lib/leadTracker';
import {
  ShieldCheck,
  Users,
  Globe,
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Download,
  Mail,
  User,
  ExternalLink,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalAudits: number;
  recentProjects: any[];
}

export const AdminAnalyticsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const isAr = locale !== 'en';

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 9,
    totalProjects: 1,
    totalAudits: 1,
    recentProjects: [],
  });
  const [leads, setLeads] = useState<LeadSubscriber[]>(() => getAllLeads());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Projects count & data
      const { data: projectsData, count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact' });

      // 2. Audit runs count
      const { count: auditCount } = await supabase
        .from('audit_runs')
        .select('*', { count: 'exact', head: true });

      // 3. Email logs for additional leads
      let dbLeads: LeadSubscriber[] = [];
      try {
        const { data: logsData } = await supabase
          .from('email_logs')
          .select('*')
          .order('sent_at', { ascending: false });

        if (logsData && Array.isArray(logsData)) {
          dbLeads = logsData.map((log: any) => {
            const subj = log.subject || '';
            let leadName = '';
            const matchName = subj.match(/\[Lead:\s*([^\]]+)\]/i);
            if (matchName) leadName = matchName[1].trim();
            return {
              id: log.id,
              name: leadName || log.recipient.split('@')[0],
              email: log.recipient,
              domain: subj.includes('for ') ? subj.split('for ')[1].trim() : undefined,
              source: 'site_report' as const,
              created_at: log.sent_at,
            };
          });
        }
      } catch (logErr) {
        console.warn('Could not query email_logs:', logErr);
      }

      // Merge local leads with db leads
      const allMerged = [...getAllLeads()];
      dbLeads.forEach((dl) => {
        if (!allMerged.some((m) => m.email.toLowerCase() === dl.email.toLowerCase())) {
          allMerged.push(dl);
        }
      });
      setLeads(allMerged);

      setStats({
        totalUsers: allMerged.length,
        totalProjects: projectCount || projectsData?.length || 1,
        totalAudits: Math.max(1, auditCount || 0),
        recentProjects: projectsData || [],
      });
    } catch (err) {
      console.warn('Admin stats fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const filteredLeads = leads.filter((l) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.domain && l.domain.toLowerCase().includes(q))
    );
  });

  const exportLeadsToCSV = () => {
    const headers = ['Name,Email,Monitored Domain,Source,Registered At'];
    const rows = filteredLeads.map((l) =>
      `"${l.name.replace(/"/g, '""')}","${l.email}","${l.domain || ''}","${l.source || ''}","${l.created_at}"`
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo_gps_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-gold mb-1">
            {isAr ? 'لوحة تحكم المدير العام' : 'Owner & Admin Overview'}
          </div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-gold" />
            <span>{isAr ? 'إحصائيات وإدارة المنصة' : 'Platform Analytics & Leads'}</span>
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {isAr
              ? 'متابعة مباشرة لعدد المشتركين المسجلين، المواقع المراقبة، وطلبات التقارير.'
              : 'Live tracking of registered subscribers, monitored sites, and audit requests.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-surface-hairline text-body-sm font-bold text-ink hover:border-gold-border transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="editorial-card p-6 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">{isAr ? 'إجمالي المشتركين المسجلين' : 'Total Subscribers'}</span>
            <Users className="w-5 h-5 text-gold" />
          </div>
          <div className="text-3xl font-black text-ink tnum">
            {leads.length}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            {isAr ? 'عملاء ومستخدمين مسجلين لاستقبال التقارير' : 'Users registered for ongoing reports'}
          </div>
        </div>

        <div className="editorial-card p-6 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">{isAr ? 'المواقع المراقبة النشطة' : 'Active Monitored Sites'}</span>
            <Globe className="w-5 h-5 text-gold" />
          </div>
          <div className="text-3xl font-black text-ink tnum">
            {stats.totalProjects}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            {isAr ? 'نطاقات تخضع للمراقبة اليومية المجدولة' : 'Domains under daily automated audit'}
          </div>
        </div>

        <div className="editorial-card p-6 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">{isAr ? 'عمليات الفحص الناجحة' : 'Successful Audits'}</span>
            <Activity className="w-5 h-5 text-gold" />
          </div>
          <div className="text-3xl font-black text-ink tnum">
            {stats.totalAudits}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            {isAr ? 'تقارير فنية تم توليدها وتوثيقها' : 'Complete audits generated'}
          </div>
        </div>
      </div>

      {/* Leads / Subscribers Management Table */}
      <div className="editorial-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-hairline">
          <div>
            <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              <span>{isAr ? 'سجل المشتركين والعملاء المسجلين' : 'Registered Subscribers & Leads List'}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-tint text-gold border border-gold-border">
                {leads.length} {isAr ? 'مشترك' : 'leads'}
              </span>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {isAr
                ? 'قائمة بجميع الأشخاص الذين سجلوا بياناتهم وإيميلاتهم لتلقي تقارير المواقع.'
                : 'All individuals who registered their name & email to receive reports.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLeadsToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-surface-hairline text-ink text-xs font-bold hover:border-gold shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-gold" />
              <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-ink-muted absolute start-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، البريد أو الموقع...' : 'Search by name, email, or domain...'}
            className="w-full ps-9 pe-3 py-2 bg-surface rounded-xl border border-surface-hairline text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold"
          />
        </div>

        {/* Table */}
        <div className="divide-y divide-surface-hairline overflow-x-auto border border-surface-hairline rounded-xl">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="bg-surface-muted/30 text-ink-muted font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4">{isAr ? 'الاسم' : 'Name'}</th>
                <th className="py-2.5 px-4">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</th>
                <th className="py-2.5 px-4">{isAr ? 'الموقع المطلوب' : 'Monitored Site'}</th>
                <th className="py-2.5 px-4">{isAr ? 'المصدر' : 'Source'}</th>
                <th className="py-2.5 px-4">{isAr ? 'تاريخ التسجيل' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hairline">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-muted">
                    {isAr ? 'لا توجد نتائج مطابقة للبحث' : 'No matching subscribers found'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-gold-tint/15 transition-colors">
                    <td className="py-3 px-4 font-bold text-ink flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gold-tint flex items-center justify-center text-gold text-[10px] font-black shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{lead.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink">
                      <a
                        href={`mailto:${lead.email}`}
                        className="hover:text-gold hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{lead.email}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-muted">
                      {lead.domain || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-surface-hairline text-ink">
                        {lead.source === 'signup'
                          ? (isAr ? 'تسجيل حساب' : 'Account')
                          : lead.source === 'quick_audit'
                          ? (isAr ? 'فحص فوري' : 'Quick Audit')
                          : (isAr ? 'تقرير شامل' : 'Site Report')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-muted">
                      {new Date(lead.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitored Websites Inventory */}
      <div className="editorial-card p-6">
        <h3 className="font-extrabold text-title-sm text-ink mb-4 pb-3 border-b border-surface-hairline flex items-center justify-between">
          <span>{isAr ? 'سجل المواقع المراقبة' : 'Monitored Websites Inventory'}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gold-tint text-gold border border-gold-border">
            {stats.recentProjects.length} {isAr ? 'موقع نشط' : 'active sites'}
          </span>
        </h3>

        {stats.recentProjects.length === 0 ? (
          <div className="text-center py-8 text-body-md text-ink-muted">
            {isAr ? 'لا توجد مواقع مسجلة حتى الآن' : 'No projects registered yet'}
          </div>
        ) : (
          <div className="divide-y divide-surface-hairline overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-body-md">
              <thead>
                <tr className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">{isAr ? 'اسم المشروع' : 'Name'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الدومين' : 'Domain'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'درجة الصحة' : 'Health'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'تاريخ الإضافة' : 'Created'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hairline/60">
                {stats.recentProjects.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gold-tint/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-ink">{p.name}</td>
                    <td className="py-3 px-3 font-mono text-xs text-ink-muted">{p.domain}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-severity-healthy-bg text-severity-healthy font-bold text-xs">
                        {p.health_score ?? 100}/100
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-ink-muted">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
