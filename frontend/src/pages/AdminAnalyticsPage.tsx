import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';
import { getAllLeads, syncLeadsFromCloud, LeadSubscriber } from '../lib/leadTracker';
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
  Send,
  X,
  Check,
  AlertCircle,
  Copy,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalAudits: number;
  recentProjects: any[];
}

export const AdminAnalyticsPage: React.FC = () => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 11,
    totalProjects: 2,
    totalAudits: 1,
    recentProjects: [],
  });
  const [leads, setLeads] = useState<LeadSubscriber[]>(() => getAllLeads());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Selected Lead for Detailed Profile Modal
  const [selectedLead, setSelectedLead] = useState<LeadSubscriber | null>(null);

  // Broadcast Announcement State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState(
    isAr
      ? '[SEO GPS] تحديث جديد في المنصة: واجهة مطورة وتتبع تراجعات فوري لموقعك'
      : '[SEO GPS] New Platform Update: Redesigned UI & Regression Monitoring'
  );
  const [customIntro, setCustomIntro] = useState(
    isAr
      ? 'أهلاً بك، تم إضافة تحديث جديد وشامل في SEO GPS يمكنك تجربته الآن'
      : 'Hello, a major new update is live in SEO GPS. You can try it now!'
  );

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch leads & projects directly via Cloud Edge Function (service role)
      const cloudResult = await syncLeadsFromCloud();
      const allMerged = cloudResult.leads.length > 0 ? cloudResult.leads : getAllLeads();
      setLeads(allMerged);

      // 2. Fetch projects count directly from client if authenticated
      const { data: projectsData, count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact' });

      // 3. Audit runs count
      const { count: auditCount } = await supabase
        .from('audit_runs')
        .select('*', { count: 'exact', head: true });

      const totalProj = Math.max(
        cloudResult.projects.length,
        projectCount || projectsData?.length || 1
      );

      setStats({
        totalUsers: allMerged.length,
        totalProjects: totalProj,
        totalAudits: Math.max(1, auditCount || 0),
        recentProjects: cloudResult.projects.length > 0 ? cloudResult.projects : (projectsData || []),
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

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSendBroadcast = async () => {
    setBroadcastStatus('sending');
    setBroadcastMsg('');

    const targetSubscribers = leads.map((l) => ({
      name: l.name,
      email: l.email,
    }));

    try {
      if (supabase) {
        for (const sub of targetSubscribers) {
          await supabase.functions.invoke('send-audit-report', {
            body: {
              type: 'broadcast_announcement',
              recipient: sub.email,
              userName: sub.name,
              customSubject: broadcastSubject,
              customMessage: customIntro,
            },
          });
        }
        setBroadcastStatus('success');
        setBroadcastMsg(
          isAr
            ? `تم إرسال الإشعار بنجاح إلى ${targetSubscribers.length} مشترك مسجل.`
            : `Update announcement successfully delivered to ${targetSubscribers.length} subscribers.`
        );
      }
    } catch (err: any) {
      setBroadcastStatus('error');
      setBroadcastMsg(err.message || 'Failed to dispatch broadcast');
    }
  };

  const filteredLeads = leads.filter((l) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.domain && l.domain.toLowerCase().includes(q))
    );
  });

  const exportLeadsToCSV = () => {
    const headers = ['Full Name', 'Email Address', 'Monitored Domain', 'Source', 'Registration Date'];
    const rows = leads.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.email.replace(/"/g, '""')}"`,
      `"${(l.domain || '').replace(/"/g, '""')}"`,
      `"${l.source || 'site_report'}"`,
      `"${l.created_at}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo_gps_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto" dir={dir}>
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {isAr ? 'لوحة المشرف العام' : 'Platform Administration'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
            <span>{isAr ? 'إدارة المشتركين وقاعدة بيانات العملاء' : 'Platform Analytics & Registered Subscribers'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAr
              ? 'متابعة لحظية ودقيقة لكافة المسجلين، مواقعهم المضافة، وبيانات الاتصال والتقارير.'
              : 'Real-time monitoring of all registered leads, their domains, contact information, and audit histories.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setIsBroadcastOpen(true);
              setBroadcastStatus('idle');
              setBroadcastMsg('');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-white text-xs font-bold hover:bg-gold-hover transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isAr ? 'إرسال إشعار لكافة المسجلين' : 'Broadcast Update Email'}</span>
          </button>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'إجمالي المشتركين والعملاء' : 'Total Registered Leads'}
            </span>
            <div className="p-2 rounded-xl bg-gold-tint text-gold border border-gold-border">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tnum">{leads.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {isAr ? 'مشترك سجلوا بريدهم ومواقعهم في المنصة' : 'Unique subscribers captured via gates and audits'}
          </div>
        </div>

        <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'المواقع المراقبة' : 'Monitored Domains'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tnum">{stats.totalProjects}</div>
          <div className="text-xs text-slate-400 mt-1">
            {isAr ? 'نطاقات نشطة مسجلة في قاعدة البيانات' : 'Websites configured for daily SEO monitoring'}
          </div>
        </div>

        <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'الفحوصات والتقارير' : 'Generated Audits'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tnum">{stats.totalAudits}</div>
          <div className="text-xs text-slate-400 mt-1">
            {isAr ? 'تقارير فحص ومراقبة تم إجراؤها' : 'Complete technical SEO crawls executed'}
          </div>
        </div>
      </div>

      {/* 3. Detailed Subscribers & Leads Table */}
      <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              <span>{isAr ? 'سجل المشتركين وتفاصيل العملاء المسجلين' : 'Subscribers & Registered Leads Details'}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-tint text-gold border border-gold-border">
                {leads.length} {isAr ? 'مشترك' : 'leads'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'قائمة مفصلة بكل مستخدم: الاسم، البريد، الموقع المرتبط، وتاريخ التسجيل.'
                : 'Detailed directory of every registrant: full name, verified email, target website, and timestamp.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLeadsToCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-gold" />
              <span>{isAr ? 'تصدير كملف CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، البريد أو الموقع...' : 'Search by name, email, or domain...'}
            className="w-full ps-10 pe-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-gold transition-all"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{isAr ? 'المشترك' : 'Subscriber'}</th>
                <th className="py-3 px-4">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</th>
                <th className="py-3 px-4">{isAr ? 'الموقع المسجل' : 'Registered Website'}</th>
                <th className="py-3 px-4">{isAr ? 'نوع التسجيل' : 'Source'}</th>
                <th className="py-3 px-4">{isAr ? 'تاريخ التسجيل' : 'Date'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {isAr ? 'لا توجد بيانات مطابقة للبحث' : 'No matching subscribers found'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Subscriber Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gold-tint border border-gold-border flex items-center justify-center text-gold text-xs font-black shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-extrabold">{lead.name}</span>
                    </td>

                    {/* Email with copy */}
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:text-gold hover:underline"
                        >
                          {lead.email}
                        </a>
                        <button
                          onClick={() => handleCopyEmail(lead.email)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={isAr ? 'نسخ البريد' : 'Copy email'}
                        >
                          {copiedEmail === lead.email ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="py-3.5 px-4">
                      {lead.domain ? (
                        <div className="flex items-center gap-1 font-mono text-gold font-bold">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.domain}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">{isAr ? 'عام' : 'General'}</span>
                      )}
                    </td>

                    {/* Source Badge */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                        {lead.source === 'signup'
                          ? (isAr ? 'بوابة التسجيل' : 'Access Gate')
                          : lead.source === 'quick_audit'
                          ? (isAr ? 'فحص سريع' : 'Quick Audit')
                          : (isAr ? 'تقرير شامل' : 'Site Report')}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="px-3 py-1 rounded-lg bg-gold-tint hover:bg-gold-tint/80 text-gold border border-gold-border font-bold text-xs transition-colors"
                      >
                        {isAr ? 'عرض التفاصيل' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Subscriber Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-black text-sm">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedLead.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedLead.email}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">{isAr ? 'الموقع المسجل:' : 'Registered Site:'}</span>
                  <span className="font-mono font-bold text-gold">{selectedLead.domain || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">{isAr ? 'تاريخ ووقت التسجيل:' : 'Registered At:'}</span>
                  <span className="font-mono">{new Date(selectedLead.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">{isAr ? 'قناة التسجيل:' : 'Channel:'}</span>
                  <span className="font-bold">{selectedLead.source || 'Direct Site Registration'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href={`mailto:${selectedLead.email}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gold hover:bg-gold-hover text-white font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isAr ? 'إرسال بريد للمشترك' : 'Send Email'}</span>
              </a>
              <button
                onClick={() => setSelectedLead(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Broadcast Announcement Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gold-tint flex items-center justify-center text-gold border border-gold-border">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isAr ? 'إرسال إشعار التحديث الجديد لكافة المسجلين' : 'Broadcast Update Announcement'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? `سيتم إرسال بريد إلكتروني رسمي ومصمم بأعلى احترافية إلى (${leads.length}) مشتركين.`
                      : `A professional update email will be dispatched to all (${leads.length}) subscribers.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {broadcastStatus === 'success' ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-black text-emerald-800 text-sm">
                  {isAr ? 'تم إرسال البريد بنجاح!' : 'Broadcast Dispatched Successfully!'}
                </h4>
                <p className="text-xs text-emerald-700">{broadcastMsg}</p>
                <button
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {broadcastStatus === 'error' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{broadcastMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'عنوان البريد (Subject)' : 'Email Subject'}
                  </label>
                  <input
                    type="text"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-gold font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الرسالة الافتتاحية للمشتركين' : 'Introductory Message'}
                  </label>
                  <textarea
                    rows={4}
                    value={customIntro}
                    onChange={(e) => setCustomIntro(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-gold leading-relaxed font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsBroadcastOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    disabled={broadcastStatus === 'sending'}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {broadcastStatus === 'sending' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isAr ? 'جارٍ الإرسال...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إرسال لجميع المشتركين' : 'Send to All Subscribers'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
