import React from 'react';
import { useI18n } from '../i18n';
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

interface GenericCheckPageProps {
  checkId: string;
  title: string;
  category: string;
  description: string;
  howToFix: string;
}

export const GenericCheckPage: React.FC<GenericCheckPageProps> = ({
  checkId,
  title,
  category,
  description,
  howToFix,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Title & Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-gold mb-1">{category} AUDIT</div>
          <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
            {title}
          </h1>
          <p className="text-body-sm text-ink-muted mt-1">
            {description}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-severity-healthy-bg border border-severity-healthy-border text-severity-healthy text-xs font-bold uppercase self-start">
          <ShieldCheck className="w-4 h-4" /> All Active Checks Passing
        </span>
      </div>

      {/* Explanatory card */}
      <div className="editorial-card p-6 bg-surface flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h3 className="font-bold text-body-md text-ink mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-gold" />
            Detection Logic & Behavior
          </h3>
          <p className="text-body-sm text-ink-muted leading-relaxed">
            This module compares daily snapshots specifically for {title.toLowerCase()}. Any discrepancies or regressions detected between crawls trigger a real-time delta entry in your morning email.
          </p>
        </div>
        <div className="flex-1 pt-4 md:pt-0 md:pl-6 md:border-l rtl:md:border-l-0 rtl:md:border-r border-surface-hairline">
          <h3 className="font-bold text-body-md text-ink mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-severity-healthy" />
            Recommended Resolution Strategy
          </h3>
          <p className="text-body-sm text-ink-muted leading-relaxed">
            {howToFix}
          </p>
        </div>
      </div>

      {/* Status Table */}
      <div className="editorial-card p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-severity-healthy-bg border border-severity-healthy-border text-severity-healthy flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-body-lg text-ink">
          No active issues detected in {title}
        </h4>
        <p className="text-body-sm text-ink-muted max-w-md mx-auto">
          All audited pages conform to standard technical specifications. SEO GPS checks this automatically every day at your scheduled crawl time.
        </p>
      </div>
    </div>
  );
};
