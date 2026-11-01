import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { X, Globe, Mail, Clock, ShieldCheck } from 'lucide-react';
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
  const [extraUrls, setExtraUrls] = useState('');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [crawlHour, setCrawlHour] = useState('06');
  const [crawlDay, setCrawlDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requirement 1: Ensure modal opens completely empty every time with zero leftover data
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
    }
  }, [isOpen]);

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
      extra_urls: extraUrls,
      frequency,
      daily_crawl_hour: parseInt(crawlHour, 10),
      crawl_day: crawlDay,
      timezone,
      recipient_email: email,
      health_score: 100,
      last_run_at: undefined,
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
              {t('header.projects_available')}
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
              {t('admin.table_name')} <span className="text-severity-critical">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Website / موقعي الأول"
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

          {/* Extra URLs to check (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-body-sm font-bold text-ink">
                {t('onboarding.extra_urls_label') || "Extra URLs to check (Optional)"}
              </label>
              <label className="text-xs text-gold font-semibold cursor-pointer hover:underline">
                <span>{t('onboarding.upload_file') || "Upload TXT/CSV"}</span>
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          setExtraUrls((prev) => prev ? `${prev}\n${content}` : content);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Paste URLs to check (one per line), e.g. 404 export from Google Search Console"
              value={extraUrls}
              onChange={(e) => setExtraUrls(e.target.value)}
              className="w-full px-4 py-2 bg-surface rounded-lg border border-surface-hairline text-body-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border font-mono text-xs"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              {t('onboarding.extra_urls_hint') || "Discovered & reported with source=imported"}
            </p>
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
                  <option value="monday">{t('project_actions.days.monday')}</option>
                  <option value="tuesday">{t('project_actions.days.tuesday')}</option>
                  <option value="wednesday">{t('project_actions.days.wednesday')}</option>
                  <option value="thursday">{t('project_actions.days.thursday')}</option>
                  <option value="friday">{t('project_actions.days.friday')}</option>
                  <option value="saturday">{t('project_actions.days.saturday')}</option>
                  <option value="sunday">{t('project_actions.days.sunday')}</option>
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
              {t('auth.subtitle')}
            </span>
          </div>

          <div className="pt-3 border-t border-surface-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-body-sm text-ink-muted hover:text-ink font-semibold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all"
            >
              {isSubmitting ? '...' : t('onboarding.start_crawl')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
