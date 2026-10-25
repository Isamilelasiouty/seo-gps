import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  change?: number; // e.g. +2, -1, 0
  severity?: 'critical' | 'warning' | 'notice' | 'healthy' | 'neutral';
  isSelected?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  severity = 'neutral',
  isSelected = false,
  onClick,
}) => {
  const getSeverityStyle = () => {
    switch (severity) {
      case 'critical':
        return {
          border: isSelected ? 'border-[#B42318] ring-2 ring-[#B42318]/20' : 'border-surface-hairline',
          badge: 'bg-[#FEF3F2] text-[#B42318]',
          valueColor: 'text-[#B42318]',
        };
      case 'warning':
        return {
          border: isSelected ? 'border-[#B54708] ring-2 ring-[#B54708]/20' : 'border-surface-hairline',
          badge: 'bg-[#FFFAEB] text-[#B54708]',
          valueColor: 'text-[#B54708]',
        };
      case 'notice':
        return {
          border: isSelected ? 'border-[#175CD3] ring-2 ring-[#175CD3]/20' : 'border-surface-hairline',
          badge: 'bg-[#EFF8FF] text-[#175CD3]',
          valueColor: 'text-[#175CD3]',
        };
      case 'healthy':
        return {
          border: isSelected ? 'border-[#067647] ring-2 ring-[#067647]/20' : 'border-surface-hairline',
          badge: 'bg-[#ECFDF3] text-[#067647]',
          valueColor: 'text-[#067647]',
        };
      default:
        return {
          border: isSelected ? 'border-gold ring-2 ring-gold/20' : 'border-surface-hairline',
          badge: 'bg-surface text-ink-muted',
          valueColor: 'text-ink',
        };
    }
  };

  const styles = getSeverityStyle();

  return (
    <div
      onClick={onClick}
      className={`editorial-card p-4 transition-all cursor-pointer hover:shadow-md ${styles.border}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">{label}</span>
        {change !== undefined && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              change > 0 ? 'bg-[#FEF3F2] text-[#B42318]' : change < 0 ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-surface text-ink-muted'
            }`}
          >
            {change > 0 ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : change < 0 ? (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            ) : (
              <Minus className="w-3 h-3 mr-0.5" />
            )}
            {change > 0 ? `+${change}` : change}
          </span>
        )}
      </div>

      <div className={`text-2xl font-black ${styles.valueColor} tnum tracking-tight`}>
        {value}
      </div>
    </div>
  );
};
