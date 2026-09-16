import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCw, 
  Download, 
  Filter, 
  Calendar, 
  UserCheck, 
  Check, 
  Edit2, 
  Plus, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageCircle,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { DmLog, Project, DmStatus, ContactChannel } from '../types';

interface DmLogsViewProps {
  logs: DmLog[];
  projects: Project[];
  selectedProjectId?: string | null;
  initialStatusFilter?: 'all' | DmStatus;
  onUpdateLog: (updatedLog: DmLog) => void;
  onDeleteLog?: (logId: string) => void;
  onOpenManualModal: () => void;
  onRefresh: () => void;
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
  onRefresh,
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
  const [dateRange, setDateRange] = useState<string>('7d');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [editingHandleId, setEditingHandleId] = useState<string | null>(null);
  const [tempHandle, setTempHandle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: logs.length,
      waiting: logs.filter((l) => l.status === 'waiting').length,
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
      result = result.filter((l) => l.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.influencer.handle.toLowerCase().includes(q) ||
          l.projectName.toLowerCase().includes(q) ||
          l.memo.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, campaignFilter, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // CSV Export
  const exportToCSV = () => {
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
    };

    const channelMap: Record<ContactChannel, string> = {
      none: '없음',
      email: '메일',
      inpock: '인포크',
      email_inpock: '메일+인포크',
    };

    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      `@${log.influencer.handle}`,
      log.influencer.profileUrl,
      log.influencer.followers,
      `"${log.projectName.replace(/"/g, '""')}"`,
      statusMap[log.status],
      channelMap[log.channel],
      log.secondMessageSent ? '발송 완료' : '미발송',
      `"${(log.memo || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `InstaLog_DM_수집로그_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Memo
  const handleSaveMemo = (log: DmLog) => {
    onUpdateLog({
      ...log,
      memo: tempMemo,
    });
    setEditingMemoId(null);
  };

  // Save Handle
  const handleSaveHandle = (log: DmLog) => {
    const cleanHandle = tempHandle.replace(/^@/, '').trim();
    if (!cleanHandle) return;
    onUpdateLog({
      ...log,
      influencer: {
        ...log.influencer,
        handle: cleanHandle,
        profileUrl: `https://instagram.com/${cleanHandle}`,
      },
    });
    setEditingHandleId(null);
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">
              전체 데이터
            </h1>
            <p className="text-xs text-[#64748b] mt-0.5 font-medium">
              인스타그램 웹에서 감지된 발송 이력과 인플루언서 상태를 실시간 동기화합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="manual-add-log-btn"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-700 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>수기 로그 추가</span>
          </button>

          <button
            id="manual-refresh-logs-btn"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>수동 새로고침</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>CSV 내보내기</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Matches Image 5) */}
      <div className="p-3.5 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-influencer-input"
              type="text"
              placeholder="@인플루언서 아이디, DM 키워드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white"
            />
          </div>

          {/* Date Range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="7d">최근 7일 (09.08 ~ 09.14)</option>
              <option value="14d">최근 14일</option>
              <option value="30d">최근 30일</option>
              <option value="all">전체 기간</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Campaign Filter View */}
          <div className="relative">
            <select
              id="select-campaign-filter"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">모든 캠페인 연동 뷰</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Filter Pills (Interactive Pill Row from Image 5) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#00c73c] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>전체 로그</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'all' ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('waiting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'waiting'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'in_talks'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

      {/* Realtime packet streaming banner */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c73c]"></span>
          </span>
          <span className="text-emerald-700 font-semibold">인스타그램 DM 실시간 패킷 스트림</span>
          <span className="text-slate-400">Polling interval: 1.2s</span>
        </div>
        <div>
          표시중: <span className="font-bold text-slate-700">{paginatedLogs.length}</span> / 총 <span className="font-bold text-slate-700">{filteredLogs.length}</span>건
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-slate-600 font-semibold">
                <th className="py-3 px-4 w-[130px]">감지 시각</th>
                <th className="py-3 px-4 min-w-[200px]">대상 인플루언서</th>
                <th className="py-3 px-4 min-w-[180px]">연동 캠페인</th>
                <th className="py-3 px-4 w-[120px]">상태</th>
                <th className="py-3 px-4 w-[120px]">기타 수단</th>
                <th className="py-3 px-3 w-[70px] text-center">2차 발송</th>
                <th className="py-3 px-4 min-w-[240px]">메모</th>
                <th className="py-3 px-2 w-[40px]"></th>
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
                  const isEditingHandle = editingHandleId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 감지 시각 */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="font-bold text-slate-700">{log.timeAgo}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {log.timestamp.split(' ')[1] || log.timestamp}
                        </p>
                      </td>

                      {/* 대상 인플루언서 (Avatar + Handle + Followers) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-200 flex items-center justify-center">
                            {log.influencer.avatarUrl ? (
                              <img
                                src={log.influencer.avatarUrl}
                                alt={log.influencer.handle}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="font-bold text-slate-500 text-[11px]">
                                {log.influencer.handle.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div>
                            {isEditingHandle ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={tempHandle}
                                  onChange={(e) => setTempHandle(e.target.value)}
                                  className="px-1.5 py-0.5 text-xs border border-emerald-400 rounded focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveHandle(log)}
                                  className="p-1 rounded bg-emerald-500 text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group">
                                <a
                                  href={log.influencer.profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-slate-800 hover:text-emerald-600 transition-colors font-mono"
                                >
                                  @{log.influencer.handle}
                                </a>
                                {log.influencer.verified && (
                                  <span className="text-emerald-600 text-[10px]" title="인증 배지">
                                    ✓
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingHandleId(log.id);
                                    setTempHandle(log.influencer.handle);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700"
                                  title="아이디 수정"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono">
                              팔로워 {log.influencer.followers}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 연동 캠페인 */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {log.projectName}
                        </span>
                      </td>

                      {/* 상태 (Interactive Selector) */}
                      <td className="py-3.5 px-4">
                        <select
                          value={log.status}
                          onChange={(e) => {
                            onUpdateLog({
                              ...log,
                              status: e.target.value as DmStatus,
                            });
                          }}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                            log.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.status === 'in_talks'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : log.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="waiting">회신 대기</option>
                          <option value="in_talks">소통 중</option>
                          <option value="confirmed">협업 성사</option>
                          <option value="rejected">거절</option>
                        </select>
                      </td>

                      {/* 기타 수단 */}
                      <td className="py-3.5 px-4">
                        <select
                          value={log.channel}
                          onChange={(e) => {
                            onUpdateLog({
                              ...log,
                              channel: e.target.value as ContactChannel,
                            });
                          }}
                          className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 cursor-pointer focus:outline-none font-medium"
                        >
                          <option value="none">없음</option>
                          <option value="email">메일</option>
                          <option value="inpock">인포크</option>
                          <option value="email_inpock">메일+인포크</option>
                        </select>
                      </td>

                      {/* 2차 발송 Checkbox */}
                      <td className="py-3.5 px-3 text-center">
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
                            className="group flex items-center justify-between cursor-pointer py-1 px-1.5 rounded hover:bg-slate-100"
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
                            onClick={() => onDeleteLog(log.id)}
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
          <div className="flex items-center gap-2">
            <span>페이지당 표시:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 font-medium focus:outline-none cursor-pointer"
            >
              <option value={10}>10개</option>
              <option value={25}>25개</option>
              <option value={50}>50개</option>
            </select>
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
  );
};
