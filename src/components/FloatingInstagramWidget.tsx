import React, { useState } from 'react';
import { 
  Instagram, 
  Play, 
  Pause, 
  Send, 
  Sparkles, 
  X, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers,
  Radio,
  Download,
  Chrome
} from 'lucide-react';
import { Project, DmLog } from '../types';

interface FloatingInstagramWidgetProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onSimulateSendDm: (handle: string, projectId: string) => void;
  lastToastNotification: string | null;
  onDismissToast: () => void;
}

export const FloatingInstagramWidget: React.FC<FloatingInstagramWidgetProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  isRecording,
  onToggleRecording,
  onSimulateSendDm,
  lastToastNotification,
  onDismissToast,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 select-none">
      {/* Toast Alert Notification (PRD: 간이 알림 - 기록 성공 시 안내) */}
      {lastToastNotification && (
        <div 
          className="max-w-sm bg-emerald-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-emerald-500/50 backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-[#00c73c]" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-emerald-300 text-[11px] tracking-wide">실시간 자동 수집 완료</p>
            <p className="text-white font-medium mt-0.5 leading-snug">{lastToastNotification}</p>
          </div>
          <button 
            onClick={onDismissToast}
            className="text-emerald-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Widget Box */}
      {isMinimized ? (
        /* Minimized floating pill */
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-[#111827] text-white rounded-full shadow-2xl border border-slate-700 hover:border-emerald-400 transition-all group cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#00c73c] flex items-center justify-center">
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="relative flex h-2 w-2">
              {isRecording && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecording ? 'bg-[#00c73c]' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-200">{currentProject?.name?.slice(0, 12)}...</span>
          </div>
          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
        </button>
      ) : (
        /* Full Floating Widget Window */
        <div className="w-[330px] bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Widget Header */}
          <div className="bg-[#111827] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00c73c] flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight">InstaLog 위젯</span>
                  {isRecording ? (
                    <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold tracking-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      연결됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold tracking-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      연결 대기
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="위젯 최소화"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3.5 text-xs">
            {/* 2. Target Project Dropdown (PRD: 프로젝트 선택 드롭다운) */}
            <div className="flex flex-col gap-2">
              <select
                id="widget-project-select"
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#00c73c] cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 1. Status indicator & Controller (PRD: 기록 상태 표시등 & 작동 컨트롤러) */}
            <div className="p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isRecording && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRecording ? 'bg-[#00c73c]' : 'bg-rose-500'}`}></span>
                </span>
                <div>
                  <p className={`text-xs font-black ${isRecording ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isRecording ? '자동 기록 중 (Active)' : '일시 정지됨 (Paused)'}
                  </p>
                </div>
              </div>

              {/* Controller Button */}
              <button
                id="widget-toggle-recording-btn"
                onClick={onToggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
                  isRecording
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-[#00c73c] text-white hover:bg-[#00b035]'
                }`}
              >
                {isRecording ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>일시 정지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>자동 기록 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* Chrome Extension Install Button */}
            <button
              className="w-full flex items-center justify-center gap-2 py-3.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Chrome className="w-3.5 h-3.5" />
              <span>Chrome 확장 프로그램 설치</span>
              <Download className="w-3 h-3 opacity-70 ml-1" />
            </button>

            {/* Quick Helper Note */}
            <p className="text-[10px] text-slate-400 text-center leading-tight">
              실제 instagram.com 웹페이지 접속 시 화면 측면에 자동 상주합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
