import React from 'react';
import { useI18n } from '../i18n';
import {
  Plus,
  Search,
  Settings,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface FloatingDockProps {
  onAddProject: () => void;
  onQuickAudit: () => void;
  onNavigateToIssues: () => void;
  onNavigateToReport: () => void;
  onNavigateToSettings: () => void;
  onRunNow?: () => void;
  isRunning?: boolean;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  onAddProject,
  onQuickAudit,
  onNavigateToIssues,
  onNavigateToReport,
  onNavigateToSettings,
  onRunNow,
  isRunning = false,
}) => {
  const { locale } = useI18n();
  const isAr = locale !== 'en';

  return (
    <aside
      aria-label="Quick Actions Dock"
      className="fixed z-40 hidden xl:flex flex-col items-center gap-2 p-2 bg-white/92 backdrop-blur-md rounded-full border border-slate-200/80 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12),0_2px_6px_-1px_rgba(15,23,42,0.04)] ltr:right-6 rtl:left-6 top-1/2 -translate-y-1/2 transition-all duration-300 hover:shadow-[0_16px_36px_-4px_rgba(15,23,42,0.16)]"
    >
      {/* 1. Add Project Button (Primary Vibrant Blue like in screenshot) */}
      <button
        onClick={onAddProject}
        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
        title={isAr ? 'إضافة موقع جديد' : 'Add New Website'}
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* 2. Quick Audit Button */}
      <button
        onClick={onQuickAudit}
        className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title={isAr ? 'فحص فوري شامل للموقع' : 'Instant Site Audit'}
      >
        <Search className="w-4 h-4" />
      </button>

      {/* 3. Run Analysis Button */}
      {onRunNow && (
        <button
          onClick={onRunNow}
          disabled={isRunning}
          className="w-10 h-10 rounded-full hover:bg-amber-50 text-slate-600 hover:text-amber-600 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
          title={isAr ? 'إعادة الفحص المباشر للموقع' : 'Re-run Live Audit'}
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin text-amber-600' : ''}`} />
        </button>
      )}

      {/* 4. Issues & Action To-Do */}
      <button
        onClick={onNavigateToIssues}
        className="w-10 h-10 rounded-full hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title={isAr ? 'مركز معالجة المشاكل وقائمة المهام' : 'Issue Resolution & To-Do'}
      >
        <AlertTriangle className="w-4 h-4" />
      </button>

      {/* 5. Comprehensive Site Report */}
      <button
        onClick={onNavigateToReport}
        className="w-10 h-10 rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title={isAr ? 'تقرير الموقع الشامل' : 'Comprehensive Site Report'}
      >
        <FileSpreadsheet className="w-4 h-4" />
      </button>

      {/* 6. Settings */}
      <button
        onClick={onNavigateToSettings}
        className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title={isAr ? 'إعدادات المواقع والمراقبة' : 'Settings & Monitoring'}
      >
        <Settings className="w-4 h-4" />
      </button>
    </aside>
  );
};
