import React, { useState } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { Header } from './components/Header';
import { Sidebar, Project } from './components/Sidebar';
import { HelpDrawer } from './components/HelpDrawer';
import { AddProjectModal } from './components/AddProjectModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { IssuesPage } from './pages/IssuesPage';
import { PagesExplorerPage } from './pages/PagesExplorerPage';
import { GenericCheckPage } from './pages/GenericCheckPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

const initialProjects: Project[] = [
  { id: 'p-1', name: 'Example Store', domain: 'example.com' },
];

export const AppContent: React.FC = () => {
  const { dir } = useI18n();
  const [currentTab, setCurrentTab] = useState('overview');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = useState<Project>(initialProjects[0]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  const handleProjectAdded = (newProj: Project) => {
    setProjects([...projects, newProj]);
    setActiveProject(newProj);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <DashboardPage
            onNavigateToIssues={() => setCurrentTab('issues')}
            onOpenAddProject={() => setIsAddProjectOpen(true)}
          />
        );
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
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigateToIssues={() => setCurrentTab('issues')} onOpenAddProject={() => setIsAddProjectOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans selection:bg-gold-tint selection:text-gold-hover" dir={dir}>
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        activeProjectName={activeProject.name}
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
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Slide-in Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={handleProjectAdded}
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
