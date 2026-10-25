import React from 'react';
import { useI18n } from '../i18n';
import { Globe, HelpCircle, User, Bell } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  activeProjectName?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp, activeProjectName }) => {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="h-16 border-b border-surface-hairline bg-surface-card px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Creator Left Section */}
      <div className="flex items-center gap-3">
        <img
          src="./brand/logo.png"
          alt="Ismail El Asiouty Logo"
          className="h-9 w-auto object-contain"
          onError={(e) => {
            // Fallback if image not rendered
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-title-sm tracking-tight text-ink">
            {t('product_name')}
          </span>
          <span className="text-body-sm text-ink-muted hidden sm:inline font-medium">
            {t('by_owner')}
          </span>
        </div>
      </div>

      {/* Right Controls: Language Switch, Help, User */}
      <div className="flex items-center gap-4">
        {/* Language Switch */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-hairline text-body-sm text-ink hover:border-gold-border hover:bg-gold-tint/50 transition-colors"
          title="Switch Language"
        >
          <Globe className="w-4 h-4 text-gold" />
          <span className="font-semibold">{locale === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Help & Docs Drawer */}
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-body-sm text-ink-muted hover:text-ink hover:bg-surface transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-ink-muted" />
          <span className="hidden md:inline">{t('header.help')}</span>
        </button>

        {/* User Account / Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-surface-hairline">
          <div className="w-8 h-8 rounded-full bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-xs">
            IE
          </div>
        </div>
      </div>
    </header>
  );
};
