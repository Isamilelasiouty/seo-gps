import React, { useState } from 'react';
import { SEO_GLOSSARY, GlossaryTerm } from '../lib/seoGlossary';
import { BookOpen, X, Search, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTermId?: string;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  onClose,
  initialTermId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<string>(initialTermId || 'canonical');

  if (!isOpen) return null;

  const terms = Object.values(SEO_GLOSSARY);
  const filteredTerms = terms.filter(
    (t) =>
      t.term_ar.toLowerCase().includes(search.toLowerCase()) ||
      t.term_en.toLowerCase().includes(search.toLowerCase()) ||
      t.definition_ar.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTerm: GlossaryTerm = SEO_GLOSSARY[selectedTermId] || terms[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-title-sm font-bold text-slate-800">
                قاموس مصطلحات السيو والزحف الذكي
              </h2>
              <p className="text-xs text-slate-400">
                مرجع تقني مبسط لكل مصطلحات عناكب البحث والأرشفة لغير المتخصصين والمحترفين
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

        {/* Content Body: Sidebar List + Detail Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Terms List */}
          <div className="w-72 border-l border-slate-100 p-3 overflow-y-auto flex flex-col gap-1.5 bg-slate-50/50">
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مصطلح..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-gold"
              />
            </div>

            {filteredTerms.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTermId(t.id)}
                className={`p-3 rounded-2xl text-right transition-all cursor-pointer ${
                  selectedTermId === t.id
                    ? 'bg-white text-gold font-bold border border-gold-border shadow-xs'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="text-xs font-bold truncate">{t.term_ar}</div>
                <div className="text-[10px] text-slate-400 truncate">{t.term_en}</div>
              </button>
            ))}
          </div>

          {/* Term Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <div>
              <div className="inline-block px-2.5 py-1 rounded-lg bg-gold-tint text-gold text-[11px] font-bold border border-gold-border/70 mb-2">
                {selectedTerm.category.toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{selectedTerm.term_ar}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedTerm.term_en}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span>ما هو هذا المفهوم؟</span>
              </div>
              <p className="text-body-md text-slate-800 leading-relaxed">
                {selectedTerm.definition_ar}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>لماذا يهتم به جوجل وعناكب البحث؟</span>
              </div>
              <p className="text-body-sm text-slate-700 leading-relaxed">
                {selectedTerm.why_it_matters_ar}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>كيفية الإصلاح والتحسين الفني:</span>
              </div>
              <p className="text-body-sm text-slate-700 leading-relaxed font-medium">
                {selectedTerm.how_to_fix_ar}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
