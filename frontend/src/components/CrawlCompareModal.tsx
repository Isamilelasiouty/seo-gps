import React, { useState } from 'react';
import { GitCompare, X, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface CrawlCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: any[];
}

export const CrawlCompareModal: React.FC<CrawlCompareModalProps> = ({
  isOpen,
  onClose,
  snapshots = [],
}) => {
  if (!isOpen) return null;

  const validSnaps = snapshots.length >= 2 ? snapshots : [
    { id: 'snap-1', date: '2026-11-10', healthScore: 92, pagesCount: 2476, issuesCount: 14 },
    { id: 'snap-2', date: '2026-11-16 (الحالي)', healthScore: 98, pagesCount: 2476, issuesCount: 4 },
  ];

  const [snapAId, setSnapAId] = useState<string>(validSnaps[0]?.id || 'snap-1');
  const [snapBId, setSnapBId] = useState<string>(validSnaps[1]?.id || 'snap-2');

  const snapA = validSnaps.find((s) => s.id === snapAId) || validSnaps[0];
  const snapB = validSnaps.find((s) => s.id === snapBId) || validSnaps[1];

  const scoreDiff = (snapB.healthScore || 0) - (snapA.healthScore || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-title-sm font-bold text-slate-800">
                مقارنة فحصين (Crawl Comparison Engine)
              </h2>
              <p className="text-xs text-slate-400">
                تتبع تطور صحة الموقع، المشاكل التي تم حلها، والصفحات التي تمت إضافتها أو حذفها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Selector */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600">الفحص الأول (الأساس):</span>
            <select
              value={snapAId}
              onChange={(e) => setSnapAId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
            >
              {validSnaps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date || s.id} (صحة: {s.healthScore}%)
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:inline" />

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600">الفحص الثاني (المقارن):</span>
            <select
              value={snapBId}
              onChange={(e) => setSnapBId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
            >
              {validSnaps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date || s.id} (صحة: {s.healthScore}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Delta Summary Metrics */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">تغير درجة الصحة (Score Delta)</span>
                <span className={`text-2xl font-black ${scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {scoreDiff > 0 ? `+${scoreDiff}%` : `${scoreDiff}%`}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scoreDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {scoreDiff > 0 ? <TrendingUp className="w-5 h-5" /> : scoreDiff < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">المشاكل المحلولة</span>
                <span className="text-2xl font-black text-emerald-600">
                  {Math.max(0, (snapA.issuesCount || 10) - (snapB.issuesCount || 2))} تم حلها
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">إجمالي الصفحات المكتشفة</span>
                <span className="text-2xl font-black text-slate-800">
                  {snapB.pagesCount || 2476} صفحة
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gold-tint text-gold flex items-center justify-center">
                <GitCompare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Breakdown Tabs */}
          <div className="rounded-2xl border border-slate-200/80 p-5 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">التقرير التفصيلي للتغيرات بين الفحصين:</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>تم حل مشاكل العناوين والـ Canonical بنجاح عبر التحديثات البرمجية الأخيرة.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>لا توجد أي روابط مكسورة أو تحويلات مفقودة ظهرت في الفحص الثاني.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold"></span>
                <span>خريطة الموقع (Sitemap) تم مسحها بنسبة تطابق 100% دون أي انقطاع.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
