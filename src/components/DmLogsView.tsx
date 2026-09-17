import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search,
  Download,
  Filter, 
  Calendar,
  Edit2,
  Plus, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  SlidersHorizontal,
  Trash2,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { DmLog, Project, DmStatus, ContactChannel } from '../types';

const COL_WIDTHS_STORAGE_KEY = 'instalog_dm_log_col_widths';
const DEFAULT_COL_WIDTHS = [138, 200, 180, 120, 120, 82, 240, 40];

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

interface DmLogsViewProps {
  logs: DmLog[];
  projects: Project[];
  selectedProjectId?: string | null;
  initialStatusFilter?: 'all' | DmStatus;
  onUpdateLog: (updatedLog: DmLog) => void;
  onDeleteLog?: (logId: string) => void;
  onOpenManualModal: () => void;
  onBack?: () => void;
}

export const DmLogsView: React.FC<DmLogsViewProps> = ({
  logs,
  projects,
  selectedProjectId,
  initialStatusFilter = 'all',
  onUpdateLog,
  onDeleteLog,
  onOpenManualModal,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DmStatus>(initialStatusFilter);

  // Sync if initialStatusFilter changes
  React.useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);
  const [campaignFilter, setCampaignFilter] = useState<string>(selectedProjectId || 'all');
  const [channelFilter, setChannelFilter] = useState<'all' | ContactChannel>('all');
  const [secondMessageFilter, setSecondMessageFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [updatedAtSort, setUpdatedAtSort] = useState<'asc' | 'desc'>('desc');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'page' | 'all' | null>(null);

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

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: logs.length,
      waiting: logs.filter((l) => l.status === 'waiting' || l.status === '').length,
      in_talks: logs.filter((l) => l.status === 'in_talks').length,
      rejected: logs.filter((l) => l.status === 'rejected').length,
      confirmed: logs.filter((l) => l.status === 'confirmed').length,
    };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (campaignFilter !== 'all') {
      result = result.filter((l) => l.projectId === campaignFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((l) =>
        statusFilter === 'waiting' ? l.status === 'waiting' || l.status === '' : l.status === statusFilter
      );
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
  }, [logs, campaignFilter, statusFilter, searchTerm, channelFilter, secondMessageFilter, dateFrom, dateTo]);

  const sortedLogs = useMemo(() => {
    const result = [...filteredLogs];
    result.sort((a, b) =>
      updatedAtSort === 'asc'
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp)
    );
    return result;
  }, [filteredLogs, updatedAtSort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(start, start + itemsPerPage);
  }, [sortedLogs, currentPage, itemsPerPage]);

  // CSV Export
  const exportToExcel = (scope: 'page' | 'all') => {
    const targetLogs = scope === 'page' ? paginatedLogs : logs;
    const headers = [
      '로그ID',
      '발송일시',
      '인플루언서 계정',
      '프로필 링크',
      '팔로워 수',
      '연동 캠페인',
      '진행 상태',
      '기타 연락 수단',
      '2차 발송 여부',
      '메모',
    ];

    const statusMap: Record<DmStatus, string> = {
      waiting: '회신 대기',
      in_talks: '소통 중',
      confirmed: '협업 성사',
      rejected: '거절',
      '': '회신 대기',
    };

    const channelMap: Record<ContactChannel, string> = {
      none: '없음',
      email: '메일',
      inpock: '인포크',
      email_inpock: '메일+인포크',
    };

    const rows = targetLogs.map((log) => [
      log.id,
      log.timestamp,
      `@${log.influencer.handle}`,
      log.influencer.profileUrl,
      log.influencer.followers,
      log.projectName,
      statusMap[log.status],
      channelMap[log.channel],
      log.secondMessageSent ? '발송 완료' : '미발송',
      log.memo || '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DM 수집 로그');
    XLSX.writeFile(workbook, `InstaLog_DM_수집로그_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsExportModalOpen(false);
  };

  // Save Memo
  const handleSaveMemo = (log: DmLog) => {
    onUpdateLog({
      ...log,
      memo: tempMemo,
    });
    setEditingMemoId(null);
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로 돌아가기</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2.5">
          <button
            id="manual-add-log-btn"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-700 text-xs font-semibold hover:text-emerald-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>직접 추가</span>
          </button>

          <button
            id="export-excel-btn"
            onClick={() => {
              setExportScope(null);
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>데이터 다운로드</span>
          </button>
        </div>
      </div>

      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#111827]">
          전체 데이터
        </h1>
      </div>

      {/* Filter Bar (Matches Image 5) */}
      <div className="space-y-3">
        {/* Status Filter Pills (Interactive Pill Row from Image 5) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-[#00c73c] text-white shadow-sm border-[#00c73c]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <span>전체 로그</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'all' ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('waiting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'waiting'
                ? 'bg-blue-600 text-white shadow-sm border-blue-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>회신 대기</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {statusCounts.waiting}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('in_talks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'in_talks'
                ? 'bg-amber-500 text-white shadow-sm border-amber-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>소통 중</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {statusCounts.in_talks}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'rejected'
                ? 'bg-rose-500 text-white shadow-sm border-rose-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>거절</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {statusCounts.rejected}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-sm border-emerald-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>협업 성사</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {statusCounts.confirmed}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-influencer-input"
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

          {/* Campaign Filter View */}
          <div className="relative">
            <select
              id="select-campaign-filter"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="appearance-none pl-8 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">모든 프로젝트</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
      </div>

      {/* Table Container */}
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
                  '프로젝트',
                  '소통 상태',
                  '기타 소통 수단',
                  '2차 발송',
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
                    일치하는 DM 수집 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isEditingMemo = editingMemoId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 최근 업데이트 */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-700">{formatUpdatedAt(log.timestamp)}</span>
                      </td>

                      {/* 인플루언서 계정 정보 */}
                      <td className="py-3.5 px-4 overflow-hidden">
                        <div className="flex items-center gap-1 min-w-0">
                          <a
                            href={log.influencer.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-800 hover:text-emerald-600 transition-colors font-mono truncate block min-w-0"
                          >
                            @{log.influencer.handle}
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{log.influencer.nickname || log.influencer.handle}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                          팔로워 {log.influencer.followers}
                        </p>
                      </td>

                      {/* 연동 캠페인 */}
                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <select
                            value={log.projectId}
                            onChange={(e) => {
                              const project = projects.find((p) => p.id === e.target.value);
                              if (!project) return;
                              onUpdateLog({
                                ...log,
                                projectId: project.id,
                                projectName: project.name,
                              });
                            }}
                            className="w-full appearance-none text-xs font-semibold text-slate-800 rounded-lg pl-0 pr-4 py-1 cursor-pointer focus:outline-none"
                          >
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 상태 (Interactive Selector) */}
                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <select
                            value={log.status || 'waiting'}
                            onChange={(e) => {
                              onUpdateLog({
                                ...log,
                                status: e.target.value as DmStatus,
                              });
                            }}
                            className={`w-full appearance-none text-xs font-bold pl-0 pr-4 py-1 rounded-lg cursor-pointer focus:outline-none ${
                              log.status === 'confirmed'
                                ? 'text-emerald-700'
                                : log.status === 'in_talks'
                                ? 'text-amber-800'
                                : log.status === 'rejected'
                                ? 'text-rose-700'
                                : 'text-blue-700'
                            }`}
                          >
                            <option value="waiting">회신 대기</option>
                            <option value="in_talks">소통 중</option>
                            <option value="confirmed">협업 성사</option>
                            <option value="rejected">거절</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 기타 수단 */}
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

                      {/* 2차 발송 Checkbox */}
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

                      {/* 메모 (Click to Edit) */}
                      <td className="py-3.5 px-4">
                        {isEditingMemo ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempMemo}
                              onChange={(e) => setTempMemo(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-emerald-400 rounded-md focus:outline-none"
                              placeholder="메모 입력 후 저장..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveMemo(log);
                                if (e.key === 'Escape') setEditingMemoId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveMemo(log)}
                              className="px-2 py-1 bg-emerald-500 text-white rounded text-[11px] font-bold"
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
                            title="클릭하여 메모 수정"
                          >
                            <span className={`line-clamp-1 ${log.memo ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                              {log.memo || '메모 추가...'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
                          </div>
                        )}
                      </td>

                      {/* Action / Delete */}
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
                <p className="text-[11px] text-slate-400 mt-0.5">선택한 페이지 및 적용된 필터의 결과만 다운로드합니다.</p>
              </button>
              <button
                onClick={() => setExportScope('all')}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-xs font-bold text-[#111827]">모든 데이터</p>
                <p className="text-[11px] text-slate-400 mt-0.5">모든 데이터를 다운로드합니다.</p>
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
                  if (exportScope) exportToExcel(exportScope);
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
    </div>
  );
};
