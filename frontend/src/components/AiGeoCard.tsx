import React from 'react';
import { Bot, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

interface AiGeoCardProps {
  score?: number;
  blockedBots?: string[];
  hasEntities?: boolean;
}

export const AiGeoCard: React.FC<AiGeoCardProps> = ({
  score = 88,
  blockedBots = [],
  hasEntities = true,
}) => {
  const bots = [
    { name: 'GPTBot', org: 'OpenAI / ChatGPT', isBlocked: blockedBots.includes('GPTBot') },
    { name: 'PerplexityBot', org: 'Perplexity AI', isBlocked: blockedBots.includes('PerplexityBot') },
    { name: 'ClaudeBot', org: 'Anthropic Claude', isBlocked: blockedBots.includes('ClaudeBot') },
    { name: 'Google-Extended', org: 'Google Gemini', isBlocked: blockedBots.includes('Google-Extended') },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-gold to-amber-400 text-white flex items-center justify-center shadow-md shadow-gold/25">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-title-sm font-bold text-slate-900">
              جاهزية محركات الذكاء الاصطناعي (GEO & AI Search Readiness)
            </h3>
            <p className="text-xs text-slate-400">
              مستوى تأهيل الموقع للاقتباس والاستشهاد في Google AI Overviews و ChatGPT و Perplexity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">درجة الجاهزية:</span>
          <span className="px-3.5 py-1 rounded-2xl bg-gold-tint text-gold border border-gold-border font-extrabold text-sm">
            {score} / 100
          </span>
        </div>
      </div>

      {/* Grid of AI Crawlers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {bots.map((b) => (
          <div
            key={b.name}
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              b.isBlocked
                ? 'bg-red-50/50 border-red-200'
                : 'bg-emerald-50/40 border-emerald-200'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-slate-900">{b.name}</div>
              <div className="text-[10px] text-slate-500">{b.org}</div>
            </div>
            {b.isBlocked ? (
              <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold">
                محظور
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>مسموح</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Key Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
          <span className="font-bold text-slate-700 block">1. كثافة الحقائق وقابلية الاقتباس</span>
          <p className="text-slate-500 leading-relaxed">
            وجود جداول وقوائم نقطية وفقرات إجابات مباشرة وسريعة تحت عناوين الأسئلة لتمكين LLM من الاقتباس.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
          <span className="font-bold text-slate-700 block">2. رسوخ الكيانات (Schema Entities)</span>
          <p className="text-slate-500 leading-relaxed">
            ربط المقال والموقع ببيانات منظمة موثوقة (Organization / Person / FAQPage) لترسيخ الهوية في Knowledge Graph.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
          <span className="font-bold text-slate-700 block">3. التحديث والاعتمادية (Freshness)</span>
          <p className="text-slate-500 leading-relaxed">
            تحديث التواريخ البرمجية (dateModified) وإبراز بيانات المؤلف والخبرة التخصصية (EEAT).
          </p>
        </div>
      </div>
    </div>
  );
};
