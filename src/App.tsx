import React, { useState, useEffect } from 'react';
import { DashboardView } from './components/DashboardView';
import { DmLogsView } from './components/DmLogsView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManualLogModal } from './components/ManualLogModal';
import { FloatingInstagramWidget } from './components/FloatingInstagramWidget';
import { INITIAL_PROJECTS, INITIAL_DM_LOGS } from './mockData';
import { Project, DmLog, DmStatus, WidgetSettings } from './types';

export type ActiveTab = 'dashboard' | 'logs';

const STORAGE_PROJECTS_KEY = 'instalog_projects_v2';
const STORAGE_LOGS_KEY = 'instalog_dm_logs_v2';
const STORAGE_WIDGET_KEY = 'instalog_widget_settings_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | DmStatus>('all');

  // Projects state with LocalStorage persistence
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PROJECTS;
  });

  // Logs state with LocalStorage persistence
  const [logs, setLogs] = useState<DmLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DM_LOGS;
  });

  // Widget settings
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WIDGET_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      isRecording: true,
      selectedProjectId: 'proj_1',
      pairingAccount: '@beauty_commerce_kr',
      latencyMs: 84,
      port: '9224',
      todayLogsCount: 142,
      lastPing: '방금 전 (12:34:28)',
    };
  });

  // Modals & Floating toast
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [lastToastNotification, setLastToastNotification] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error(e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WIDGET_KEY, JSON.stringify(widgetSettings));
    } catch (e) {
      console.error(e);
    }
  }, [widgetSettings]);

  // Project handlers
  const handleCreateProject = (
    newProjectData: Omit<Project, 'id' | 'totalSent' | 'repliedCount' | 'confirmedCount' | 'createdAt'>
  ) => {
    const newProj: Project = {
      ...newProjectData,
      id: `proj_${Date.now()}`,
      totalSent: 0,
      repliedCount: 0,
      confirmedCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setProjects((prev) => [newProj, ...prev]);
    setWidgetSettings((prev) => ({ ...prev, selectedProjectId: newProj.id }));
    showToast(`새 프로젝트 '${newProj.name}'이(가) 등록되었습니다.`);
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Log handlers
  const handleUpdateLog = (updated: DmLog) => {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleDeleteLog = (logId: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const handleAddManualLog = (newLog: DmLog) => {
    setLogs((prev) => [newLog, ...prev]);
    // increment project sent count
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === newLog.projectId) {
          return {
            ...p,
            totalSent: p.totalSent + 1,
            repliedCount: newLog.status !== 'waiting' ? p.repliedCount + 1 : p.repliedCount,
            confirmedCount: newLog.status === 'confirmed' ? p.confirmedCount + 1 : p.confirmedCount,
            latestLog: {
              handle: `@${newLog.influencer.handle}`,
              action: '수기 등록',
              timeAgo: '방금',
            },
          };
        }
        return p;
      })
    );
    showToast(`@${newLog.influencer.handle}님 수기 로그가 성공적으로 저장되었습니다.`);
  };

  // Widget Toggle & Simulation
  const handleToggleRecording = () => {
    setWidgetSettings((prev) => {
      const nextState = !prev.isRecording;
      showToast(nextState ? '🟢 위젯 자동 기록이 활성화되었습니다.' : '⏸ 위젯 자동 기록이 일시 정지되었습니다.');
      return {
        ...prev,
        isRecording: nextState,
      };
    });
  };

  const handleSimulateSendDm = (rawHandle: string, targetProjectId: string) => {
    const handle = rawHandle.replace(/^@/, '').trim();
    if (!handle) return;

    if (!widgetSettings.isRecording) {
      showToast('⚠️ 위젯이 일시 정지 상태입니다. [자동 기록 시작] 버튼을 먼저 눌러주세요.');
      return;
    }

    const targetProject = projects.find((p) => p.id === targetProjectId) || projects[0];

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Sample avatars for realism
    const sampleAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];

    const newLog: DmLog = {
      id: `live_${Date.now()}`,
      projectId: targetProject.id,
      projectName: targetProject.name,
      timestamp: timestampStr,
      timeAgo: '방금',
      influencer: {
        handle,
        profileUrl: `https://instagram.com/${handle}`,
        avatarUrl: randomAvatar,
        followers: `${(Math.random() * 80 + 10).toFixed(1)}K`,
        verified: Math.random() > 0.4,
      },
      status: 'waiting',
      channel: 'none',
      secondMessageSent: false,
      memo: '인스타 웹 플로팅 위젯 실시간 자동 감지',
    };

    setLogs((prev) => [newLog, ...prev]);

    // Update project stats
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === targetProject.id) {
          return {
            ...p,
            totalSent: p.totalSent + 1,
            latestLog: {
              handle: `@${handle}`,
              action: '제안 발송',
              timeAgo: '방금',
            },
          };
        }
        return p;
      })
    );

    // Update widget counter
    setWidgetSettings((prev) => ({
      ...prev,
      todayLogsCount: prev.todayLogsCount + 1,
      lastPing: `방금 전 (${now.toTimeString().slice(0, 8)})`,
    }));

    // PRD 간이 알림: 기록 성공 시 안내
    showToast(`@${handle}님에게 제안 발송 감지! '${targetProject.name}' 발송 횟수 +1 (누적: ${targetProject.totalSent + 1}건)`);
  };

  const showToast = (message: string) => {
    setLastToastNotification(message);
    setTimeout(() => {
      setLastToastNotification((current) => (current === message ? null : current));
    }, 4500);
  };

  const handleRefresh = () => {
    showToast('최신 인스타그램 웹 소켓 패킷 데이터를 갱신했습니다.');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#111827]">
      {/* Main Content Stage */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-24">
        {selectedProjectId && selectedProject ? (
          /* Project Detail View */
          <ProjectDetailView
            project={selectedProject}
            logs={logs}
            onBack={() => setSelectedProjectId(null)}
            onUpdateProject={handleUpdateProject}
            onUpdateLog={handleUpdateLog}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            onOpenSimulator={() => {
              setWidgetSettings((prev) => ({ ...prev, selectedProjectId: selectedProject.id }));
              showToast(`'${selectedProject.name}' 위젯 연동 상태로 준비되었습니다.`);
            }}
          />
        ) : activeTab === 'dashboard' ? (
          /* Dashboard View (Image 1) */
          <DashboardView
            projects={projects}
            logs={logs}
            isWidgetRecording={widgetSettings.isRecording}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenSimulator={() => {
              showToast('우측 하단 인스타그램 웹 플로팅 위젯에서 실시간 테스트가 가능합니다.');
            }}
            onNavigateToLogs={(status) => {
              if (status) setLogStatusFilter(status);
              setActiveTab('logs');
            }}
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
            onRefresh={handleRefresh}
            onBack={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Realtime Instagram Floating Widget Overlay (PRD Requirement 2) */}
      <FloatingInstagramWidget
        projects={projects}
        selectedProjectId={widgetSettings.selectedProjectId}
        onSelectProject={(id) => setWidgetSettings((prev) => ({ ...prev, selectedProjectId: id }))}
        isRecording={widgetSettings.isRecording}
        onToggleRecording={handleToggleRecording}
        onSimulateSendDm={handleSimulateSendDm}
        lastToastNotification={lastToastNotification}
        onDismissToast={() => setLastToastNotification(null)}
      />

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
        onClose={() => setIsManualModalOpen(false)}
        onAddLog={handleAddManualLog}
      />
    </div>
  );
}
