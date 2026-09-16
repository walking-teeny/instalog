import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Layers, 
  TrendingUp, 
  Send,
  Zap,
  Check,
  Edit2
} from 'lucide-react';
import { Project, DmLog, DmStatus, ContactChannel } from '../types';

interface ProjectDetailViewProps {
  project: Project;
  logs: DmLog[];
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onUpdateLog: (updatedLog: DmLog) => void;
  onOpenManualModal: () => void;
  onOpenSimulator: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  logs,
  onBack,
  onUpdateProject,
  onUpdateLog,
  onOpenManualModal,
  onOpenSimulator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DmStatus>('all');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editBrand, setEditBrand] = useState(project.brand);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');

  // Project-specific logs
  const projectLogs = useMemo(() => {
    return logs.filter((l) => l.projectId === project.id);
  }, [logs, project.id]);

  const filteredLogs = useMemo(() => {
    let result = [...projectLogs];

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.influencer.handle.toLowerCase().includes(q) ||
          l.memo.toLowerCase().includes(q)
      );
    }

    return result;
  }, [projectLogs, statusFilter, searchTerm]);

  const totalSent = projectLogs.length;
  const repliedCount = projectLogs.filter((l) => l.status !== 'waiting').length;
  const confirmedCount = projectLogs.filter((l) => l.status === 'confirmed').length;
  const replyRate = totalSent > 0 
    ? ((repliedCount / totalSent) * 100).toFixed(1)
    : '0.0';

  const handleSaveProjectInfo = () => {
    if (!editName.trim()) return;
    onUpdateProject({
      ...project,
      name: editName.trim(),
      brand: editBrand.trim(),
    });
    setIsEditingTitle(false);
  };

  const exportProjectCSV = () => {
    const headers = [
      '로그ID',
      '발송일시',
      '인플루언서 아이디',
      '프로필 링크',
      '팔로워',
      '진행 상태',
      '기타 연락 수단',
      '2차 발송',
      '메모',
    ];

    const statusMap: Record<DmStatus, string> = {
      waiting: '회신 대기',
      in_talks: '소통 중',
      confirmed: '협업 성사',
      rejected: '거절',
    };

    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      `@${log.influencer.handle}`,
      log.influencer.profileUrl,
      log.influencer.followers,
      statusMap[log.status],
      log.channel,
      log.secondMessageSent ? '완료' : '미발송',
      `"${(log.memo || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name}_DM리스트_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>대시보드로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>이 캠페인으로 위젯 DM 발송 테스트</span>
          </button>
          <button
            onClick={exportProjectCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c73c] text-white text-xs font-bold shadow-sm shadow-[#00c73c]/20 hover:bg-[#00b035] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>CSV 다운로드</span>
          </button>
        </div>
      </div>

      {/* Project Banner & Quick Editor */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                {project.tag}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  project.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {project.statusText}
              </span>
              <span className="text-xs text-slate-400">생성일: {project.createdAt}</span>
            </div>

            {isEditingTitle ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xl font-bold px-3 py-1.5 border border-emerald-400 rounded-xl focus:outline-none"
                  placeholder="프로젝트명"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="text-xs font-semibold px-3 py-1 border border-slate-300 rounded-lg focus:outline-none"
                    placeholder="소속 브랜드/업체명"
                  />
                  <button
                    onClick={handleSaveProjectInfo}
                    className="px-3 py-1 bg-[#00c73c] text-white text-xs font-bold rounded-lg"
                  >
                    저장 완료
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-3 group">
                <h1 className="text-2xl font-black text-[#111827] tracking-tight">
                  {project.name}
                </h1>
                <span className="text-sm font-bold text-slate-600">({project.brand})</span>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                  title="프로젝트 정보 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            {project.description && (
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick status switch */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-medium text-slate-600 px-2">상태 변경:</span>
            <select
              value={project.status}
              onChange={(e) => {
                const newStatus = e.target.value as any;
                const statusMap: Record<string, string> = {
                  active: '기록 활성',
                  waiting: '진행 중',
                  paused: '수집 일시정지',
                };
                onUpdateProject({
                  ...project,
                  status: newStatus,
                  statusText: statusMap[newStatus] || '진행 중',
                });
              }}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="active">🟢 기록 활성 (연동 중)</option>
              <option value="waiting">🟡 진행 중 (대기열 할당)</option>
              <option value="paused">⚪ 수집 일시정지</option>
            </select>
          </div>
        </div>

        {/* 3 Metric Cards for This Project */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <p className="text-xs font-medium text-slate-500">총 발송량</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#111827] font-mono">{totalSent}</span>
              <span className="text-xs text-slate-500 font-bold">건</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">회신 완료율</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {replyRate}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">{repliedCount}</span>
              <span className="text-xs text-slate-500 font-bold">건 회신</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <p className="text-xs font-medium text-slate-500">협업 성사 및 확정</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#00c73c] font-mono">{confirmedCount}</span>
              <span className="text-xs text-slate-500 font-bold">건 성사</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Table Header & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827]">캠페인 발송 및 수집 리스트</h2>
            <span className="text-xs text-slate-400 font-medium">({filteredLogs.length}건)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="아이디 또는 메모 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#00c73c]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">전체 상태 보기</option>
              <option value="waiting">회신 대기</option>
              <option value="in_talks">소통 중</option>
              <option value="confirmed">협업 성사</option>
              <option value="rejected">거절</option>
            </select>

            {/* Add Manual Log */}
            <button
              onClick={onOpenManualModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>수기 로그 추가</span>
            </button>
          </div>
        </div>

        {/* Table for this project */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-slate-600 font-semibold">
                <th className="py-3 px-4 w-[130px]">감지 일시</th>
                <th className="py-3 px-4 min-w-[180px]">인플루언서 아이디</th>
                <th className="py-3 px-4 w-[140px]">진행 상태</th>
                <th className="py-3 px-4 w-[120px]">기타 수단</th>
                <th className="py-3 px-3 w-[80px] text-center">2차 발송</th>
                <th className="py-3 px-4 min-w-[260px]">메모 (클릭하여 수정)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    등록된 DM 발송 기록이 없습니다. 위젯을 통해 DM을 발송하거나 수기로 등록해 보세요.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isEditing = editingMemoId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-700">{log.timeAgo}</span>
                        <p className="text-[11px] text-slate-400">{log.timestamp}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={log.influencer.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-800 hover:text-emerald-600 transition-colors font-mono flex items-center gap-1"
                          >
                            @{log.influencer.handle}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({log.influencer.followers})
                          </span>
                        </div>
                      </td>

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
                          >
                            <span className={`line-clamp-1 ${log.memo ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                              {log.memo || '메모 추가...'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
