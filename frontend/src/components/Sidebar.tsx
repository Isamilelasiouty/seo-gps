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
  Edit2,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
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

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-surface border-r rtl:border-r-0 rtl:border-l border-surface-hairline flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 transition-all duration-300 ease-in-out`}
    >
      {/* 1. Header with Collapse / Expand Toggle Button */}
      <div className={`p-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-surface-hairline`}>
        {!isCollapsed && (
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            {isAr ? 'القائمة الرئيسية' : 'Main Menu'}
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-gold-tint text-ink-muted hover:text-gold transition-colors"
          title={
            isCollapsed
              ? (isAr ? 'توسيع القائمة الجانبية' : 'Expand Sidebar')
              : (isAr ? 'تصغير القائمة الجانبية' : 'Collapse Sidebar')
          }
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Project Switcher */}
      <div className="p-3 border-b border-surface-hairline relative">
        {isCollapsed ? (
          /* Collapsed Project Button */
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (projects.length === 0) {
                  onAddProject();
                } else {
                  setIsSwitcherOpen(!isSwitcherOpen);
                }
              }}
              className="w-10 h-10 rounded-xl bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-base hover:shadow-sm transition-all"
              title={activeProject?.name || (isAr ? 'اختر موقعاً' : 'Select Project')}
            >
              {activeProject?.name?.charAt(0) || '+'}
            </button>
          </div>
        ) : (
          /* Expanded Project Card */
          <div className="editorial-card p-3 transition-all flex items-center justify-between">
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
              <div className="w-8 h-8 rounded-lg bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-sm shrink-0">
                {activeProject?.name?.charAt(0) || '+'}
              </div>
              <div className="overflow-hidden text-left rtl:text-right">
                <div className="font-bold text-body-md text-ink truncate leading-tight">
                  {activeProject?.name || t('dashboard.no_projects_selected')}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {activeProject?.domain || t('header.add_project')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2 rtl:pl-0 rtl:pr-2 shrink-0">
              {activeProject && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(activeProject);
                  }}
                  className="p-1 rounded hover:bg-gold-tint/60 text-ink-muted hover:text-gold"
                  title={t('project_actions.edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="w-4 h-4 text-ink-muted cursor-pointer hover:text-ink"
              />
            </div>
          </div>
        )}

        {/* Dropdown Menu */}
        {isSwitcherOpen && (
          <div
            className={`absolute top-full ${
              isCollapsed ? 'left-2 w-64' : 'left-3 right-3'
            } mt-2 bg-white rounded-card border border-surface-hairline shadow-xl z-50 py-2`}
          >
            <div className="px-3 py-1 text-[11px] font-bold text-ink-muted uppercase tracking-wider flex justify-between items-center">
              <span>
                {projects.length} {t('header.projects_available')}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto my-1 divide-y divide-surface-hairline/50">
              {projects.length === 0 ? (
                <div className="px-3 py-3 text-xs text-ink-muted text-center">
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
                        : 'text-ink'
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
                      className="p-1 rounded hover:bg-white text-ink-muted hover:text-gold"
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
              className="px-3 py-2 mt-1 border-t border-surface-hairline flex items-center gap-2 text-gold font-semibold text-body-sm cursor-pointer hover:bg-gold-tint/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('header.add_project')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Menu */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-1'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return isCollapsed ? (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gold-tint text-gold font-extrabold border border-gold-border/80 shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-gold-tint/30'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-gold' : 'text-ink-muted'}`} />
            </button>
          ) : (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm transition-all duration-200 text-left rtl:text-right ${
                isActive
                  ? 'bg-gold-tint text-gold font-extrabold border border-gold-border/80 shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-gold-tint/30 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-gold' : 'text-ink-muted'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 4. Bottom Footer */}
      <div className={`border-t border-surface-hairline text-center text-xs text-ink-muted ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="text-[10px] font-bold text-ink-muted">GPS</div>
        ) : (
          <>
            <div>{isAr ? 'SEO GPS • النسخة الاحترافية' : 'SEO GPS • Professional Edition'}</div>
            <div className="mt-0.5 text-ink-subtle">{t('by_owner')}</div>
          </>
        )}
      </div>
    </aside>
  );
};
