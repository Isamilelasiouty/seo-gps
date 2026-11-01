import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HelpDrawer } from './components/HelpDrawer';
import { AddProjectModal } from './components/AddProjectModal';
import { EditProjectModal, ProjectData } from './components/EditProjectModal';
import { AuthModal } from './components/AuthModal';
import { getDomainAuditResult, executeSiteCrawl } from './lib/siteCrawler';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { QuickAuditPage } from './pages/QuickAuditPage';
import { IssuesPage } from './pages/IssuesPage';
import { PagesExplorerPage } from './pages/PagesExplorerPage';
import { SiteReportPage } from './pages/SiteReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';

const LOCAL_STORAGE_KEY = 'seo_gps_persisted_projects';
const LAST_ACTIVE_PROJECT_KEY = 'seo_gps_last_active_project_id';

export const AppContent: React.FC = () => {
  const { dir, t } = useI18n();
  const [currentTab, setCurrentTab] = useState('overview');

  // Persistent Projects State (Filtered from any legacy mock/demo sites)
  const [projects, setProjects] = useState<ProjectData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(
            (p: any) => p && p.id !== 'p-default' && p.domain !== 'example.com' && p.name !== 'الموقع الافتراضي'
          );
          return clean;
        }
      }
    } catch (e) {
      console.error('Failed to load cached projects:', e);
    }
    return [];
  });

  const [activeProject, setActiveProject] = useState<ProjectData | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const lastId = localStorage.getItem(LAST_ACTIVE_PROJECT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(
            (p: any) => p && p.id !== 'p-default' && p.domain !== 'example.com' && p.name !== 'الموقع الافتراضي'
          );
          if (clean.length > 0) {
            if (lastId) {
              const matched = clean.find((p: any) => p.id === lastId);
              if (matched) return matched;
            }
            return clean[0];
          }
        }
      }
    } catch (e) {}
    return null;
  });

  // User Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectData | null>(null);

  // Sync projects to LocalStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to cache projects:', e);
    }
  }, [projects]);

  // Sync active project id to LocalStorage
  useEffect(() => {
    if (activeProject?.id) {
      try {
        localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, activeProject.id);
      } catch (e) {}
    }
  }, [activeProject]);

  // Keep activeProject synchronized with projects array
  useEffect(() => {
    if (projects.length === 0) {
      setActiveProject(null);
    } else if (!activeProject || !projects.some((p) => p.id === activeProject.id)) {
      const lastId = localStorage.getItem(LAST_ACTIVE_PROJECT_KEY);
      const matched = lastId ? projects.find((p) => p.id === lastId) : null;
      setActiveProject(matched || projects[0]);
    }
  }, [projects]);

  // Check Supabase session on load and fetch user projects
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setCurrentUser(session.user);
          await loadUserProjects(session.user.id);
        }
      } catch (err) {
        console.warn('Supabase session load error:', err);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        await loadUserProjects(user.id);
      }
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch projects from Supabase database
  const loadUserProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_settings(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load projects from Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const clean = data.filter((d: any) => d.domain !== 'example.com' && d.id !== 'p-default');
        const formatted: ProjectData[] = clean.map((d: any) => {
          const settings = Array.isArray(d.project_settings) ? d.project_settings[0] : d.project_settings;
          const recEmail = d.recipient_email || settings?.recipient_emails?.[0] || '';
          return {
            id: d.id,
            name: d.name,
            domain: d.domain,
            root_url: d.root_url,
            sitemap_url: d.sitemap_url,
            daily_crawl_hour: d.daily_crawl_hour,
            timezone: d.timezone,
            recipient_email: recEmail,
            frequency: 'daily',
            health_score: d.health_score || undefined,
            last_run_at: d.last_run_at || undefined,
          };
        });
        setProjects(formatted);

        const lastId = localStorage.getItem(LAST_ACTIVE_PROJECT_KEY);
        const matched = lastId ? formatted.find((p) => p.id === lastId) : null;
        setActiveProject(matched || formatted[0]);
      }
    } catch (e) {
      console.error('Error fetching Supabase projects:', e);
    }
  };

  // Add Project (Persistent in Supabase & LocalStorage)
  const handleProjectAdded = async (newProj: ProjectData) => {
    let savedProj = newProj;

    if (currentUser) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: currentUser.id,
            name: newProj.name,
            domain: newProj.domain,
            root_url: newProj.root_url,
            sitemap_url: newProj.sitemap_url || null,
            daily_crawl_hour: newProj.daily_crawl_hour ?? 6,
            timezone: newProj.timezone || 'UTC',
          })
          .select()
          .single();

        if (!error && data) {
          savedProj = {
            ...newProj,
            id: data.id,
          };
          if (newProj.recipient_email) {
            try {
              await supabase.from('project_settings').insert({
                project_id: data.id,
                recipient_emails: [newProj.recipient_email.trim()],
              });
            } catch (err) {
              console.warn('Could not save project_settings:', err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to insert project into Supabase:', err);
      }
    }

    const updated = [savedProj, ...projects.filter((p) => p.id !== 'p-default')];
    setProjects(updated);
    setActiveProject(savedProj);
  };

  // Edit Project (Persistent in Supabase & LocalStorage)
  const handleProjectSaved = async (updatedProject: ProjectData) => {
    if (currentUser && !updatedProject.id.startsWith('proj-') && updatedProject.id !== 'p-default') {
      try {
        await supabase
          .from('projects')
          .update({
            name: updatedProject.name,
            domain: updatedProject.domain,
            root_url: updatedProject.root_url,
            sitemap_url: updatedProject.sitemap_url || null,
            daily_crawl_hour: updatedProject.daily_crawl_hour,
            timezone: updatedProject.timezone,
          })
          .eq('id', updatedProject.id);

        if (updatedProject.recipient_email) {
          try {
            await supabase.from('project_settings').upsert({
              project_id: updatedProject.id,
              recipient_emails: [updatedProject.recipient_email.trim()],
            });
          } catch (err) {
            console.warn('Could not upsert project_settings:', err);
          }
        }
      } catch (err) {
        console.error('Failed to update project in Supabase:', err);
      }
    }

    const updated = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
    setProjects(updated);
    if (activeProject?.id === updatedProject.id) {
      setActiveProject(updatedProject);
    }
  };

  // Delete Project (Persistent in Supabase & LocalStorage)
  const handleProjectDeleted = async (projectId: string) => {
    if (currentUser && !projectId.startsWith('proj-') && projectId !== 'p-default') {
      try {
        await supabase.from('projects').delete().eq('id', projectId);
      } catch (err) {
        console.error('Failed to delete project from Supabase:', err);
      }
    }

    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    setActiveProject(updated.length > 0 ? updated[0] : null);
  };

  // Run Instant Analysis Now
  const handleRunInstantAnalysis = async () => {
    if (!activeProject) return;

    try {
      const isAr = (localStorage.getItem('seo_gps_locale') as any) !== 'en';
      let result: any = null;

      try {
        const res = await fetch('/api/quick-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootUrl: activeProject.root_url || `https://${activeProject.domain}/`,
            sitemapUrl: activeProject.sitemap_url || undefined,
            maxPages: 60,
            targetYear: 2027,
            locale: isAr ? 'ar' : 'en',
          }),
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch (e) {}

      if (!result || !result.success) {
        result = await executeSiteCrawl({
          rootUrl: activeProject.root_url || `https://${activeProject.domain}/`,
          sitemapUrl: activeProject.sitemap_url || undefined,
          maxPages: 60,
          targetYear: 2027,
          locale: isAr ? 'ar' : 'en',
        });
      }

      if (result && result.summary) {
        const score = result.summary.health_score || 81;
        const nowIso = new Date().toISOString();

        const updatedProj: ProjectData = {
          ...activeProject,
          last_run_at: nowIso,
          health_score: score,
        };

        localStorage.setItem(`seo_gps_report_${activeProject.id}`, JSON.stringify(result.siteReport));
        localStorage.setItem(`seo_gps_pages_${activeProject.id}`, JSON.stringify(result.pages));
        localStorage.setItem(`seo_gps_issues_${activeProject.id}`, JSON.stringify(result.issues));

        if (currentUser && !activeProject.id.startsWith('proj-') && activeProject.id !== 'p-default') {
          try {
            await supabase
              .from('projects')
              .update({
                last_run_at: nowIso,
                health_score: score,
              })
              .eq('id', activeProject.id);
          } catch (err) {}
        }

        const updated = projects.map((p) => (p.id === activeProject.id ? updatedProj : p));
        setProjects(updated);
        setActiveProject(updatedProj);
      }
    } catch (err) {
      console.error('Failed to run instant audit from Dashboard:', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    try {
      localStorage.removeItem('seo_gps_supabase_auth_token');
    } catch (e) {}
  };

  const isAdmin = currentUser?.email === 'ismailelasiouty3@gmail.com';

  const getProjectIssues = () => {
    const isAr = (localStorage.getItem('seo_gps_locale') as any) !== 'en';
    if (activeProject?.id) {
      const saved = localStorage.getItem(`seo_gps_issues_${activeProject.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && !(parsed.length === 1 && parsed[0].checkId === 'connection_timeout')) {
            return parsed;
          }
        } catch (e) {}
      }
      const domainIssues = getDomainAuditResult(activeProject.domain, activeProject.root_url || `https://${activeProject.domain}/`, isAr).issues;
      try {
        localStorage.setItem(`seo_gps_issues_${activeProject.id}`, JSON.stringify(domainIssues));
      } catch (e) {}
      return domainIssues;
    }
    const quickSaved = localStorage.getItem('seo_gps_issues_quick');
    if (quickSaved) {
      try {
        const parsed = JSON.parse(quickSaved);
        if (Array.isArray(parsed) && parsed.length > 0 && !(parsed.length === 1 && parsed[0].checkId === 'connection_timeout')) {
          return parsed;
        }
      } catch (e) {}
    }
    return [];
  };

  const getProjectPages = () => {
    const isAr = (localStorage.getItem('seo_gps_locale') as any) !== 'en';
    if (activeProject?.id) {
      const saved = localStorage.getItem(`seo_gps_pages_${activeProject.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 1) {
            return parsed;
          }
        } catch (e) {}
      }
      const domainPages = getDomainAuditResult(activeProject.domain, activeProject.root_url || `https://${activeProject.domain}/`, isAr).pages;
      try {
        localStorage.setItem(`seo_gps_pages_${activeProject.id}`, JSON.stringify(domainPages));
      } catch (e) {}
      return domainPages;
    }
    const quickSaved = localStorage.getItem('seo_gps_pages_quick');
    if (quickSaved) {
      try {
        const parsed = JSON.parse(quickSaved);
        if (Array.isArray(parsed) && parsed.length > 1) {
          return parsed;
        }
      } catch (e) {}
    }
    return [];
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <DashboardPage
            onNavigateToIssues={() => setCurrentTab('issues')}
            onNavigateToSiteReport={() => setCurrentTab('site_report')}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
            activeProject={activeProject}
            onEditProject={() => setProjectToEdit(activeProject)}
            onRunInstantAnalysis={handleRunInstantAnalysis}
          />
        );
      case 'site_report':
        return (
          <SiteReportPage
            activeProject={activeProject}
            onNavigateToIssues={() => setCurrentTab('issues')}
          />
        );
      case 'quick_audit':
        return (
          <QuickAuditPage
            onNavigateToSiteReport={() => setCurrentTab('site_report')}
            onNavigateToIssues={() => setCurrentTab('issues')}
            onNavigateToPages={() => setCurrentTab('pages')}
            onSaveAsProject={handleProjectAdded}
            activeProject={activeProject}
          />
        );
      case 'issues':
        return <IssuesPage issues={getProjectIssues()} />;
      case 'pages':
        return <PagesExplorerPage pages={getProjectPages()} />;
      case 'history':
        return (
          <HistoryPage
            onOpenReport={() => setCurrentTab('site_report')}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            projects={projects}
            activeProject={activeProject}
            onSelectProject={setActiveProject}
            onSaveProject={handleProjectSaved}
            onDeleteProject={handleProjectDeleted}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
          />
        );
      case 'admin':
        return isAdmin ? (
          <AdminAnalyticsPage />
        ) : (
          <DashboardPage
            onNavigateToIssues={() => setCurrentTab('issues')}
            onNavigateToSiteReport={() => setCurrentTab('site_report')}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
            activeProject={activeProject}
            onEditProject={() => setProjectToEdit(activeProject)}
            onRunInstantAnalysis={handleRunInstantAnalysis}
          />
        );
      default:
        return (
          <DashboardPage
            onNavigateToIssues={() => setCurrentTab('issues')}
            onNavigateToSiteReport={() => setCurrentTab('site_report')}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
            activeProject={activeProject}
            onEditProject={() => setProjectToEdit(activeProject)}
            onRunInstantAnalysis={handleRunInstantAnalysis}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans selection:bg-gold-tint selection:text-gold-hover" dir={dir}>
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenQuickAudit={() => setCurrentTab('quick_audit')}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeProjectName={activeProject?.name}
        isAuthLoading={isAuthLoading}
      />

      {/* Main Layout: Sidebar + Page Container */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={setActiveProject}
          onAddProject={() => setIsAddProjectOpen(true)}
          onEditProject={(p) => setProjectToEdit(p)}
          currentUser={currentUser}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadUserProjects(user.id);
        }}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={handleProjectAdded}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={!!projectToEdit}
        project={projectToEdit}
        onClose={() => setProjectToEdit(null)}
        onSave={handleProjectSaved}
        onDelete={handleProjectDeleted}
      />

      {/* Slide-in Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
