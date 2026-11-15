import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: number | string;
  change?: number; // e.g. +2, -1, 0
  severity?: 'critical' | 'warning' | 'notice' | 'healthy' | 'neutral';
  isSelected?: boolean;
  onClick?: () => void;
  statusBadge?: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  severity = 'neutral',
  isSelected = false,
  onClick,
  statusBadge,
  sublabel,
  icon,
}) => {
  const getSeverityStyle = () => {
    switch (severity) {
      case 'critical':
        return {
          border: isSelected ? 'border-rose-400 ring-4 ring-rose-500/10 shadow-md' : 'border-slate-100 hover:border-rose-200',
          dotTop: 'bg-rose-400/50',
          dotBottom: 'bg-amber-300/40',
          iconBg: 'bg-rose-50 text-rose-600 border border-rose-100/80',
          valueColor: 'text-rose-600',
          badgeText: 'تتطلب معالجة',
          subtext: 'أخطاء حرجة أو 404 تتطلب تدخلاً فورياً',
          defaultIcon: <AlertOctagon className="w-5 h-5 text-rose-500" />,
        };
      case 'warning':
        return {
          border: isSelected ? 'border-amber-400 ring-4 ring-amber-500/10 shadow-md' : 'border-slate-100 hover:border-amber-200',
          dotTop: 'bg-amber-400/50',
          dotBottom: 'bg-purple-300/40',
          iconBg: 'bg-amber-50 text-amber-600 border border-amber-100/80',
          valueColor: 'text-amber-600',
          badgeText: 'تحذيرات هامة',
          subtext: 'تنبيهات تؤثر على تجربة المستخدم وترتيب الصفحات',
          defaultIcon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        };
      case 'notice':
        return {
          border: isSelected ? 'border-blue-400 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-100 hover:border-blue-200',
          dotTop: 'bg-blue-400/50',
          dotBottom: 'bg-emerald-300/40',
          iconBg: 'bg-blue-50 text-blue-600 border border-blue-100/80',
          valueColor: 'text-blue-600',
          badgeText: 'فرص تحسين',
          subtext: 'ملاحظات إرشادية لتطوير الأداء والعناوين',
          defaultIcon: <Info className="w-5 h-5 text-blue-500" />,
        };
      case 'healthy':
        return {
          border: isSelected ? 'border-emerald-400 ring-4 ring-emerald-500/10 shadow-md' : 'border-slate-100 hover:border-emerald-200',
          dotTop: 'bg-emerald-400/50',
          dotBottom: 'bg-blue-300/40',
          iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/80',
          valueColor: 'text-emerald-600',
          badgeText: 'مكتملة الفحص',
          subtext: 'صفحات مستكشفة ومفحوصة بالكامل',
          defaultIcon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        };
      default:
        return {
          border: isSelected ? 'border-gold ring-4 ring-gold/10 shadow-md' : 'border-slate-100 hover:border-gold/30',
          dotTop: 'bg-gold/40',
          dotBottom: 'bg-slate-300/40',
          iconBg: 'bg-gold-tint text-gold border border-gold-border/60',
          valueColor: 'text-slate-800',
          badgeText: 'مؤشر عام',
          subtext: 'إجمالي العناصر المسجلة',
          defaultIcon: <Sparkles className="w-5 h-5 text-gold" />,
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <div
      onClick={onClick}
      className={`editorial-card relative overflow-hidden p-5 transition-all duration-300 cursor-pointer rounded-2xl bg-white border ${style.border} shadow-[0_2px_12px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.07)] hover:-translate-y-1 active:translate-y-0`}
    >
      {/* Decorative Corner Pastel Dots (Reference UI Style) */}
      <span className={`w-2 h-2 rounded-full absolute top-3 end-3 ${style.dotTop}`} />
      <span className={`w-1.5 h-1.5 rounded-full absolute bottom-3 start-3 ${style.dotBottom}`} />

      {/* Top Section: Number & Status on start side, Icon Badge on end side */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <div className={`text-3xl font-black ${style.valueColor} tracking-tight tnum leading-none`}>
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">
              {statusBadge || style.badgeText}
            </span>

            {change !== undefined && change !== 0 && (
              <span
                className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  change > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {change > 0 ? (
                  <ArrowUpRight className="w-2.5 h-2.5 me-0.5" />
                ) : (
                  <ArrowDownRight className="w-2.5 h-2.5 me-0.5" />
                )}
                {change > 0 ? `+${change}` : change}
              </span>
            )}
          </div>
        </div>

        {/* Soft Rounded Icon Container */}
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${style.iconBg}`}>
          {icon || style.defaultIcon}
        </div>
      </div>

      {/* Bottom Section: Card Title & Context Subtitle */}
      <div className="pt-2.5 border-t border-slate-100/90">
        <div className="font-extrabold text-slate-800 text-sm tracking-tight truncate">
          {label}
        </div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
          {sublabel || style.subtext}
        </div>
      </div>
    </div>
  );
};
