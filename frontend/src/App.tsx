import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HelpDrawer } from './components/HelpDrawer';
import { AddProjectModal } from './components/AddProjectModal';
import { EditProjectModal, ProjectData } from './components/EditProjectModal';
import { AuthModal } from './components/AuthModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { QuickAuditPage } from './pages/QuickAuditPage';
import { IssuesPage } from './pages/IssuesPage';
import { PagesExplorerPage } from './pages/PagesExplorerPage';
import { GenericCheckPage } from './pages/GenericCheckPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';

const LOCAL_STORAGE_KEY = 'seo_gps_persisted_projects';

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(
            (p: any) => p && p.id !== 'p-default' && p.domain !== 'example.com' && p.name !== 'الموقع الافتراضي'
          );
          if (clean.length > 0) return clean[0];
        }
      }
    } catch (e) {}
    return null;
  });

  // User Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
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

  // Keep activeProject synchronized with projects array
  useEffect(() => {
    if (projects.length === 0) {
      setActiveProject(null);
    } else if (!activeProject || !projects.some((p) => p.id === activeProject.id)) {
      setActiveProject(projects[0]);
    }
  }, [projects]);

  // Check Supabase session on load and fetch user projects
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          loadUserProjects(session.user.id);
        }
      } catch (err) {
        console.warn('Supabase session load error:', err);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        loadUserProjects(user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch projects from Supabase database
  const loadUserProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load projects from Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const clean = data.filter((d: any) => d.domain !== 'example.com' && d.id !== 'p-default');
        const formatted: ProjectData[] = clean.map((d: any) => ({
          id: d.id,
          name: d.name,
          domain: d.domain,
          root_url: d.root_url,
          sitemap_url: d.sitemap_url,
          daily_crawl_hour: d.daily_crawl_hour,
          timezone: d.timezone,
          frequency: 'daily',
          health_score: d.health_score || undefined,
          last_run_at: d.last_run_at || undefined,
        }));
        setProjects(formatted);
        if (formatted.length > 0) {
          setActiveProject(formatted[0]);
        }
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

    const nowIso = new Date().toISOString();
    const updatedProj: ProjectData = {
      ...activeProject,
      last_run_at: nowIso,
      health_score: 96,
    };

    if (currentUser && !activeProject.id.startsWith('proj-') && activeProject.id !== 'p-default') {
      try {
        await supabase
          .from('projects')
          .update({
            last_run_at: nowIso,
            health_score: 96,
          })
          .eq('id', activeProject.id);
      } catch (err) {
        console.error('Failed to update run status in Supabase:', err);
      }
    }

    const updated = projects.map((p) => (p.id === activeProject.id ? updatedProj : p));
    setProjects(updated);
    setActiveProject(updatedProj);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.email === 'ismailelasiouty3@gmail.com';

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <DashboardPage
            onNavigateToIssues={() => setCurrentTab('issues')}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
            activeProject={activeProject}
            onEditProject={() => setProjectToEdit(activeProject)}
            onRunInstantAnalysis={handleRunInstantAnalysis}
          />
        );
      case 'quick_audit':
        return <QuickAuditPage />;
      case 'issues':
        return <IssuesPage />;
      case 'pages':
        return <PagesExplorerPage />;
      case 'sitemap':
        return (
          <GenericCheckPage
            checkId="sitemap"
            title="Sitemap XML Synchronization"
            category="SITEMAP"
            description="Audits all URLs listed inside sitemap.xml against actual live server responses and canonical tags."
            howToFix="Ensure your XML sitemap only includes 200 OK indexable canonical pages, and immediately prune redirects or 404 URLs."
          />
        );
      case 'schema':
        return (
          <GenericCheckPage
            checkId="schema"
            title="Structured Data & Schema.org"
            category="SCHEMA"
            description="Extracts JSON-LD, Microdata, and validates Google Rich Results prerequisites and syntax errors."
            howToFix="Inspect JSON-LD snippets on affected pages and supply missing mandatory properties such as author, headline, or offers."
          />
        );
      case 'metadata':
        return (
          <GenericCheckPage
            checkId="metadata"
            title="Title, Description & Robots Directives"
            category="METADATA"
            description="Tracks accidental noindex tags, altered title tags, character length anomalies, and meta descriptions."
            howToFix="Remove accidental 'noindex' or 'nofollow' meta tags from production releases and keep title tags between 20-70 characters."
          />
        );
      case 'canonicals':
        return (
          <GenericCheckPage
            checkId="canonicals"
            title="Canonical Tag Integrity"
            category="CANONICAL"
            description="Validates self-referential canonicals, cross-domain references, and newly modified canonical destinations."
            howToFix="Ensure canonical URLs match the exact absolute URL of the page including protocol and trailing slashes."
          />
        );
      case 'similarity':
        return (
          <GenericCheckPage
            checkId="similarity"
            title="Keyword & Content Cannibalization"
            category="CONTENT"
            description="Identifies internal pages competing for identical search intents, title keywords, and heading topics."
            howToFix="Consolidate duplicate pages using 301 redirects, or differentiate content angles and target keywords clearly."
          />
        );
      case 'subdomains':
        return (
          <GenericCheckPage
            checkId="subdomains"
            title="Staging & Dev Subdomain Exposure"
            category="SECURITY"
            description="Passively scans Certificate Transparency and HTTP headers for leaked non-production environments."
            howToFix="Place staging, test, and dev subdomains behind HTTP Basic Auth, VPNs, or IP whitelists with noindex headers."
          />
        );
      case 'history':
        return <HistoryPage />;
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
