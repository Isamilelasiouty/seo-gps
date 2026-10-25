import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Save, Trash2, Bell, Shield, Sliders, Mail, Clock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const [crawlHour, setCrawlHour] = useState('06');
  const [timezone, setTimezone] = useState('UTC');
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [notifyNotice, setNotifyNotice] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [ignorePatterns, setIgnorePatterns] = useState('?utm_*, /page/*');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
          {t('nav.settings')}
        </h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Configure crawl timings, notification thresholds, noise suppression rules, and account preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Schedule & Timings */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            Daily Crawl Schedule
          </h3>
          <p className="text-body-sm text-ink-muted">
            The crawler runs daily within about an hour of your selected time on GitHub Actions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                Local Crawl Hour
              </label>
              <select
                value={crawlHour}
                onChange={(e) => setCrawlHour(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = i < 10 ? `0${i}` : `${i}`;
                  return <option key={h} value={h}>{h}:00</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
              >
                <option value="UTC">UTC</option>
                <option value="Asia/Riyadh">Asia/Riyadh (KSA)</option>
                <option value="Africa/Cairo">Africa/Cairo (EGY)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New York</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Notification Preferences */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" />
            Email Notification Thresholds
          </h3>
          <p className="text-body-sm text-ink-muted">
            Choose which severity levels trigger instant daily delta email reports.
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCritical}
                onChange={(e) => setNotifyCritical(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <div>
                <span className="text-body-md font-bold text-ink">Critical Issues</span>
                <span className="text-xs text-ink-muted block">404/500 spikes, accidental noindex, deleted canonicals</span>
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
                <span className="text-body-md font-bold text-ink">Warnings</span>
                <span className="text-xs text-ink-muted block">Modified titles/meta, external canonicals, broken schema types</span>
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
                <span className="text-body-md font-bold text-ink">Notices (Low severity)</span>
                <span className="text-xs text-ink-muted block">Title length hints, missing optional schema fields</span>
              </div>
            </label>
          </div>
        </div>

        {/* 3. Noise Suppression & Ignore Rules */}
        <div className="editorial-card p-6 space-y-4">
          <h3 className="font-extrabold text-title-sm text-ink flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gold" />
            Noise Suppression Patterns
          </h3>
          <p className="text-body-sm text-ink-muted">
            URLs matching these comma-separated glob patterns will be ignored during crawling and diffing.
          </p>
          <input
            type="text"
            value={ignorePatterns}
            onChange={(e) => setIgnorePatterns(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-body-sm font-bold text-severity-healthy">
              ✓ Preferences successfully saved!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
