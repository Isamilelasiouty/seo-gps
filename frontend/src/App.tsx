import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HelpDrawer } from './components/HelpDrawer';
import { AddProjectModal } from './components/AddProjectModal';
import { EditProjectModal, ProjectData } from './components/EditProjectModal';
import { AuthModal } from './components/AuthModal';
import { AccessGateModal } from './components/AccessGateModal';
import { ProactiveAiAssistant } from './components/ProactiveAiAssistant';
import { getDomainAuditResult, executeSiteCrawl } from './lib/siteCrawler';
import { getProjectSnapshots, getResolvedIssues, createAndSaveSnapshot } from './lib/snapshotManager';
import { syncLeadsFromCloud } from './lib/leadTracker';
import { safeSetStorageItem } from './lib/storageHelper';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { QuickAuditPage } from './pages/QuickAuditPage';
import { IssuesPage } from './pages/IssuesPage';
import { PagesExplorerPage } from './pages/PagesExplorerPage';
import { SiteReportPage } from './pages/SiteReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AiAdvisorPage } from './pages/AiAdvisorPage';

const USER_SESSION_KEY = 'seo_gps_persisted_user_session';
const getUserProjectsKey = (userId?: string) => (userId ? `seo_gps_projects_${userId}` : 'seo_gps_projects_anon');
const getUserLastActiveKey = (userId?: string) => (userId ? `seo_gps_last_active_${userId}` : 'seo_gps_last_active_anon');

export const AppContent: React.FC = () => {
  const { dir, t } = useI18n();
  const [currentTab, setCurrentTab] = useState('overview');

  // User Auth State with Instant Session Persistence on Reload
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem(USER_SESSION_KEY);
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {}
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // User-Isolated Persistent Projects State
  const [projects, setProjects] = useState<ProjectData[]>(() => {
    try {
      const savedUser = localStorage.getItem(USER_SESSION_KEY);
      const userId = savedUser ? JSON.parse(savedUser)?.id : undefined;
      if (!userId) return []; // Unauthenticated visitors have isolated empty state
      const userKey = getUserProjectsKey(userId);
      const saved = localStorage.getItem(userKey);
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
      const savedUser = localStorage.getItem(USER_SESSION_KEY);
      const userId = savedUser ? JSON.parse(savedUser)?.id : undefined;
      if (!userId) return null;
      const userKey = getUserProjectsKey(userId);
      const lastKey = getUserLastActiveKey(userId);
      const saved = localStorage.getItem(userKey);
      const lastId = localStorage.getItem(lastKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
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

  // Mandatory Pre-Audit Registration Gate
  const [isAccessGateOpen, setIsAccessGateOpen] = useState<boolean>(() => {
    try {
      const reg = localStorage.getItem('seo_gps_registered_user');
      const session = localStorage.getItem(USER_SESSION_KEY);
      return !reg && !session;
    } catch (e) {
      return true;
    }
  });

  const handleAccessGateSuccess = (userData: { name: string; email: string; domain?: string }) => {
    setIsAccessGateOpen(false);
    if (userData.domain) {
      const cleanDom = userData.domain.toLowerCase().trim();
      const existing = projects.find((p) => p.domain.toLowerCase() === cleanDom);
      if (existing) {
        setActiveProject(existing);
      } else {
        const newP: ProjectData = {
          id: `proj-${Date.now()}`,
          name: userData.name ? `${userData.name} - ${cleanDom}` : cleanDom,
          domain: cleanDom,
          root_url: `https://${cleanDom}`,
          sitemap_url: `https://${cleanDom}/sitemap.xml`,
          daily_crawl_hour: 6,
          timezone: 'UTC',
          recipient_email: userData.email,
          frequency: 'daily',
          health_score: 100,
        };
        handleProjectAdded(newP);
      }
    }
  };
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectData | null>(null);

  // Sync current user to LocalStorage
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
      } catch (e) {}
    }
  }, [currentUser]);

  // Sync projects to User-Scoped LocalStorage whenever modified
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const userKey = getUserProjectsKey(currentUser.id);
      localStorage.setItem(userKey, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to cache projects:', e);
    }
  }, [projects, currentUser]);

  // Sync active project id to User-Scoped LocalStorage
  useEffect(() => {
    if (activeProject?.id && currentUser?.id) {
      try {
        const lastKey = getUserLastActiveKey(currentUser.id);
        localStorage.setItem(lastKey, activeProject.id);
      } catch (e) {}
    }
  }, [activeProject, currentUser]);

  // Keep activeProject synchronized with projects array
  useEffect(() => {
    if (projects.length === 0) {
      setActiveProject(null);
    } else if (!activeProject || !projects.some((p) => p.id === activeProject.id)) {
      const lastKey = getUserLastActiveKey(currentUser?.id);
      const lastId = localStorage.getItem(lastKey);
      const matched = lastId ? projects.find((p) => p.id === lastId) : null;
      setActiveProject(matched || projects[0]);
    }
  }, [projects, currentUser]);

  // Check Supabase session on load and fetch user projects
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setCurrentUser(session.user);
          try {
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session.user));
          } catch (e) {}
          await loadUserProjects(session.user.id);
        } else {
          // If Supabase session is not yet detected, check if we have a persisted user session
          const savedUser = localStorage.getItem(USER_SESSION_KEY);
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              if (parsed?.id) {
                setCurrentUser(parsed);
                await loadUserProjects(parsed.id);
              }
            } catch (e) {}
          } else {
            // Unauthenticated visitor -> isolated empty projects
            setProjects([]);
            setActiveProject(null);
          }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const user = session?.user || null;
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
        } catch (e) {}
        await loadUserProjects(user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProjects([]);
        setActiveProject(null);
        try {
          localStorage.removeItem(USER_SESSION_KEY);
          localStorage.removeItem('seo_gps_supabase_auth_token');
        } catch (e) {}
      }
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch projects from Supabase database (Strictly isolated by user_id and Postgres RLS)
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

      if (data) {
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

        const lastKey = getUserLastActiveKey(userId);
        const lastId = localStorage.getItem(lastKey);
        const matched = lastId ? formatted.find((p) => p.id === lastId) : null;
        setActiveProject(matched || (formatted.length > 0 ? formatted[0] : null));

        // Persist strictly to user-scoped LocalStorage
        try {
          localStorage.setItem(getUserProjectsKey(userId), JSON.stringify(formatted));
        } catch (e) {}
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
          .eq('id', updatedProject.id)
          .eq('user_id', currentUser.id);

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
        await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', currentUser.id);
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
            maxPages: 5000,
            targetYear: 2027,
            locale: isAr ? 'ar' : 'en',
          }),
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch (e) {}

      // Try Supabase Server-side Edge Crawler (Zero CORS)
      if ((!result || !result.success) && supabase) {
        try {
          const { data, error } = await supabase.functions.invoke('quick-audit', {
            body: {
              rootUrl: activeProject.root_url || `https://${activeProject.domain}/`,
              sitemapUrl: activeProject.sitemap_url || undefined,
              maxPages: 5000,
              targetYear: 2027,
              locale: isAr ? 'ar' : 'en',
            },
          });
          if (!error && data?.success) {
            result = data;
          }
        } catch (_) {}

        if (!result || !result.success) {
          try {
            const { data, error } = await supabase.functions.invoke('send-audit-report', {
              body: {
                type: 'crawl_site',
                rootUrl: activeProject.root_url || `https://${activeProject.domain}/`,
                sitemapUrl: activeProject.sitemap_url || undefined,
                maxPages: 5000,
                targetYear: 2027,
                locale: isAr ? 'ar' : 'en',
              },
            });
            if (!error && data?.success) {
              result = data;
            }
          } catch (_) {}
        }
      }

      if (!result || !result.success) {
        result = await executeSiteCrawl({
          rootUrl: activeProject.root_url || `https://${activeProject.domain}/`,
          sitemapUrl: activeProject.sitemap_url || undefined,
          maxPages: 5000,
          targetYear: 2027,
          locale: isAr ? 'ar' : 'en',
        });
      }

      if (result && result.summary) {
        const score = result.summary.health_score ?? 81;
        const nowIso = new Date().toISOString();

        const updatedProj: ProjectData = {
          ...activeProject,
          last_run_at: nowIso,
          health_score: score,
        };

        safeSetStorageItem(`seo_gps_report_${activeProject.id}`, result.siteReport);
        safeSetStorageItem(`seo_gps_pages_${activeProject.id}`, result.pages);
        safeSetStorageItem(`seo_gps_issues_${activeProject.id}`, result.issues);

        // Create and persist historical snapshot
        try {
          await createAndSaveSnapshot(
            activeProject.id,
            activeProject.domain,
            score,
            result.summary.total_crawled ?? (result.pages?.length || 0),
            result.summary.critical_count ?? 0,
            result.summary.warning_count ?? 0,
            result.summary.notice_count ?? 0,
            result.summary
          );
        } catch (snapErr) {
          console.warn('Could not record snapshot:', snapErr);
        }

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
    setProjects([]);
    setActiveProject(null);
    try {
      localStorage.removeItem(USER_SESSION_KEY);
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasTimeoutError = parsed.some(
              (i: any) => i.checkId === 'connection_timeout' || (i.url && i.url.startsWith('/https:'))
            );
            if (!hasTimeoutError) {
              return parsed.map((i: any) => ({
                ...i,
                url: (i.url || '').replace(/^\/+(https?:\/\/)/i, '$1'),
              }));
            }
          }
        } catch (e) {}
      }
      if (!activeProject.last_run_at) {
        return [];
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasTimeoutError = parsed.some(
            (i: any) => i.checkId === 'connection_timeout' || (i.url && i.url.startsWith('/https:'))
          );
          if (!hasTimeoutError) {
            return parsed.map((i: any) => ({
              ...i,
              url: (i.url || '').replace(/^\/+(https?:\/\/)/i, '$1'),
            }));
          }
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
      if (!activeProject.last_run_at) {
        return [];
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return [];
  };

  const getProjectRuns = () => {
    if (!activeProject?.id) return [];
    return getProjectSnapshots(activeProject.id, activeProject.domain);
  };

  const getIssuesSummary = () => {
    if (!activeProject?.last_run_at) {
      return {
        critical: 0,
        warning: 0,
        notice: 0,
        resolved: 0,
        pages: 0,
      };
    }
    const issues = getProjectIssues();
    const resolvedList = activeProject?.id ? getResolvedIssues(activeProject.id) : [];
    const pages = getProjectPages();
    return {
      critical: issues.filter((i: any) => i.severity === 'critical' && i.status !== 'resolved').length,
      warning: issues.filter((i: any) => i.severity === 'warning' && i.status !== 'resolved').length,
      notice: issues.filter((i: any) => i.severity === 'notice' && i.status !== 'resolved').length,
      resolved: resolvedList.length,
      pages: pages.length,
    };
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
            issuesSummary={getIssuesSummary()}
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
        return (
          <IssuesPage
            issues={getProjectIssues()}
            projectId={activeProject?.id || 'default-project'}
            onRecheckIssue={() => {
              if (activeProject) {
                setActiveProject({ ...activeProject });
              }
            }}
          />
        );
      case 'ai_advisor':
        return (
          <AiAdvisorPage
            activeProject={activeProject}
            issues={getProjectIssues()}
          />
        );
      case 'pages':
        return <PagesExplorerPage pages={getProjectPages()} />;
      case 'history':
        return (
          <HistoryPage
            runs={getProjectRuns()}
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
        onOpenAiAdvisor={() => setCurrentTab('ai_advisor')}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeProjectName={activeProject?.name}
        isAuthLoading={isAuthLoading}
      />

      {/* Main Layout: Sidebar + Page Container */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
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

      {/* Mandatory Pre-Audit Registration Gate */}
      <AccessGateModal
        isOpen={isAccessGateOpen && !currentUser}
        onSuccess={handleAccessGateSuccess}
      />

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
          } catch (e) {}

          // If there is an unsaved guest project created before login, claim it under user.id
          if (activeProject && activeProject.id.startsWith('proj-') && activeProject.domain !== 'example.com') {
            try {
              const { data: inserted } = await supabase
                .from('projects')
                .insert({
                  user_id: user.id,
                  name: activeProject.name,
                  domain: activeProject.domain,
                  root_url: activeProject.root_url,
                  sitemap_url: activeProject.sitemap_url || null,
                  daily_crawl_hour: activeProject.daily_crawl_hour ?? 6,
                  timezone: activeProject.timezone || 'UTC',
                })
                .select()
                .single();
              if (inserted) {
                activeProject.id = inserted.id;
              }
            } catch (err) {
              console.warn('Could not claim guest project on login:', err);
            }
          }
          await loadUserProjects(user.id);
        }}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={handleProjectAdded}
        currentUser={currentUser}
        onRequireAuth={() => setIsAuthOpen(true)}
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

      {/* Proactive AI SEO Assistant */}
      <ProactiveAiAssistant
        activeProject={activeProject}
        issues={getProjectIssues()}
        onOpenAdvisor={() => setCurrentTab('ai_advisor')}
        onOpenIssues={() => setCurrentTab('issues')}
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
