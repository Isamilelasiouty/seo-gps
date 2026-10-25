import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { X, Globe, Mail, Clock, Trash2, Save, Calendar } from 'lucide-react';

export interface ProjectData {
  id: string;
  name: string;
  domain: string;
  root_url: string;
  sitemap_url?: string;
  daily_crawl_hour?: number;
  timezone?: string;
  frequency?: 'hourly' | 'daily' | 'weekly';
  crawl_day?: string;
  recipient_email?: string;
  health_score?: number;
  last_run_at?: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
  onSave: (updatedProject: ProjectData) => void;
  onDelete: (projectId: string) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  onDelete,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [rootUrl, setRootUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [crawlHour, setCrawlHour] = useState('06');
  const [crawlDay, setCrawlDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setRootUrl(project.root_url || `https://${project.domain}`);
      setSitemapUrl(project.sitemap_url || '');
      setFrequency(project.frequency || 'daily');
      setCrawlHour(String(project.daily_crawl_hour ?? 6).padStart(2, '0'));
      setCrawlDay(project.crawl_day || 'monday');
      setTimezone(project.timezone || 'UTC');
      setEmail(project.recipient_email || '');
      setIsSaving(false);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onSave({
        ...project,
        name,
        root_url: rootUrl,
        domain: rootUrl.replace(/https?:\/\//, '').split('/')[0] || project.domain,
        sitemap_url: sitemapUrl,
        frequency,
        daily_crawl_hour: parseInt(crawlHour, 10),
        crawl_day: crawlDay,
        timezone,
        recipient_email: email,
      });
      setIsSaving(false);
      onClose();
    }, 400);
  };

  const handleDelete = () => {
    if (window.confirm(t('project_actions.delete_confirm'))) {
      onDelete(project.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-card shadow-2xl border border-surface-hairline overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-hairline flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-extrabold text-ink">
              {t('onboarding.edit_title')}
            </h3>
            <span className="text-xs text-ink-muted">
              {project.domain}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('admin.table_name')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:outline-none focus:border-gold-border"
            />
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.root_url')}
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="url"
                required
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:outline-none focus:border-gold-border"
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
              className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:outline-none focus:border-gold-border"
            />
          </div>

          {/* Flexible Scheduling Options: Hourly, Daily, Weekly */}
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
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          {/* Action buttons: Save & Delete */}
          <div className="pt-4 border-t border-surface-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl text-severity-critical border border-severity-critical-border bg-severity-critical-bg hover:bg-red-100 text-body-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('project_actions.delete')}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-body-sm text-ink-muted hover:text-ink font-semibold"
              >
                {t('project_actions.delete') ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? '...' : t('onboarding.save_changes')}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
