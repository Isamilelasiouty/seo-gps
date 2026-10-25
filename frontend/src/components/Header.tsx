import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Globe, HelpCircle, User, LogOut, Linkedin, Mail, Sparkles, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onOpenAuth: () => void;
  onOpenQuickAudit: () => void;
  currentUser: any;
  onLogout: () => void;
  activeProjectName?: string;
  isAuthLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHelp,
  onOpenAuth,
  onOpenQuickAudit,
  currentUser,
  onLogout,
  activeProjectName,
  isAuthLoading = false,
}) => {
  const { locale, setLocale, t } = useI18n();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const displayName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || t('header.my_account');

  return (
    <header className="h-16 border-b border-surface-hairline bg-surface-card px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Creator Left Section */}
      <div className="flex items-center gap-3">
        <img
          src="./brand/logo.png"
          alt="Ismail El Asiouty Logo"
          className="h-9 w-auto object-contain"
          onError={(e) => {
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

      {/* Right Controls: Quick Audit, Language Switch, Help, User */}
      <div className="flex items-center gap-3">
        {/* Quick Audit Button */}
        <button
          onClick={onOpenQuickAudit}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-border bg-gold-tint/40 text-body-sm font-bold text-gold hover:bg-gold-tint transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('nav.quick_audit')}</span>
        </button>

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
          <span className="hidden lg:inline">{t('header.help')}</span>
        </button>

        {/* User Account / Login State */}
        {isAuthLoading ? (
          <div className="h-8 w-24 bg-surface rounded-xl border border-surface-hairline animate-pulse"></div>
        ) : currentUser ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-surface-hairline hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-black text-xs uppercase">
                {displayName.charAt(0)}
              </div>
              <span className="text-body-sm font-bold text-ink hidden sm:inline max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-64 bg-white rounded-card border border-surface-hairline shadow-xl py-2 z-50 animate-in fade-in">
                <div className="px-4 py-2.5 border-b border-surface-hairline">
                  <div className="font-bold text-body-sm text-ink truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {currentUser.email}
                  </div>
                </div>

                <div className="px-4 py-2 text-xs text-ink-muted border-b border-surface-hairline space-y-1.5">
                  <div className="font-bold text-ink">{t('header.direct_support')}</div>
                  <a
                    href="https://www.linkedin.com/in/ismailelasiouty/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-gold"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                    <span>إسماعيل الأسيوطي</span>
                  </a>
                  <a
                    href="mailto:ismailelasiouty3@gmail.com"
                    className="flex items-center gap-1.5 hover:text-gold"
                  >
                    <Mail className="w-3.5 h-3.5 text-gold" />
                    <span>ismailelasiouty3@gmail.com</span>
                  </a>
                </div>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2 text-left rtl:text-right text-body-sm text-severity-critical hover:bg-severity-critical-bg flex items-center gap-2 font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('auth.logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gold text-white font-bold text-body-sm hover:bg-gold-hover shadow-sm transition-all"
          >
            <User className="w-4 h-4" />
            <span>{t('header.login')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
