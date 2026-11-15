import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { saveLead } from '../lib/leadTracker';
import { sanitizeInputUrl } from '../lib/siteCrawler';
import {
  ShieldCheck,
  Mail,
  User,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface AccessGateModalProps {
  isOpen: boolean;
  onSuccess: (userData: { name: string; email: string; domain?: string }) => void;
}

export const AccessGateModal: React.FC<AccessGateModalProps> = ({ isOpen, onSuccess }) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validate Name
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg(isAr ? 'يرجى إدخال اسمك الكريم للمتابعة' : 'Please provide your full name');
      return;
    }

    // 2. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg(isAr ? 'يرجى إدخال بريد إلكتروني صحيح وصالح للاستخدام' : 'Please provide a valid email address');
      return;
    }

    // 3. Optional Website Validation
    let cleanDomain = '';
    if (website.trim()) {
      const { cleanRoot, domain } = sanitizeInputUrl(website);
      cleanDomain = domain;
    }

    setIsSubmitting(true);

    try {
      // Save lead to local cache and Supabase cloud via service role
      await saveLead({
        name: cleanName,
        email: cleanEmail,
        domain: cleanDomain || undefined,
        source: 'signup',
      });

      // Persist registered status locally
      const regData = {
        name: cleanName,
        email: cleanEmail,
        domain: cleanDomain || undefined,
        registeredAt: new Date().toISOString(),
      };
      localStorage.setItem('seo_gps_registered_user', JSON.stringify(regData));

      onSuccess({
        name: cleanName,
        email: cleanEmail,
        domain: cleanDomain || undefined,
      });
    } catch (err: any) {
      console.warn('Registration gate warning:', err);
      // Even if network glitches, grant access locally
      onSuccess({
        name: cleanName,
        email: cleanEmail,
        domain: cleanDomain || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300"
      dir={dir}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Top Accent Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-gold via-amber-500 to-gold-hover" />

        <div className="p-8 sm:p-10 space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gold-tint border border-gold-border shadow-xs mb-1">
              <ShieldCheck className="w-9 h-9 text-gold" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-tint/80 border border-gold-border text-[11px] font-bold text-gold">
              <Lock className="w-3 h-3 text-gold" />
              <span>{isAr ? 'تسجيل إلزامي قبل بدء الاستخدام' : 'Mandatory Registration Gate'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isAr ? 'مرحباً بك في SEO GPS' : 'Welcome to SEO GPS'}
            </h2>

            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'منصة الفحص والتدقيق التقني الذكي لمحركات البحث. لبدء فحص موقعك ومتابعة تقارير السيو الشاملة، يرجى تسجيل بريدك الإلكتروني أولاً.'
                : 'Intelligent technical SEO auditing & regression monitoring. Please register your email first to audit websites and view comprehensive reports.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'الاسم بالكامل' : 'Full Name'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? 'مثال: إسماعيل الأسيوطي' : 'e.g. John Doe'}
                  className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAr ? 'name@company.com' : 'name@company.com'}
                  className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr
                  ? 'سيتم إرسال ملخص الفحص وتنبيهات التراجعات إلى هذا البريد'
                  : 'Audit summaries and regression alerts will be delivered to this email'}
              </p>
            </div>

            {/* Website URL (Optional / Recommended) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'رابط الموقع المراد فحصه ومراقبته (اختياري)' : 'Target Website to Audit (Optional)'}
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Consent check */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="consentCheck"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-500 leading-snug cursor-pointer">
                {isAr
                  ? 'أوافق على استلام تقارير الفحص الفورية وتحديثات الأداء عبر البريد المسجل.'
                  : 'I agree to receive automated audit reports and performance updates at this email.'}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gold hover:bg-gold-hover active:scale-[0.99] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جارٍ تسجيل البيانات...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  <span>{isAr ? 'تسجيل وبدء الاستخدام' : 'Register & Start Access'}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="text-center pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {isAr
                ? 'بياناتك مشفرة ومحمية بالكامل ولا نشاركها مع أي طرف ثالث'
                : 'Your data is strictly protected and never shared with third parties'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
