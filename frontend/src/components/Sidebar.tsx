import React, { useState } from 'react';
import { useI18n } from '../i18n';
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Network,
  Code2,
  Tags,
  Link2,
  Copy,
  ShieldAlert,
  History,
  Settings,
  ChevronDown,
  PlusCircle,
  ExternalLink,
  Edit2,
} from 'lucide-react';

export interface Project {
  id: string;
  name: string;
  domain: string;
  favicon?: string;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (p: Project) => void;
  onAddProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  projects,
  activeProject,
  onSelectProject,
  onAddProject,
}) => {
  const { t } = useI18n();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
    { id: 'issues', label: t('nav.issues'), icon: AlertTriangle },
    { id: 'pages', label: t('nav.pages'), icon: FileText },
    { id: 'sitemap', label: t('nav.sitemap'), icon: Network },
    { id: 'schema', label: t('nav.schema'), icon: Code2 },
    { id: 'metadata', label: t('nav.metadata'), icon: Tags },
    { id: 'canonicals', label: t('nav.canonicals'), icon: Link2 },
    { id: 'similarity', label: t('nav.similarity'), icon: Copy },
    { id: 'subdomains', label: t('nav.subdomains'), icon: ShieldAlert },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-surface-hairline flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* 1. Project Switcher Card */}
      <div className="p-4 border-b border-surface-hairline relative">
        <div
          onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
          className="editorial-card p-3 cursor-pointer hover:border-gold-border transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gold-tint border border-gold-border flex items-center justify-center text-gold font-bold text-sm shrink-0">
              {activeProject?.name?.charAt(0) || 'P'}
            </div>
            <div className="overflow-hidden text-left rtl:text-right">
              <div className="font-bold text-body-md text-ink truncate leading-tight">
                {activeProject?.name || 'My Website'}
              </div>
              <div className="text-xs text-ink-muted truncate">
                {activeProject?.domain || 'example.com'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />
        </div>

        {/* Dropdown Menu */}
        {isSwitcherOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white rounded-card border border-surface-hairline shadow-lg z-50 py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              {projects.length} {t('header.projects_available')}
            </div>
            <div className="max-h-48 overflow-y-auto my-1">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    setIsSwitcherOpen(false);
                  }}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gold-tint/40 ${
                    p.id === activeProject.id ? 'bg-gold-tint/60 text-gold-hover font-semibold' : 'text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-gold"></span>
                    <span className="text-body-sm truncate">{p.name}</span>
                  </div>
                  <Edit2 className="w-3.5 h-3.5 text-ink-muted hover:text-ink" />
                </div>
              ))}
            </div>

            {projects.length < 5 && (
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
            )}
          </div>
        )}
      </div>

      {/* 2. Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-body-md transition-colors text-left rtl:text-right ${
                isActive
                  ? 'bg-gold-tint text-gold-hover font-bold border border-gold-border'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-card'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-gold' : 'text-ink-muted'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Footer info */}
      <div className="p-4 border-t border-surface-hairline text-center text-xs text-ink-muted">
        <div>SEO GPS &bull; Zero-Cost Hosting</div>
        <div className="mt-0.5 text-ink-subtle">Ismail El Asiouty</div>
      </div>
    </aside>
  );
};
