import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  FolderGit2, 
  Send, 
  TrendingUp, 
  Zap, 
  Search, 
  Plus, 
  ChevronRight, 
  Filter, 
  ArrowUpDown,
  ShoppingBag,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { Project, DmLog, DmStatus, ProjectType } from '../types';

interface DashboardViewProps {
  projects: Project[];
  logs: DmLog[];
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
  onNavigateToLogs?: (status?: 'all' | DmStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  logs,
  onSelectProject,
  onOpenCreateModal,
  onNavigateToLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'최신 생성순' | '최신 업데이트순'>('최신 업데이트순');
  const [filterStatus, setFilterStatus] = useState<'전체' | '진행 중' | '종료'>('전체');
  const [filterType, setFilterType] = useState<'전체' | ProjectType>('전체');

  // Derive stats directly from `logs` to strictly unify with "DM 자동 수집 로그"
  const logStats = useMemo(() => {
    const total = logs.length;
    const waiting = logs.filter((l) => l.status === 'waiting').length;
    const inTalks = logs.filter((l) => l.status === 'in_talks').length;
    const confirmed = logs.filter((l) => l.status === 'confirmed').length;
    const rejected = logs.filter((l) => l.status === 'rejected').length;
    const replied = inTalks + confirmed + rejected;
    const replyRate = total > 0 ? ((replied / total) * 100).toFixed(1) : '0.0';
    const waitingRate = total > 0 ? ((waiting / total) * 100).toFixed(1) : '0.0';
    const confirmedRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      waiting,
      inTalks,
      confirmed,
      rejected,
      replied,
      replyRate,
      waitingRate,
      confirmedRate,
    };
  }, [logs]);

  // Derive project items enriched with live logs data so every number matches DM logs
  const enrichedProjects = useMemo(() => {
    return projects.map((p) => {
      const pLogs = logs.filter((l) => l.projectId === p.id);
      const totalSent = pLogs.length;
      const waitingCount = pLogs.filter((l) => l.status === 'waiting').length;
      const inTalksCount = pLogs.filter((l) => l.status === 'in_talks').length;
      const repliedCount = pLogs.filter((l) => l.status !== 'waiting' && l.status !== '').length;
      const confirmedCount = pLogs.filter((l) => l.status === 'confirmed').length;
      const latest = pLogs[0];
      const latestLog = latest
        ? {
            handle: `@${latest.influencer.handle}`,
            action:
              latest.status === 'confirmed'
                ? '협업 성사'
                : latest.status === 'in_talks'
                ? '소통 중'
                : latest.status === 'rejected'
                ? '거절'
                : '제안 발송',
            timeAgo: latest.timeAgo,
          }
        : p.latestLog;

      return {
        ...p,
        totalSent,
        waitingCount,
        inTalksCount,
        repliedCount,
        confirmedCount,
        latestLog,
      };
    });
  }, [projects, logs]);

  // Filtered & Sorted projects
  const filteredProjects = useMemo(() => {
    let result = [...enrichedProjects];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q)
      );
    }

    if (filterStatus === '진행 중') {
      result = result.filter((p) => p.status === 'active' || p.status === 'waiting');
    } else if (filterStatus === '종료') {
      result = result.filter((p) => p.status === 'completed' || p.status === 'paused');
    }

    if (filterType !== '전체') {
      result = result.filter((p) => p.projectType === filterType);
    }

    if (sortBy === '최신 생성순') {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === '최신 업데이트순') {
      result.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    }

    return result;
  }, [enrichedProjects, searchTerm, filterStatus, filterType, sortBy]);

  // 무한 스크롤 상태 및 로직
  const [visibleCount, setVisibleCount] = useState(10);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, filterStatus, filterType, sortBy]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredProjects.length) {
        setVisibleCount(prev => prev + 10);
      }
    });
    if (node) observer.current.observe(node);
  }, [visibleCount, filteredProjects.length]);

  const displayedProjects = useMemo(() => {
    return filteredProjects.slice(0, visibleCount);
  }, [filteredProjects, visibleCount]);

  const getProjectIcon = (iconType: string) => {
    switch (iconType) {
      case 'hanger':
        return <Play className="w-4 h-4 text-emerald-600 fill-emerald-500/20" />;
      case 'leaf':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'bag':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-7">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            대시보드
          </h1>
        </div>
        <button
          onClick={() => onNavigateToLogs?.('all')}
          className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 hover:text-[#00c73c] transition-colors cursor-pointer group"
        >
          <span className="group-hover:underline underline-offset-2">데이터 전체 보기</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 4 Metric KPI Cards - 1 Row Compact Design, strictly unified with DM 자동 수집 로그 */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: 전체 수집 로그 */}
        <div 
          onClick={() => onNavigateToLogs?.('all')}
          title="클릭 시 DM 자동 수집 로그 전체 보기"
          className="py-3 px-3 sm:px-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[11px] sm:text-xs font-semibold text-[#64748b] group-hover:text-blue-600 truncate">
                전체 수집 로그
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#111827] font-mono">{logStats.total}</span>
              <span className="text-[11px] font-bold text-slate-500">건</span>
            </div>
          </div>
        </div>

        {/* Card 2: 회신 대기 */}
        <div 
          onClick={() => onNavigateToLogs?.('waiting')}
          title="클릭 시 회신 대기 DM 로그 보기"
          className="py-3 px-3 sm:px-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all group"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[11px] sm:text-xs font-semibold text-[#64748b] group-hover:text-slate-800 truncate">
                회신 대기
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">{logStats.waiting}</span>
              <span className="text-[11px] font-bold text-slate-500">건</span>
            </div>
          </div>
        </div>

        {/* Card 3: 소통 중 */}
        <div 
          onClick={() => onNavigateToLogs?.('in_talks')}
          title="클릭 시 소통 중인 DM 로그 보기"
          className="py-3 px-3 sm:px-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs cursor-pointer hover:border-amber-400 hover:shadow-sm transition-all group"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[11px] sm:text-xs font-semibold text-[#64748b] group-hover:text-amber-700 truncate">
                소통 중
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{logStats.inTalks}</span>
              <span className="text-[11px] font-bold text-slate-500">건</span>
            </div>
          </div>
        </div>

        {/* Card 4: 협업 성사 */}
        <div 
          onClick={() => onNavigateToLogs?.('confirmed')}
          title="클릭 시 협업 성사된 DM 로그 보기"
          className="py-3 px-3 sm:px-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs cursor-pointer hover:border-emerald-400 hover:shadow-sm transition-all group"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[11px] sm:text-xs font-semibold text-[#64748b] group-hover:text-[#006e1d] truncate">
                협업 성사
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#00c73c] font-mono">{logStats.confirmed}</span>
              <span className="text-[11px] font-bold text-slate-500">건</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4 pt-2">
        {/* Row 1: Title & Operational Status Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#111827]">
              프로젝트 목록
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              총 {filteredProjects.length}개
            </span>
          </div>
        </div>

        {/* Row 2: Search, Filter, Sort and New Project Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-projects-input"
                type="text"
                placeholder="프로젝트 이름 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-[#00c73c]"
              />
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(sortBy === '최신 생성순' ? '최신 업데이트순' : '최신 생성순')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span>{sortBy}</span>
            </button>

            {/* Filter */}
            <div className="relative">
              <select
                id="filter-projects-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '전체' | '진행 중' | '종료')}
                className="appearance-none pl-7 pr-8 py-2 text-xs bg-white border border-[#e2e8f0] rounded-xl text-slate-700 font-medium focus:outline-none focus:border-[#00c73c] cursor-pointer"
              >
                <option value="전체">상태</option>
                <option value="진행 중">진행 중</option>
                <option value="종료">종료</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Project Type Filter */}
            <div className="relative">
              <select
                id="filter-project-type-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as '전체' | ProjectType)}
                className="appearance-none pl-7 pr-8 py-2 text-xs bg-white border border-[#e2e8f0] rounded-xl text-slate-700 font-medium focus:outline-none focus:border-[#00c73c] cursor-pointer"
              >
                <option value="전체">유형</option>
                <option value="공동구매">공동구매</option>
                <option value="협찬">협찬</option>
                <option value="광고">광고</option>
                <option value="기타">기타</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* New Project Button */}
          <button
            id="create-project-btn"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>새 프로젝트</span>
          </button>
        </div>

        {/* Project Cards List */}
        <div className="space-y-3">
          {displayedProjects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#e2e8f0]">
              <p className="text-sm font-bold text-slate-700">프로젝트가 없습니다.</p>
              <button
                onClick={onOpenCreateModal}
                className="mt-4 px-4 py-2 bg-[#00c73c] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + 첫 프로젝트 시작하기
              </button>
            </div>
          ) : (
            displayedProjects.map((project, index) => {
              const isLast = index === displayedProjects.length - 1;
              const replyPercent = project.totalSent > 0 
                ? ((project.repliedCount / project.totalSent) * 100).toFixed(1) 
                : '0.0';

              return (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  ref={isLast ? lastElementRef : null}
                  onClick={() => onSelectProject(project.id)}
                  className="relative bg-white rounded-2xl border border-[#e2e8f0] p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer"
                >
                  {/* Top-Right Detail Button (Text Style) */}
                  <button
                    id={`view-detail-btn-${project.id}`}
                    onClick={() => onSelectProject(project.id)}
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-0.5 text-xs font-semibold text-slate-400 hover:text-[#00c73c] transition-colors cursor-pointer group"
                  >
                    <span className="group-hover:underline underline-offset-2">자세히 보기</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Left info */}
                  <div className="flex items-start gap-4 min-w-[320px]">
                    <div>
                    <p className="text-[11px] text-slate-400 font-medium mb-0.5">{project.projectType}</p>
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => onSelectProject(project.id)}
                        className="text-[18px] font-extrabold text-[#111827] hover:text-emerald-600 cursor-pointer transition-colors"
                      >
                        {project.name}
                      </h3>
                      <span
                        className={`text-[8px] leading-none font-bold px-1.5 py-[3px] rounded-full whitespace-nowrap ${
                          project.status === 'active' || project.status === 'waiting'
                            ? 'bg-emerald-50 text-[#006e1d] border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {project.status === 'active' || project.status === 'waiting' ? '진행 중' : '종료'}
                      </span>
                    </div>
                    </div>
                  </div>

                  {/* Right: 4 Stats (전체 수집 로그 | 회신 대기 | 소통 중 | 협업 성사) - Unified with Top KPI */}
                  <div className="flex items-center gap-5 sm:gap-6 shrink-0">
                    <div className="text-left">
                      <p className="text-[11px] text-slate-400 font-medium">전체 수집 로그</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[11px] font-black text-slate-500 font-mono">{project.totalSent}</span>
                        <span className="text-[11px] font-normal text-slate-500">건</span>
                      </div>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-200" />

                    <div className="text-left">
                      <p className="text-[11px] text-slate-400 font-medium">회신 대기</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[11px] font-black text-slate-500 font-mono">{project.waitingCount}</span>
                        <span className="text-[11px] font-normal text-slate-500">건</span>
                      </div>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-200" />

                    <div className="text-left">
                      <p className="text-[11px] text-slate-400 font-medium">소통 중</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[11px] font-black text-slate-500 font-mono">{project.inTalksCount}</span>
                        <span className="text-[11px] font-normal text-slate-500">건</span>
                      </div>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-200" />

                    <div className="text-left">
                      <p className="text-[11px] text-slate-400 font-medium">협업 성사</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[11px] font-black text-slate-500 font-mono">{project.confirmedCount}</span>
                        <span className="text-[11px] font-normal text-slate-500">건</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
