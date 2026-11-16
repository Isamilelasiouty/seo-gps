import React, { useState } from 'react';
import { useI18n } from '../i18n';
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  FileText,
  History,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Plus,
  Edit2,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Cpu,
  Search,
  RefreshCw,
  Home,
  Menu,
} from 'lucide-react';
import { ProjectData } from './EditProjectModal';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  projects: ProjectData[];
  activeProject: ProjectData | null;
  onSelectProject: (p: ProjectData) => void;
  onAddProject: () => void;
  onEditProject: (p: ProjectData) => void;
  currentUser?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  projects,
  activeProject,
  onSelectProject,
  onAddProject,
  onEditProject,
  currentUser,
}) => {
  const { t, locale } = useI18n();
  const isAr = locale !== 'en';
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('seo_gps_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('seo_gps_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const isAdmin = currentUser?.email === 'ismailelasiouty3@gmail.com';

  const navItems = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
    { id: 'site_report', label: t('nav.site_report') || (isAr ? 'تقرير الموقع الشامل' : 'Site Report'), icon: Sparkles },
    { id: 'issues', label: t('nav.issues'), icon: AlertTriangle },
    { id: 'ai_advisor', label: isAr ? 'مستشار السيو الذكي' : 'AI SEO Advisor', icon: Cpu },
    { id: 'pages', label: t('nav.pages'), icon: FileText },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({
      id: 'admin',
      label: t('nav.admin'),
      icon: BarChart3,
    });
  }

  // =========================================================================
  // 1. COLLAPSED MODE: FLOATING CAPSULE DOCK (Identical to Image 3 & Image 2)
  // =========================================================================
  if (isCollapsed) {
    return (
      <aside
        className="w-16 md:w-20 flex flex-col items-center py-4 select-none shrink-0 sticky top-20 h-fit z-30 transition-all duration-300 ease-in-out gap-3"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Controls Widget (Image 2 style): Menu/Expand + Home */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-1.5 flex flex-col items-center gap-1">
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all relative group"
            title={isAr ? 'توسيع القائمة الجانبية' : 'Expand Sidebar'}
            aria-label="Expand Sidebar"
          >
            <Menu className="w-4 h-4 stroke-[2]" />
            {/* Tooltip */}
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'توسيع القائمة' : 'Expand Menu'}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('overview')}
            className={`p-2 rounded-xl transition-all relative group ${
              currentTab === 'overview'
                ? 'text-gold bg-gold-tint font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title={isAr ? 'الرئيسية / نظرة عامة' : 'Home / Overview'}
          >
            <Home className="w-4 h-4 stroke-[2]" />
            {/* Tooltip */}
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'الرئيسية' : 'Home'}
            </span>
          </button>
        </div>

        {/* Floating Capsule Dock (Exact Image 3 style!) */}
        <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.08)] py-3.5 px-2 flex flex-col items-center gap-3.5 relative">
          {/* Top Circular Action Button with Plus (+) */}
          <button
            onClick={onAddProject}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 via-gold to-amber-400 hover:from-amber-700 hover:via-gold-hover hover:to-amber-500 text-white flex items-center justify-center shadow-md shadow-gold/30 hover:shadow-gold/50 hover:scale-105 active:scale-95 transition-all group relative cursor-pointer"
            title={isAr ? 'إضافة موقع جديد' : 'Add New Website'}
            aria-label="Add New Website"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            {/* Tooltip */}
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'إضافة موقع جديد' : 'Add New Website'}
            </span>
          </button>

          {/* 1. Search / Site Report Icon */}
          <button
            onClick={() => onSelectTab('site_report')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'site_report'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="Site Report"
          >
            <Search className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'تقرير الموقع الشامل' : 'Site Report'}
            </span>
          </button>

          {/* 2. Refresh / Audit History Icon */}
          <button
            onClick={() => onSelectTab('history')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'history'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="Audit History"
          >
            <RefreshCw className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'سجل الفحوصات' : 'Audit History'}
            </span>
          </button>

          {/* 3. Alert Triangle / Issues Icon */}
          <button
            onClick={() => onSelectTab('issues')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'issues'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="Issues"
          >
            <AlertTriangle className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'المشاكل والتنبيهات' : 'Issues & Alerts'}
            </span>
          </button>

          {/* 4. Document / Pages Explorer Icon */}
          <button
            onClick={() => onSelectTab('pages')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'pages'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="Pages Explorer"
          >
            <FileText className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'مستكشف الصفحات' : 'Pages Explorer'}
            </span>
          </button>

          {/* 5. AI Advisor Icon */}
          <button
            onClick={() => onSelectTab('ai_advisor')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'ai_advisor'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="AI SEO Advisor"
          >
            <Cpu className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'مستشار السيو الذكي' : 'AI SEO Advisor'}
            </span>
          </button>

          {/* Divider hairline */}
          <div className="w-6 h-px bg-slate-200 my-0.5" />

          {/* 6. Settings Gear Icon */}
          <button
            onClick={() => onSelectTab('settings')}
            className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
              currentTab === 'settings'
                ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 stroke-[1.8]" />
            <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
              {isAr ? 'الإعدادات' : 'Settings'}
            </span>
          </button>

          {/* 7. Admin Icon (if admin) */}
          {isAdmin && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`p-2.5 rounded-2xl transition-all relative group cursor-pointer ${
                currentTab === 'admin'
                  ? 'text-gold bg-gold-tint font-bold border border-gold-border/70 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
              }`}
              aria-label="Admin"
            >
              <BarChart3 className="w-5 h-5 stroke-[1.8]" />
              <span className="pointer-events-none absolute rtl:right-full rtl:mr-3 ltr:left-full ltr:ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
                {isAr ? 'لوحة الإدارة' : 'Admin'}
              </span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // =========================================================================
  // 2. EXPANDED MODE: FULL SIDEBAR (Identical to Image 1)
  // =========================================================================
  return (
    <aside
      className="w-64 bg-white/95 backdrop-blur-md border-r rtl:border-r-0 rtl:border-l border-slate-200/80 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 transition-all duration-300 ease-in-out shadow-xs"
    >
      {/* 1. Header with Collapse Toggle Button */}
      <div className="p-3 flex items-center justify-between border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {isAr ? 'القائمة الرئيسية' : 'Main Menu'}
        </span>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-xl hover:bg-gold-tint/60 text-slate-400 hover:text-gold transition-colors cursor-pointer"
          title={isAr ? 'تصغير القائمة إلى الكبسولة العائمة' : 'Collapse to Floating Dock'}
          aria-label="Collapse Sidebar"
        >
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Project Switcher (Image 1 style) */}
      <div className="p-3 border-b border-slate-100 relative">
        <div className="p-3 transition-all flex items-center justify-between rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-gold/50">
          <div
            onClick={() => {
              if (projects.length === 0) {
                onAddProject();
              } else {
                setIsSwitcherOpen(!isSwitcherOpen);
              }
            }}
            className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-sm shrink-0 shadow-xs">
              {activeProject?.name?.charAt(0) || '+'}
            </div>
            <div className="overflow-hidden text-left rtl:text-right">
              <div className="font-bold text-body-md text-slate-800 truncate leading-tight">
                {activeProject?.name || (isAr ? 'اختر موقعاً' : 'Select Project')}
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                {activeProject?.domain || (isAr ? 'إضافة موقع جديد' : 'Add New Project')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pl-2 rtl:pl-0 rtl:pr-2 shrink-0">
            {activeProject ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProject(activeProject);
                }}
                className="p-1 rounded-lg hover:bg-gold-tint/60 text-slate-400 hover:text-gold transition-colors cursor-pointer"
                title={t('project_actions.edit')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddProject();
                }}
                className="w-7 h-7 rounded-lg bg-gold-tint border border-gold-border/80 flex items-center justify-center text-gold hover:bg-gold hover:text-white transition-all cursor-pointer"
                title={isAr ? 'إضافة موقع جديد' : 'Add Project'}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <ChevronDown
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-800 transition-colors"
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isSwitcherOpen && (
          <div className="absolute top-full left-3 right-3 mt-2 bg-white rounded-2xl border border-slate-200/80 shadow-xl z-50 py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>
                {projects.length} {t('header.projects_available')}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto my-1 divide-y divide-slate-100">
              {projects.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 text-center">
                  {t('empty_states.no_projects_title')}
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      setIsSwitcherOpen(false);
                    }}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gold-tint/40 ${
                      activeProject && p.id === activeProject.id
                        ? 'bg-gold-tint/60 text-gold-hover font-semibold'
                        : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-gold"></span>
                      <span className="text-body-sm truncate">{p.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSwitcherOpen(false);
                        onEditProject(p);
                      }}
                      className="p-1 rounded hover:bg-white text-slate-400 hover:text-gold cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              onClick={() => {
                setIsSwitcherOpen(false);
                onAddProject();
              }}
              className="px-3 py-2 mt-1 border-t border-slate-100 flex items-center gap-2 text-gold font-semibold text-body-sm cursor-pointer hover:bg-gold-tint/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('header.add_project')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Menu (Image 1 style) */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-body-sm transition-all duration-200 text-left rtl:text-right cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-50 to-gold-tint/50 text-gold font-extrabold border border-gold-border/80 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-gold' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 4. Bottom Footer */}
      <div className="border-t border-slate-100 text-center text-xs text-slate-400 p-4">
        <div className="font-semibold text-slate-500">{isAr ? 'SEO GPS • النسخة الاحترافية' : 'SEO GPS • Professional Edition'}</div>
        <div className="mt-0.5 text-slate-400 text-[11px]">{t('by_owner')}</div>
      </div>
    </aside>
  );
};
