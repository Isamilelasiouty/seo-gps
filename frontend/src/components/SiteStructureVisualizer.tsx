import React from 'react';
import { Layers, Network, Activity, BarChart2 } from 'lucide-react';

interface SiteStructureVisualizerProps {
  pages: any[];
}

export const SiteStructureVisualizer: React.FC<SiteStructureVisualizerProps> = ({ pages = [] }) => {
  // 1. Calculate Crawl Depth breakdown
  const depthCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  pages.forEach((p) => {
    const d = Math.min(p.crawlDepth ?? (p.url.split('/').length - 3), 4);
    const safeD = Math.max(0, d);
    depthCounts[safeD] = (depthCounts[safeD] || 0) + 1;
  });

  const totalPages = Math.max(1, pages.length);

  // 2. Section/Category Distribution & Issues
  const categoryStats: Record<string, { count: number; issues: number }> = {};
  pages.forEach((p) => {
    let cat = 'الرئيسية';
    try {
      const path = new URL(p.url).pathname;
      const parts = path.split('/').filter(Boolean);
      cat = parts[0] ? `/${parts[0]}` : 'الرئيسية';
    } catch (e) {}

    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, issues: 0 };
    }
    categoryStats[cat].count += 1;
    categoryStats[cat].issues += (p.issues?.length || 0);
  });

  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-title-sm font-bold text-slate-900">
              التصور المرئي لبنية الموقع وسلطة الروابط (Visual Site Architecture)
            </h3>
            <p className="text-xs text-slate-400">
              تحليل أعماق النقر، توزيع الروابط الداخلية، والخرائط الحرارية للمشاكل حسب الأقسام
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Depth Distribution Chart */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-gold" />
              <span>مخطط عمق الزحف (Crawl Depth Distribution)</span>
            </span>
            <span className="text-[11px] text-slate-400">الهدف: 90%+ في المستويات 0-3</span>
          </div>

          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((depth) => {
              const count = depthCounts[depth] || 0;
              const percent = Math.round((count / totalPages) * 100);
              const isDeep = depth >= 4;

              return (
                <div key={depth} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">
                      المستوى {depth} {depth === 0 ? '(الرئيسية)' : depth === 4 ? '(4+ نقرات)' : `(${depth} نقرات)`}
                    </span>
                    <span className={isDeep && count > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                      {count} صفحة ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDeep && count > 0 ? 'bg-amber-500' : 'bg-gold'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Issues Heatmap */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-gold" />
              <span>الخريطة الحرارية للمشاكل حسب الأقسام (Section Heatmap)</span>
            </span>
            <span className="text-[11px] text-slate-400">تركيز المشاكل الفنية</span>
          </div>

          <div className="space-y-2.5">
            {sortedCategories.map(([cat, stat]) => {
              const issuesPerRatio = stat.count > 0 ? (stat.issues / stat.count) : 0;
              const isSevere = stat.issues > 5;

              return (
                <div
                  key={cat}
                  className="p-3 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs"
                >
                  <div className="font-mono font-bold text-slate-800 truncate max-w-[200px]">
                    {cat}
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>{stat.count} صفحة</span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        stat.issues === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isSevere
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {stat.issues} مشكلة
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
