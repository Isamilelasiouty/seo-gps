import React from 'react';
import { useI18n } from '../i18n';

interface GaugeChartProps {
  score: number; // 0 to 100
  label?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ score, label }) => {
  const { locale } = useI18n();
  const isAr = locale !== 'en';

  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Semi-circle arc
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Determine color theme based on score
  let strokeColor = '#067647'; // Healthy green
  let statusText = isAr ? 'ممتاز (صحة تقنية فائقة)' : 'Excellent';
  if (clampedScore < 70) {
    strokeColor = '#B42318'; // Critical red
    statusText = isAr ? 'يحتاج إلى معالجة عاجلة' : 'Critical Attention Needed';
  } else if (clampedScore < 90) {
    strokeColor = '#B8892B'; // Gold warning
    statusText = isAr ? 'جيد (توجد تحذيرات طفيفة)' : 'Good (Minor Warnings)';
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none">
      <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 160 90" className="w-full h-full drop-shadow-sm">
          {/* Background Arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="#ECE8DC"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled Gauge Arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Numeric Center Score */}
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-3xl font-extrabold text-ink tracking-tight tnum leading-none">
            {clampedScore}
          </span>
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mt-1">
            {isAr ? 'من أصل 100' : 'out of 100'}
          </span>
        </div>
      </div>

      <div className="mt-2.5 text-center">
        <div
          className="text-xs font-bold px-3 py-1 rounded-full inline-block border"
          style={{
            color: strokeColor,
            backgroundColor: `${strokeColor}12`,
            borderColor: `${strokeColor}30`,
          }}
        >
          {statusText}
        </div>
      </div>
    </div>
  );
};
