import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { X, Globe, Mail, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { ProjectData } from './EditProjectModal';

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
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [rootUrl, setRootUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [crawlHour, setCrawlHour] = useState('06');
  const [crawlDay, setCrawlDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const domain = rootUrl.replace(/https?:\/\//, '').split('/')[0] || 'example.com';
    const newProj: ProjectData = {
      id: `proj-${Date.now()}`,
      name: name || domain,
      domain: domain,
      root_url: rootUrl,
      sitemap_url: sitemapUrl,
      frequency,
      daily_crawl_hour: parseInt(crawlHour, 10),
      crawl_day: crawlDay,
      timezone,
      recipient_email: email,
    };

    onSuccess(newProj);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-card shadow-2xl border border-surface-hairline overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-surface-hairline flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink">
              {t('onboarding.step_title')}
            </h3>
            <span className="text-xs font-semibold text-gold mt-0.5 inline-block">
              الحد الأقصى المجاني: 5 مواقع لكل مستخدم
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              اسم الموقع أو المشروع
            </label>
            <input
              type="text"
              required
              placeholder="متجري الإلكتروني / My Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:outline-none focus:border-gold-border"
            />
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.root_url')} <span className="text-severity-critical">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.sitemap_url')}
            </label>
            <input
              type="url"
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
            />
          </div>

          {/* Scheduling: Hourly, Daily, Weekly */}
          <div className="p-4 bg-surface rounded-xl border border-surface-hairline space-y-3">
            <label className="block text-body-sm font-bold text-ink flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gold" />
              <span>{t('project_actions.frequency')}</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['hourly', 'daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 px-3 rounded-lg text-body-sm font-bold border transition-all ${
                    frequency === freq
                      ? 'bg-gold text-white border-gold shadow-sm'
                      : 'bg-white border-surface-hairline text-ink-muted hover:text-ink'
                  }`}
                >
                  {t(`project_actions.${freq}`)}
                </button>
              ))}
            </div>

            {frequency === 'weekly' && (
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  {t('project_actions.day_of_week')}
                </label>
                <select
                  value={crawlDay}
                  onChange={(e) => setCrawlDay(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-surface-hairline text-body-sm text-ink"
                >
                  <option value="monday">الإثنين (Monday)</option>
                  <option value="tuesday">الثلاثاء (Tuesday)</option>
                  <option value="wednesday">الأربعاء (Wednesday)</option>
                  <option value="thursday">الخميس (Thursday)</option>
                  <option value="friday">الجمعة (Friday)</option>
                  <option value="saturday">السبت (Saturday)</option>
                  <option value="sunday">الأحد (Sunday)</option>
                </select>
              </div>
            )}

            {frequency !== 'hourly' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    {t('project_actions.hour_of_day')}
                  </label>
                  <select
                    value={crawlHour}
                    onChange={(e) => setCrawlHour(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-surface-hairline text-body-sm text-ink"
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const h = i < 10 ? `0${i}` : `${i}`;
                      return <option key={h} value={h}>{h}:00</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    {t('onboarding.timezone')}
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-surface-hairline text-body-sm text-ink"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (KSA)</option>
                    <option value="Africa/Cairo">Africa/Cairo (EGY)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.recipient_email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="email"
                placeholder="alerts@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <div className="p-3 bg-gold-tint/40 rounded-xl border border-gold-border text-xs text-ink-muted flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span>
              يتم حفظ الموقع في قاعدة بياناتك الخاصة، وتفعيل المراقبة الدورية المستمرة حسب جدولك المحدد.
            </span>
          </div>

          <div className="pt-3 border-t border-surface-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-body-sm text-ink-muted hover:text-ink font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all"
            >
              {isSubmitting ? 'جاري الحفظ...' : t('onboarding.start_crawl')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
