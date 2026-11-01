import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import ar from './ar.json';

type Locale = 'en' | 'ar';
type Translations = typeof en;

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<Locale, any> = { en, ar };

const I18nContext = createContext<I18nContextType>({
  locale: 'ar',
  setLocale: () => {},
  t: (path: string) => path,
  dir: 'rtl',
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('seo_gps_locale');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (e) {}
    return 'ar';
  });

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('seo_gps_locale', l);
    } catch (e) {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);
  }, [locale, dir]);

  const t = (path: string): string => {
    const keys = path.split('.');
    let curr = translations[locale];
    for (const k of keys) {
      if (!curr || typeof curr !== 'object') return path;
      curr = curr[k];
    }
    return typeof curr === 'string' ? curr : path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
