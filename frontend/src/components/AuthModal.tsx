import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';
import { X, Mail, Lock, User, Linkedin, ArrowRight, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });

        if (error) throw error;

        if (data.session && data.user) {
          onAuthSuccess(data.user);
          onClose();
        } else if (data.user) {
          // In case email confirmation is required by Supabase:
          setSuccessMsg(
            'تم إنشاء الحساب بنجاح! تفقد بريدك الإلكتروني لتأكيد الحساب إذا لزم الأمر، أو يمكنك تسجيل الدخول الآن.'
          );
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          onAuthSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-card shadow-2xl border border-surface-hairline overflow-hidden animate-in zoom-in-95">
        
        {/* Header with Creator Brand */}
        <div className="p-6 bg-surface border-b border-surface-hairline relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-lg hover:bg-white text-ink-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <img
              src="./brand/logo.png"
              alt="SEO GPS Logo"
              className="h-10 w-auto object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div>
              <span className="font-extrabold text-title-sm text-ink block leading-tight">
                {t('product_name')}
              </span>
              <span className="text-xs text-ink-muted">
                {t('by_owner')}
              </span>
            </div>
          </div>

          <h2 className="text-title-lg font-black text-ink tracking-tight mt-3">
            {t('auth.welcome')}
          </h2>
          <p className="text-body-sm text-ink-muted mt-1 leading-relaxed">
            {t('auth.subtitle')}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-white p-1 rounded-xl border border-surface-hairline mt-4">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-body-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-body-sm font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('auth.signup')}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-severity-critical-bg border border-severity-critical-border rounded-xl text-body-sm text-severity-critical flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-severity-healthy-bg border border-severity-healthy-border rounded-xl text-body-sm text-severity-healthy flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1.5">
                {t('auth.name')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد / John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <div>
            <label className="block text-body-sm font-bold text-ink mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rtl:pr-9 rtl:pl-4 bg-surface rounded-lg border border-surface-hairline text-body-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gold text-white font-extrabold text-body-md hover:bg-gold-hover shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'جاري المعالجة...' : mode === 'login' ? t('auth.login') : t('auth.signup')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>

        {/* Support & Contact Footer (Specified by user) */}
        <div className="p-5 bg-gold-tint/30 border-t border-surface-hairline text-center text-body-sm">
          <p className="font-bold text-ink mb-1">
            {t('auth.support_title')}
          </p>
          <p className="text-ink-muted text-xs mb-3">
            {t('auth.support_desc')}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://www.linkedin.com/in/ismailelasiouty/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gold-border text-xs font-bold text-ink hover:text-gold transition-colors shadow-sm"
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
              <span>LinkedIn / إسماعيل الأسيوطي</span>
            </a>
            <a
              href="mailto:ismailelasiouty3@gmail.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gold-border text-xs font-bold text-ink hover:text-gold transition-colors shadow-sm"
            >
              <Mail className="w-3.5 h-3.5 text-gold" />
              <span>ismailelasiouty3@gmail.com</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
