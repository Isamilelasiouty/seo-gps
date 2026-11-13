import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { X, Globe, Mail, Clock, ShieldCheck, User } from 'lucide-react';
import { ProjectData } from './EditProjectModal';
import { sanitizeInputUrl } from '../lib/siteCrawler';
import { saveLead } from '../lib/leadTracker';
import { supabase } from '../lib/supabase';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: ProjectData) => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [name, setName] = useState('');
  const [rootUrl, setRootUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [extraUrls, setExtraUrls] = useState('');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [crawlHour, setCrawlHour] = useState('06');
  const [crawlDay, setCrawlDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Requirement: Ensure modal opens clean with zero leftover state
  useEffect(() => {
    if (isOpen) {
      setName('');
      setRootUrl('');
      setSitemapUrl('');
      setExtraUrls('');
      setEmail('');
      setFrequency('daily');
      setCrawlHour('06');
      setCrawlDay('monday');
      setTimezone('UTC');
      setIsSubmitting(false);
      setFormError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Mandatory Email Validation
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError(isAr ? 'يرجى إدخال بريد إلكتروني صالح لتسجيل ومتابعة الموقع' : 'Please provide a valid email address');
      return;
    }

    // 2. Mandatory Name Validation
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError(isAr ? 'يرجى إدخال الاسم الكامل أو اسم المسؤول' : 'Please provide your full name');
      return;
    }

    // 3. Mandatory URL Validation
    const { cleanRoot, domain } = sanitizeInputUrl(rootUrl);
    if (!cleanRoot || !domain) {
      setFormError(isAr ? 'يرجى إدخال رابط موقع صحيح (مثال: https://example.com)' : 'Please provide a valid website URL');
      return;
    }

    setIsSubmitting(true);

    // Save lead into persistent local storage and database
    saveLead({
      name: cleanName,
      email: cleanEmail,
      domain: domain,
      source: 'manual',
    });

    // Notify administrator (Ismail) via Supabase Edge Function in background
    if (supabase) {
      supabase.functions.invoke('send-audit-report', {
        body: {
          type: 'lead_registration',
          userName: cleanName,
          userEmail: cleanEmail,
          domain: domain,
        },
      }).catch((err) => {
        console.warn('Lead notification dispatch caught:', err);
      });
    }

    const cleanSitemap = sitemapUrl.trim() ? sanitizeInputUrl(sitemapUrl).cleanRoot : '';
    const newProj: ProjectData = {
      id: `proj-${Date.now()}`,
      name: cleanName,
      domain: domain || 'example.com',
      root_url: cleanRoot,
      sitemap_url: cleanSitemap,
      extra_urls: extraUrls,
      frequency,
      daily_crawl_hour: parseInt(crawlHour, 10),
      crawl_day: crawlDay,
      timezone,
      recipient_email: cleanEmail,
      health_score: 100,
      last_run_at: undefined,
    };

    onSuccess(newProj);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-lg bg-white rounded-card shadow-2xl border border-surface-hairline overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-surface-hairline flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink">
              {t('onboarding.step_title') || (isAr ? 'إضافة موقع جديد للمراقبة والفحص' : 'Add Website for Monitoring')}
            </h3>
            <span className="text-xs font-semibold text-gold mt-0.5 inline-block">
              {isAr ? 'تسجيل إلزامي للبريد لتفعيل تنبيهات الفحص اليومي' : 'Mandatory email registration for automated audit alerts'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* User Name */}
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-severity-critical">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: محمد سعيد / شركة التقنية' : 'e.g. John Doe / Tech House'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          {/* Email Address - MANDATORY */}
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {isAr ? 'البريد الإلكتروني (لتلقي التقارير)' : 'Email Address (for Reports & Alerts)'} <span className="text-severity-critical">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              {isAr ? 'يتم حفظ البريد تلقائياً لإرسال تقرير الفحص وإشعارات التراجع.' : 'Used to deliver audit reports and regression alerts.'}
            </p>
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.root_url') || (isAr ? 'رابط الموقع (Root URL)' : 'Website URL')} <span className="text-severity-critical">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                required
                placeholder="https://example.com"
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          {/* Optional Sitemap */}
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.sitemap_url') || (isAr ? 'رابط خريطة الموقع (اختياري)' : 'Sitemap URL (Optional)')}
            </label>
            <input
              type="text"
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
            />
          </div>

          {/* Schedule Settings */}
          <div className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-body-sm">
              <Clock className="w-4 h-4 text-gold" />
              <span>{t('onboarding.schedule_title') || (isAr ? 'جدولة الفحص التلقائي' : 'Automated Crawl Schedule')}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['hourly', 'daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 text-center rounded-lg text-xs font-bold transition-all ${
                    frequency === freq
                      ? 'bg-gold text-white shadow-sm'
                      : 'bg-white border border-surface-hairline text-ink-muted hover:text-ink'
                  }`}
                >
                  {t(`project_actions.${freq}`) || freq}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-gold-tint/40 rounded-xl border border-gold-border text-xs text-ink-muted flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'بياناتك وبريدك في أمان تام ولا تتم مشاركتها إطلاقاً. تُستخدم فقط لإرسال تقارير موقعك.'
                : 'Your email is securely stored and used strictly for dispatching your website audits.'}
            </span>
          </div>

          <div className="pt-3 border-t border-surface-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-body-sm text-ink-muted hover:text-ink font-semibold"
            >
              {t('common.cancel') || 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all"
            >
              {isSubmitting ? '...' : (isAr ? 'بدء الفحص وحفظ الموقع' : 'Start Audit & Save Site')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
