import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { ProjectData } from '../components/EditProjectModal';
import {
  Save,
  Trash2,
  Bell,
  Clock,
  Globe,
  Sliders,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface SettingsPageProps {
  projects: ProjectData[];
  activeProject: ProjectData | null;
  onSelectProject: (p: ProjectData) => void;
  onSaveProject: (p: ProjectData) => Promise<void> | void;
  onDeleteProject: (id: string) => Promise<void> | void;
  onOpenAddProject: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onSaveProject,
  onDeleteProject,
  onOpenAddProject,
}) => {
  const { t } = useI18n();

  // Local state for active project form
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [rootUrl, setRootUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [crawlHour, setCrawlHour] = useState(6);
  const [crawlDay, setCrawlDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [notifyNotice, setNotifyNotice] = useState(false);
  const [ignorePatterns, setIgnorePatterns] = useState('?utm_*, /page/*');
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state whenever activeProject changes
  useEffect(() => {
    if (activeProject) {
      setName(activeProject.name || '');
      setDomain(activeProject.domain || '');
      setRootUrl(activeProject.root_url || '');
      setSitemapUrl(activeProject.sitemap_url || '');
      setFrequency(activeProject.frequency || 'daily');
      setCrawlHour(activeProject.daily_crawl_hour ?? 6);
      setCrawlDay(activeProject.crawl_day || 'monday');
      setTimezone(activeProject.timezone || 'UTC');
      setRecipientEmail(activeProject.recipient_email || '');
    }
  }, [activeProject]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const updated: ProjectData = {
      ...activeProject,
      name: name.trim() || activeProject.name,
      domain: domain.trim() || activeProject.domain,
      root_url: rootUrl.trim() || activeProject.root_url,
      sitemap_url: sitemapUrl.trim() || undefined,
      frequency,
      daily_crawl_hour: Number(crawlHour),
      crawl_day: frequency === 'weekly' ? crawlDay : undefined,
      timezone,
      recipient_email: recipientEmail.trim() || undefined,
    };

    await onSaveProject(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDelete = async () => {
    if (!activeProject) return;
    const confirmed = window.confirm(t('settings.delete_confirm'));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDeleteProject(activeProject.id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Case 1: No projects registered
  if (projects.length === 0 || !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-xl mx-auto text-center p-8 bg-surface rounded-card border border-surface-hairline shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold mb-5">
          <Globe className="w-8 h-8" />
        </div>
        <h2 className="text-title-lg font-black text-ink mb-2">
          {t('empty_states.no_projects_title')}
        </h2>
        <p className="text-body-md text-ink-muted leading-relaxed mb-6">
          {t('empty_states.no_projects_desc')}
        </p>
        <button
          onClick={onOpenAddProject}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('empty_states.add_first_project')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* 1. Projects Switcher Bar (Requirement #5) */}
      <div className="editorial-card p-4 space-y-3">
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">
          {t('settings.select_to_manage')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {projects.map((p) => {
            const isSelected = p.id === activeProject.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-body-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-gold-tint border-gold-border text-gold-hover shadow-sm ring-1 ring-gold'
                    : 'bg-surface border-surface-hairline text-ink hover:border-gold-border hover:bg-white'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-gold' : 'bg-ink-muted/40'}`}></span>
                <span>{p.name}</span>
                <span className="text-xs text-ink-muted font-mono opacity-80">({p.domain})</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenAddProject}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gold-border text-gold font-bold text-xs hover:bg-gold-tint/40 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('header.add_project')}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Basic Website Information */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Globe className="w-5 h-5 text-gold" />
            <span>{t('project_actions.edit')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('admin.table_name')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:border-gold-border focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('admin.table_domain')}
              </label>
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:border-gold-border focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('onboarding.root_url')}
              </label>
              <input
                type="url"
                required
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:border-gold-border focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('onboarding.sitemap_url')}
              </label>
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:border-gold-border focus:outline-none font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* 3. Schedule & Timings */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            <span>{t('settings.schedule_title')}</span>
          </h3>
          <p className="text-body-sm text-ink-muted">
            {t('settings.schedule_desc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Frequency */}
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('project_actions.frequency')}
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink font-semibold"
              >
                <option value="hourly">{t('project_actions.hourly')}</option>
                <option value="daily">{t('project_actions.daily')}</option>
                <option value="weekly">{t('project_actions.weekly')}</option>
              </select>
            </div>

            {/* Hour */}
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('project_actions.hour_of_day')}
              </label>
              <select
                value={crawlHour}
                onChange={(e) => setCrawlHour(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = i < 10 ? `0${i}` : `${i}`;
                  return <option key={i} value={i}>{h}:00</option>;
                })}
              </select>
            </div>

            {/* Day (if weekly) or Timezone */}
            {frequency === 'weekly' ? (
              <div>
                <label className="block text-body-sm font-bold text-ink mb-1.5">
                  {t('project_actions.day_of_week')}
                </label>
                <select
                  value={crawlDay}
                  onChange={(e) => setCrawlDay(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
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
            ) : (
              <div>
                <label className="block text-body-sm font-bold text-ink mb-1.5">
                  {t('onboarding.timezone')}
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
                >
                  <option value="UTC">UTC</option>
                  <option value="Africa/Cairo">Africa/Cairo (EGY)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (KSA)</option>
                  <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 4. Notification Preferences */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" />
            <span>{t('settings.notifications_title')}</span>
          </h3>
          <p className="text-body-sm text-ink-muted">
            {t('settings.notifications_desc')}
          </p>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('onboarding.recipient_email')}
            </label>
            <input
              type="email"
              placeholder="alerts@yourdomain.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink focus:border-gold-border focus:outline-none"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCritical}
                onChange={(e) => setNotifyCritical(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <div>
                <span className="text-body-md font-bold text-ink">{t('settings.crit_title')}</span>
                <span className="text-xs text-ink-muted block">{t('settings.crit_desc')}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWarning}
                onChange={(e) => setNotifyWarning(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <div>
                <span className="text-body-md font-bold text-ink">{t('settings.warn_title')}</span>
                <span className="text-xs text-ink-muted block">{t('settings.warn_desc')}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyNotice}
                onChange={(e) => setNotifyNotice(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <div>
                <span className="text-body-md font-bold text-ink">{t('settings.notice_title')}</span>
                <span className="text-xs text-ink-muted block">{t('settings.notice_desc')}</span>
              </div>
            </label>
          </div>
        </div>

        {/* 5. Noise Suppression */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gold" />
            <span>{t('settings.noise_title')}</span>
          </h3>
          <p className="text-body-sm text-ink-muted">
            {t('settings.noise_desc')}
          </p>

          <input
            type="text"
            value={ignorePatterns}
            onChange={(e) => setIgnorePatterns(e.target.value)}
            className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline font-mono text-xs text-ink"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{t('settings.save_button')}</span>
          </button>

          {isSaved && (
            <span className="flex items-center gap-1.5 text-body-sm text-severity-healthy font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('settings.saved_success')}</span>
            </span>
          )}
        </div>

        {/* 6. Danger Zone: Delete Project (Requirement #5) */}
        <div className="editorial-card p-6 border-red-200 bg-red-50/40 space-y-3">
          <h3 className="font-extrabold text-title-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{t('settings.danger_zone')}</span>
          </h3>
          <p className="text-body-sm text-red-900/80">
            {t('settings.delete_website_desc')}
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-body-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? '...' : t('settings.delete_website')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
