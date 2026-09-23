import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  Search,
  Calendar,
  Download,
  Plus,
  Edit2,
  SlidersHorizontal,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { Project, DmLog, DmStatus, ContactChannel, ProjectType } from '../types';
import { DM_STATUS_LABELS, CONTACT_CHANNEL_LABELS, OS_PIPELINE_OPTIONS } from '../constants';
import { StatusFilterBar, computeStatusCounts } from './StatusFilterBar';
import { StatusSelect } from './StatusSelect';

const COL_WIDTHS_STORAGE_KEY = 'instalog_project_log_col_widths_v2';
const DEFAULT_COL_WIDTHS = [110, 200, 110, 120, 70, 81, 280, 40];

const loadColWidths = (): number[] => {
  try {
    const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed) && parsed.length === DEFAULT_COL_WIDTHS.length) {
      return parsed;
    }
  } catch {
    // ignore malformed/inaccessible storage
  }
  return DEFAULT_COL_WIDTHS;
};

// "2026-09-14 14:38:12" -> "26.09.14 14:38"
const formatUpdatedAt = (timestamp: string) => {
  const [datePart, timePart] = timestamp.split(' ');
  return `${datePart.slice(2).replace(/-/g, '.')} ${(timePart || '').slice(0, 5)}`;
};

interface ProjectDetailViewProps {
  project: Project;
  logs: DmLog[];
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateLog: (updatedLog: DmLog) => void;
  onDeleteLog?: (logId: string) => void;
  onOpenManualModal: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  logs,
  onBack,
  onUpdateProject,
  onDeleteProject,
  onUpdateLog,
  onDeleteLog,
  onOpenManualModal,
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'page' | 'all' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DmStatus>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | ContactChannel>('all');
  const [secondMessageFilter, setSecondMessageFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [updatedAtSort, setUpdatedAtSort] = useState<'asc' | 'desc'>('desc');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState(project.description || '');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Resizable table columns (persisted so user-adjusted widths survive reloads)
  const [colWidths, setColWidths] = useState<number[]>(loadColWidths);
  const resizing = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(colWidths));
    } catch {
      // ignore inaccessible storage (e.g. private browsing)
    }
  }, [colWidths]);

  const handleResizeStart = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = { index, startX: e.clientX, startWidth: colWidths[index] };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizing.current) return;
      const { index: i, startX, startWidth } = resizing.current;
      const newWidth = Math.max(40, startWidth + (moveEvent.clientX - startX));
      setColWidths((prev) => {
        const next = [...prev];
        next[i] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Project-specific logs
  const projectLogs = useMemo(() => {
    return logs.filter((l) => l.projectId === project.id);
  }, [logs, project.id]);

  const statusCounts = useMemo(() => computeStatusCounts(projectLogs), [projectLogs]);

  // 로그에 실제로 찍혀있는 담당자만 후보로 — 삭제된 프로필도 예전 로그에 남아있으면 계속 필터할 수 있다.
  const profileOptions = useMemo(
    () => Array.from(new Set(projectLogs.map((l) => l.profileName).filter((p): p is string => !!p))).sort(),
    [projectLogs]
  );

  const filteredLogs = useMemo(() => {
    let result = [...projectLogs];

    if (statusFilter !== 'all') {
      result = result.filter((l) =>
        statusFilter === 'waiting' ? l.status === 'waiting' || l.status === '' : l.status === statusFilter
      );
    }

    if (profileFilter !== 'all') {
      result = result.filter((l) => l.profileName === profileFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.influencer.handle.toLowerCase().includes(q) ||
          l.influencer.nickname.toLowerCase().includes(q) ||
          l.memo.toLowerCase().includes(q)
      );
    }

    if (channelFilter !== 'all') {
      result = result.filter((l) => l.channel === channelFilter);
    }

    if (secondMessageFilter !== 'all') {
      result = result.filter((l) =>
        secondMessageFilter === 'sent' ? l.secondMessageSent : !l.secondMessageSent
      );
    }

    if (dateFrom) {
      result = result.filter((l) => l.timestamp.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((l) => l.timestamp.slice(0, 10) <= dateTo);
    }

    return result;
  }, [projectLogs, statusFilter, profileFilter, searchTerm, channelFilter, secondMessageFilter, dateFrom, dateTo]);

  const sortedLogs = useMemo(() => {
    const result = [...filteredLogs];
    result.sort((a, b) =>
      updatedAtSort === 'asc'
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp)
    );
    return result;
  }, [filteredLogs, updatedAtSort]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(start, start + itemsPerPage);
  }, [sortedLogs, currentPage, itemsPerPage]);

  const handleSaveProjectInfo = () => {
    if (!editName.trim()) return;
    onUpdateProject({
      ...project,
      name: editName.trim(),
    });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    onUpdateProject({
      ...project,
      description: editDescription.trim(),
    });
    setIsEditingDescription(false);
  };

  const exportProjectExcel = (scope: 'page' | 'all') => {
    const targetLogs = scope === 'page' ? paginatedLogs : projectLogs;
    const headers = [
      '최근 업데이트 일시',
      '팔로워수',
      '계정 ID',
      '계정 닉네임',
      '계정 링크',
      '소통 상태',
      '기타 소통 수단',
      '2차 발송 여부',
      '담당자',
      '메모',
    ];

    const rows = targetLogs.map((log) => [
      log.timestamp,
      log.influencer.followers,
      `@${log.influencer.handle}`,
      log.influencer.nickname || '',
      log.influencer.profileUrl,
      DM_STATUS_LABELS[log.status],
      CONTACT_CHANNEL_LABELS[log.channel],
      log.secondMessageSent ? '발송 완료' : '미발송',
      log.profileName || '',
      log.memo || '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DM 리스트');
    XLSX.writeFile(workbook, `${project.name}_DM리스트_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>대시보드로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-700 text-xs font-semibold hover:text-emerald-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>직접 추가</span>
          </button>
          <button
            onClick={() => {
              setExportScope(null);
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>데이터 다운로드</span>
          </button>
          {onDeleteProject && (
            <button
              onClick={() => setIsDeleteProjectModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-all cursor-pointer"
              title="프로젝트 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Project Banner & Quick Editor */}
      <div className="space-y-6" style={{ marginBottom: '16px' }}>
        <div className="space-y-1.5">
            <div className="flex items-center gap-0.5">
              {/* Quick status switch */}
              <div className="relative flex items-center gap-2 bg-slate-50 py-2 pr-2 rounded-2xl shrink-0">
                <select
                  value={project.status === 'active' || project.status === 'waiting' ? 'active' : 'completed'}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'active' | 'completed';
                    onUpdateProject({
                      ...project,
                      status: newStatus,
                      statusText: newStatus === 'active' ? '진행 중' : '종료',
                    });
                  }}
                  className={`appearance-none text-xs font-bold rounded-xl pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer border ${
                    project.status === 'active' || project.status === 'waiting'
                      ? 'bg-emerald-50 text-[#006e1d] border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <option value="active">진행 중</option>
                  <option value="completed">종료</option>
                </select>
                <ChevronDown
                  className={`w-3.5 h-3.5 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    project.status === 'active' || project.status === 'waiting'
                      ? 'text-[#006e1d]'
                      : 'text-slate-400'
                  }`}
                />
              </div>

              {/* Project type */}
              <div className="relative flex items-center gap-2 bg-slate-50 py-2 pr-2 rounded-2xl shrink-0">
                <select
                  value={project.projectType}
                  onChange={(e) => {
                    onUpdateProject({
                      ...project,
                      projectType: e.target.value as ProjectType,
                    });
                  }}
                  className="appearance-none text-xs font-bold bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="공동구매">공동구매</option>
                  <option value="협찬">협찬</option>
                  <option value="광고">광고</option>
                  <option value="기타">기타</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* 본부 OS 파이프라인 연동 */}
              <div className="relative flex items-center gap-2 bg-slate-50 py-2 pr-2 rounded-2xl shrink-0">
                <select
                  value={project.osPipeline || ''}
                  onChange={(e) => {
                    onUpdateProject({
                      ...project,
                      osPipeline: e.target.value,
                    });
                  }}
                  title="본부 OS의 파이프라인 이름과 정확히 같은 값만 고를 수 있어, 오타로 새 파이프라인이 생기지 않습니다."
                  className="appearance-none text-xs font-bold bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="">본부 OS 미연동</option>
                  {/* 저장된 값이 현재 목록에 없으면(본부 OS에서 이름이 바뀌었거나 없어짐) 빈칸으로
                      숨기지 않고 그대로 보여준다 — 안 그러면 "미연동"으로 착각해 실제로 유효한
                      값을 다른 파이프라인으로 조용히 덮어써버릴 수 있다. */}
                  {project.osPipeline && !OS_PIPELINE_OPTIONS.includes(project.osPipeline) && (
                    <option value={project.osPipeline}>{project.osPipeline} (목록에 없음)</option>
                  )}
                  {OS_PIPELINE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <span className="text-xs text-slate-400">생성일: {project.createdAt}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveProjectInfo}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveProjectInfo();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="flex-1 text-xl font-bold px-3 py-1.5 border border-emerald-400 rounded-xl focus:outline-none"
                  placeholder="프로젝트명"
                  autoFocus
                />
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="text-2xl font-black text-[#111827] tracking-tight cursor-pointer hover:text-emerald-600 transition-colors"
                  title="클릭하여 수정"
                >
                  {project.name}
                </h1>
              )}
            </div>

            {isEditingDescription ? (
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleSaveDescription}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDescription();
                  if (e.key === 'Escape') setIsEditingDescription(false);
                }}
                className="w-full text-xs text-slate-600 leading-relaxed pt-1 px-3 py-1.5 border border-emerald-400 rounded-lg focus:outline-none"
                placeholder="프로젝트 메모 입력"
                autoFocus
              />
            ) : (
              <p
                onClick={() => {
                  setEditDescription(project.description || '');
                  setIsEditingDescription(true);
                }}
                className="text-xs text-slate-500 leading-relaxed pt-1 cursor-pointer hover:text-emerald-600 transition-colors"
                title="클릭하여 수정"
              >
                {project.description || '메모 추가...'}
              </p>
            )}
        </div>

      </div>

      {/* Detail Table Header & Controls */}
      <div className="space-y-4">
        {/* Status Filter Pills */}
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="아이디, 닉네임 또는 메모 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 pl-3 pr-2 py-2 bg-slate-50/70 border border-slate-200 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-[88px] text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            />
            <span className="text-slate-400 text-xs">~</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-[88px] text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                title="기간 초기화"
              >
                ✕
              </button>
            )}
          </div>

          {/* Channel Filter */}
          <div className="relative">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'all' | ContactChannel)}
              className="appearance-none pl-8 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">기타 소통 수단</option>
              <option value="none">없음</option>
              <option value="email">메일</option>
              <option value="inpock">인포크</option>
              <option value="email_inpock">메일+인포크</option>
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Second Message Filter */}
          <div className="relative">
            <select
              value={secondMessageFilter}
              onChange={(e) => setSecondMessageFilter(e.target.value as 'all' | 'sent' | 'not_sent')}
              className="appearance-none pl-8 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">2차 발송</option>
              <option value="sent">발송함</option>
              <option value="not_sent">발송 안 함</option>
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Profile (담당자) Filter */}
          <div className="relative">
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="appearance-none pl-8 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">모든 담당자</option>
              {profileOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Table for this project */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-slate-600 font-semibold">
                {[
                  '최근 업데이트',
                  '인플루언서 계정 정보',
                  '소통 상태',
                  '기타 소통 수단',
                  '2차 발송',
                  '담당자',
                  '메모',
                  '',
                ].map((label, i) => (
                  <th key={i} className="py-3 px-4 relative overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {i === 0 && (
                        <button
                          onClick={() => setUpdatedAtSort((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                          className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="최근 업데이트 정렬"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                    <span
                      onMouseDown={handleResizeStart(i)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-400/50 select-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isEditing = editingMemoId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-700">{formatUpdatedAt(log.timestamp)}</span>
                      </td>

                      <td className="py-3.5 px-4 overflow-hidden">
                        <a
                          href={log.influencer.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-slate-800 hover:text-emerald-600 transition-colors font-mono truncate block min-w-0"
                        >
                          @{log.influencer.handle}
                        </a>
                        <p className="text-[13.2px] text-slate-500 font-medium mt-1 truncate">{log.influencer.nickname || log.influencer.handle}</p>
                        <p className="text-[12px] text-slate-400 font-mono mt-1 truncate">
                          팔로워 {log.influencer.followers}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusSelect
                          status={log.status}
                          onChange={(status) => onUpdateLog({ ...log, status })}
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <select
                            value={log.channel}
                            onChange={(e) => {
                              onUpdateLog({
                                ...log,
                                channel: e.target.value as ContactChannel,
                              });
                            }}
                            className="w-full appearance-none text-xs text-slate-700 rounded-lg pl-0 pr-4 py-1 cursor-pointer focus:outline-none font-medium"
                          >
                            <option value="none">없음</option>
                            <option value="email">메일</option>
                            <option value="inpock">인포크</option>
                            <option value="email_inpock">메일+인포크</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={log.secondMessageSent}
                          onChange={(e) => {
                            onUpdateLog({
                              ...log,
                              secondMessageSent: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-[#00c73c]"
                        />
                      </td>

                      {/* 담당자 */}
                      <td className="py-3.5 px-4">
                        {log.profileName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] truncate max-w-full">
                            {log.profileName}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempMemo}
                              onChange={(e) => setTempMemo(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-emerald-400 rounded-md focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdateLog({ ...log, memo: tempMemo });
                                  setEditingMemoId(null);
                                }
                                if (e.key === 'Escape') setEditingMemoId(null);
                              }}
                            />
                            <button
                              onClick={() => {
                                onUpdateLog({ ...log, memo: tempMemo });
                                setEditingMemoId(null);
                              }}
                              className="px-2 py-1 bg-emerald-500 text-white rounded text-[13.2px] font-bold"
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingMemoId(log.id);
                              setTempMemo(log.memo);
                            }}
                            className="group flex items-center justify-between cursor-pointer py-1 pl-0 pr-1.5 rounded hover:bg-slate-100"
                          >
                            <span className={`line-clamp-1 ${log.memo ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                              {log.memo || '메모 추가...'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-2">
                        {onDeleteLog && (
                          <button
                            onClick={() => setDeleteTargetId(log.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            title="로그 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-50/80 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="relative flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-slate-200 rounded pl-2 pr-6 py-1 font-medium focus:outline-none cursor-pointer"
            >
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={500}>500개</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              if (
                totalPages > 6 &&
                pageNum !== 1 &&
                pageNum !== totalPages &&
                Math.abs(pageNum - currentPage) > 1
              ) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-md font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#00c73c] text-white shadow-sm'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827]">정말 삭제하시겠습니까?</h3>
            <p className="text-xs text-slate-500">삭제한 데이터는 복구할 수 없습니다.</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDeleteLog?.(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Scope Selection */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827]">다운로드할 데이터를 선택해 주세요</h3>
            <div className="space-y-2">
              <button
                onClick={() => setExportScope('page')}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                  exportScope === 'page'
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-xs font-bold text-[#111827]">현재 페이지에 표시되는 데이터만</p>
                <p className="text-[13.2px] text-slate-400 mt-0.5">선택한 페이지 및 적용된 필터의 결과만 다운로드합니다.</p>
              </button>
              <button
                onClick={() => setExportScope('all')}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-xs font-bold text-[#111827]">이 프로젝트의 모든 데이터</p>
                <p className="text-[13.2px] text-slate-400 mt-0.5">이 프로젝트의 모든 데이터를 다운로드합니다.</p>
              </button>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (exportScope) exportProjectExcel(exportScope);
                }}
                disabled={!exportScope}
                className="px-4 py-2 rounded-xl bg-[#00c73c] hover:bg-[#00b035] disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation */}
      {isDeleteProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDeleteProjectModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827]">정말 삭제하시겠습니까?</h3>
            <p className="text-xs text-slate-500">삭제한 데이터는 복구할 수 없습니다.</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteProjectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDeleteProject?.(project.id);
                  setIsDeleteProjectModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
