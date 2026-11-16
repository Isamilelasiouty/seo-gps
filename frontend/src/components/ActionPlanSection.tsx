import React, { useState } from 'react';
import { ActionPlanItem } from '../lib/actionPlanGenerator';
import { Zap, Check, Copy, Code, ArrowUpRight, Flame, ShieldAlert, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ActionPlanSectionProps {
  plan: ActionPlanItem[];
  detectedFramework: string;
  onOpenGlossaryTerm?: (termId: string) => void;
}

export const ActionPlanSection: React.FC<ActionPlanSectionProps> = ({
  plan,
  detectedFramework,
  onOpenGlossaryTerm,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'quick_win' | 'strategic'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(plan[0]?.id || null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredPlan = plan.filter(item => {
    if (filter === 'all') return true;
    return item.tier === filter;
  });

  const quickWinsCount = plan.filter(p => p.tier === 'quick_win').length;
  const strategicCount = plan.filter(p => p.tier === 'strategic').length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse"></span>
            <h3 className="text-title-sm font-bold text-slate-900">
              خطة العمل التنفيذية (من البيانات الخام إلى حلول جاهزة)
            </h3>
          </div>
          <p className="text-body-sm text-slate-500">
            تم تحويل كل خلل فني إلى خطوات دقيقة مع كود إصلاح جاهز للنسخ مخصص لبيئة الموقع (
            <span className="font-bold text-gold capitalize">{detectedFramework}</span>)
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الكل ({plan.length})
          </button>
          <button
            onClick={() => setFilter('quick_win')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'quick_win' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>مكاسب سريعة ({quickWinsCount})</span>
          </button>
          <button
            onClick={() => setFilter('strategic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'strategic' ? 'bg-white text-gold shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-gold" />
            <span>استراتيجي ({strategicCount})</span>
          </button>
        </div>
      </div>

      {/* Plan Items */}
      {filteredPlan.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          لا توجد عناصر إصلاح في هذا القسم، موقعك سليم ومثالي.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlan.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-all hover:border-gold/60"
              >
                {/* Collapsed Header Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
                        item.tier === 'quick_win'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gold-tint text-gold border border-gold-border'
                      }`}
                    >
                      {item.tierLabel}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-body-md text-slate-900 truncate">{item.whatIsIt}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">{item.url}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                      الأثر: <span className="text-emerald-600 font-semibold">{item.impactLevel}</span> | الجهد: {item.effortLevel}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {/* Why & Expected Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/70">
                        <span className="font-bold text-slate-500 block mb-1">لماذا تهم محركات البحث؟</span>
                        <p className="text-slate-800 leading-relaxed">{item.whyItMatters}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
                        <span className="font-bold text-emerald-800 block mb-1">الأثر والنتيجة المتوقعة:</span>
                        <p className="text-emerald-900 leading-relaxed font-medium">{item.expectedImpact}</p>
                      </div>
                    </div>

                    {/* Step-by-Step Fix */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/70 space-y-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-gold" />
                        <span>خطوات التطبيق العملية:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700">
                        {item.stepByStepFix.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Ready Code Patch with Copy Button */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Code className="w-4 h-4 text-gold" />
                          <span>كود الإصلاح الجاهز ({item.framework}):</span>
                        </div>
                        <button
                          onClick={() => handleCopy(item.id, item.codePatch)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-gold hover:border-gold text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">تم النسخ بنجاح</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الكود</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 dir-ltr text-left">
                        <code>{item.codePatch}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
