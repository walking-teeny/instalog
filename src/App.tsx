import React, { useState, useEffect } from 'react';
import { Instagram, Settings } from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { DmLogsView } from './components/DmLogsView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManualLogModal } from './components/ManualLogModal';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { api, getToken, getUsername, clearToken, clearUsername } from './api';
import { Project, DmLog, DmStatus, WidgetSettings } from './types';
import { parseRoute, pushRoute, Route } from './router';

export type ActiveTab = 'dashboard' | 'logs';

const nowTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

export default function App() {
  const [isAuthed, setIsAuthed] = useState(!!getToken());
  const [isLoadingData, setIsLoadingData] = useState(true);

  const initialRoute = parseRoute();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialRoute.view === 'logs' ? 'logs' : 'dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialRoute.view === 'project' ? initialRoute.projectId : null
  );
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | DmStatus>(
    initialRoute.view === 'logs' ? initialRoute.status : 'all'
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);

  // Modals & Floating toast
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [lastToastNotification, setLastToastNotification] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  // Force back to the login screen whenever the API rejects the stored token.
  useEffect(() => {
    const handleUnauthorized = () => setIsAuthed(false);
    window.addEventListener('instalog:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('instalog:unauthorized', handleUnauthorized);
  }, []);

  // Keep the on-screen view in sync with the URL for browser back/forward navigation.
  useEffect(() => {
    const applyRoute = (route: Route) => {
      if (route.view === 'project') {
        setSelectedProjectId(route.projectId);
      } else if (route.view === 'logs') {
        setSelectedProjectId(null);
        setActiveTab('logs');
        setLogStatusFilter(route.status);
      } else {
        setSelectedProjectId(null);
        setActiveTab('dashboard');
      }
    };
    const handlePopState = () => applyRoute(parseRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToDashboard = () => {
    setSelectedProjectId(null);
    setActiveTab('dashboard');
    pushRoute({ view: 'dashboard' });
  };

  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    pushRoute({ view: 'project', projectId: id });
  };

  const navigateToLogs = (status: 'all' | DmStatus = 'all') => {
    setSelectedProjectId(null);
    setActiveTab('logs');
    setLogStatusFilter(status);
    pushRoute({ view: 'logs', status });
  };

  // Load all data from the server once logged in.
  useEffect(() => {
    if (!isAuthed) return;
    setIsLoadingData(true);
    Promise.all([api.getProjects(), api.getLogs(), api.getWidgetSettings()])
      .then(([p, l, w]) => {
        setProjects(p);
        setLogs(l);
        setWidgetSettings(w);
      })
      .catch((e) => console.error('데이터를 불러오지 못했습니다.', e))
      .finally(() => setIsLoadingData(false));
  }, [isAuthed]);

  // Poll the recording state so the header badge tracks the Chrome extension's toggle.
  useEffect(() => {
    if (!isAuthed) return;
    const interval = setInterval(() => {
      api.getWidgetSettings().then(setWidgetSettings).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthed]);

  // Poll projects/logs so DMs the Chrome extension records show up without a manual refresh.
  useEffect(() => {
    if (!isAuthed) return;
    const interval = setInterval(() => {
      Promise.all([api.getProjects(), api.getLogs()])
        .then(([p, l]) => {
          setProjects(p);
          setLogs(l);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthed]);

  // Project handlers
  const handleCreateProject = (
    newProjectData: Omit<Project, 'id' | 'totalSent' | 'repliedCount' | 'confirmedCount' | 'createdAt' | 'updatedAt'>
  ) => {
    const newProj: Project = {
      ...newProjectData,
      id: `proj_${Date.now()}`,
      totalSent: 0,
      repliedCount: 0,
      confirmedCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: nowTimestamp(),
    };
    setProjects((prev) => [newProj, ...prev]);
    api.createProject(newProj).catch(console.error);

    if (widgetSettings) {
      const updatedWidget = { ...widgetSettings, selectedProjectId: newProj.id };
      setWidgetSettings(updatedWidget);
      api.updateWidgetSettings(updatedWidget).catch(console.error);
    }
    showToast(`새 프로젝트 '${newProj.name}'이(가) 등록되었습니다.`);
  };

  const handleUpdateProject = (updated: Project) => {
    const withTimestamp = { ...updated, updatedAt: nowTimestamp() };
    setProjects((prev) => prev.map((p) => (p.id === withTimestamp.id ? withTimestamp : p)));
    api.updateProject(withTimestamp).catch(console.error);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setLogs((prev) => prev.filter((l) => l.projectId !== projectId));
    navigateToDashboard();
    api.deleteProject(projectId).catch(console.error);
  };

  // Log handlers
  const bumpProjectUpdatedAt = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const updated = { ...project, updatedAt: nowTimestamp() };
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    api.updateProject(updated).catch(console.error);
  };

  const handleUpdateLog = (updated: DmLog) => {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    api.updateLog(updated).catch(console.error);
    bumpProjectUpdatedAt(updated.projectId);
  };

  const handleDeleteLog = (logId: string) => {
    const target = logs.find((l) => l.id === logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    api.deleteLog(logId).catch(console.error);
    if (target) bumpProjectUpdatedAt(target.projectId);
  };

  const handleAddManualLog = (newLog: DmLog) => {
    setLogs((prev) => [newLog, ...prev]);
    api.createLog(newLog).catch(console.error);

    const project = projects.find((p) => p.id === newLog.projectId);
    if (project) {
      const updatedProject: Project = {
        ...project,
        totalSent: project.totalSent + 1,
        repliedCount:
          newLog.status !== 'waiting' && newLog.status !== '' ? project.repliedCount + 1 : project.repliedCount,
        confirmedCount: newLog.status === 'confirmed' ? project.confirmedCount + 1 : project.confirmedCount,
        latestLog: {
          handle: `@${newLog.influencer.handle}`,
          action: '수기 등록',
          timeAgo: '방금',
        },
        updatedAt: nowTimestamp(),
      };
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
      api.updateProject(updatedProject).catch(console.error);
    }
    showToast(`@${newLog.influencer.handle}님 수기 로그가 성공적으로 저장되었습니다.`);
  };

  const showToast = (message: string, variant: 'success' | 'danger' = 'success') => {
    setToastVariant(variant);
    setLastToastNotification(message);
    setTimeout(() => {
      setLastToastNotification((current) => (current === message ? null : current));
    }, 3000);
  };

  const handleLogout = () => {
    clearToken();
    clearUsername();
    setIsSettingsModalOpen(false);
    setIsAuthed(false);
  };

  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
    if (widgetSettings && !widgetSettings.hasOpenedSettings) {
      const updated = { ...widgetSettings, hasOpenedSettings: true };
      setWidgetSettings(updated);
      api.updateWidgetSettings(updated).catch(console.error);
    }
  };

  if (!isAuthed) {
    return <LoginView onLoginSuccess={() => setIsAuthed(true)} />;
  }

  if (isLoadingData || !widgetSettings) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-400 text-sm font-medium">
        불러오는 중...
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-[#111827]">
      {/* App Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00c73c] flex items-center justify-center">
            <Instagram className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-[#111827] tracking-tight">InstaLog</span>
          {widgetSettings.isRecording ? (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              기록 중
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              기록 정지
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={handleOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          {!isSettingsModalOpen && !widgetSettings.hasOpenedSettings && (
            <div className="absolute top-full right-0 mt-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-medium shadow-lg z-10">
              <div className="absolute -top-1 right-3.5 w-2 h-2 bg-slate-800 rotate-45" />
              인스타그램과 연동하세요
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
      {/* Main Content Stage */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-24">
        {selectedProjectId && selectedProject ? (
          /* Project Detail View */
          <ProjectDetailView
            project={selectedProject}
            logs={logs}
            onBack={navigateToDashboard}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onOpenManualModal={() => setIsManualModalOpen(true)}
          />
        ) : activeTab === 'dashboard' ? (
          /* Dashboard View (Image 1) */
          <DashboardView
            projects={projects}
            logs={logs}
            onSelectProject={navigateToProject}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onNavigateToLogs={(status) => navigateToLogs(status || 'all')}
          />
        ) : (
          /* DM Logs View (Image 5) */
          <DmLogsView
            logs={logs}
            projects={projects}
            selectedProjectId={null}
            initialStatusFilter={logStatusFilter}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            onBack={navigateToDashboard}
          />
        )}
      </main>
      </div>

      {/* Toast Notification */}
      {lastToastNotification && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm text-white p-3.5 rounded-2xl shadow-xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-300 border ${
            toastVariant === 'danger'
              ? 'bg-rose-900/95 border-rose-500/50'
              : 'bg-emerald-900/95 border-emerald-500/50'
          }`}
        >
          <p className="flex-1 text-xs font-medium leading-snug">{lastToastNotification}</p>
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <ManualLogModal
        isOpen={isManualModalOpen}
        projects={projects}
        defaultProjectId={selectedProjectId || widgetSettings.selectedProjectId}
        lockedProjectId={selectedProjectId}
        onClose={() => setIsManualModalOpen(false)}
        onAddLog={handleAddManualLog}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        username={getUsername()}
        onClose={() => setIsSettingsModalOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
