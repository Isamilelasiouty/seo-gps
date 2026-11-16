import React from 'react';
import { UserCheck, Sparkles, Sliders } from 'lucide-react';

interface NoviceProToggleProps {
  mode: 'novice' | 'pro';
  onChange: (m: 'novice' | 'pro') => void;
}

export const NoviceProToggle: React.FC<NoviceProToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-slate-200/80 shadow-2xs select-none">
      <button
        onClick={() => onChange('novice')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          mode === 'novice'
            ? 'bg-gradient-to-r from-amber-50 to-gold-tint text-gold border border-gold-border/70 shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
        title="لغة بسيطة، أهم 3-5 خطوات للإصلاح دون تعقيد"
      >
        <Sparkles className="w-3.5 h-3.5 text-gold" />
        <span>وضع المبتدئ</span>
      </button>

      <button
        onClick={() => onChange('pro')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          mode === 'pro'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
        title="جميع البيانات الخام، الترويسات، والاستخراج المخصص"
      >
        <Sliders className="w-3.5 h-3.5" />
        <span>وضع المحترف</span>
      </button>
    </div>
  );
};
