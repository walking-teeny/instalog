import React, { useEffect, useState } from 'react';
import { X, Link2, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { Project, DmLog } from '../types';
import { api } from '../api';

interface ManualLogModalProps {
  isOpen: boolean;
  projects: Project[];
  defaultProjectId?: string;
  lockedProjectId?: string | null;
  onClose: () => void;
  onAddLog: (newLog: DmLog) => void;
}

interface FetchedAccountInfo {
  handle: string;
  nickname: string;
  followers: string;
}

// Instagram profile URL -> handle (e.g. "https://instagram.com/stylist_minji" -> "stylist_minji")
const parseHandleFromUrl = (url: string): string | null => {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
  return match ? match[1].replace(/\.$/, '') : null;
};

export const ManualLogModal: React.FC<ManualLogModalProps> = ({
  isOpen,
  projects,
  defaultProjectId,
  lockedProjectId,
  onClose,
  onAddLog,
}) => {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');

  useEffect(() => {
    if (isOpen && lockedProjectId) {
      setProjectId(lockedProjectId);
    }
  }, [isOpen, lockedProjectId]);
  const [url, setUrl] = useState('');
  // 'unavailable': 자동으로 계정 정보를 가져오지 못함 (닉네임/팔로워 수는 공란으로 저장)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'unavailable'>('idle');
  const [accountInfo, setAccountInfo] = useState<FetchedAccountInfo | null>(null);

  // 실제 인스타그램 프로필 정보를 서버를 통해 조회합니다. 인스타그램이 요청을 차단/제한해
  // 자동 조회가 실패하면, 닉네임/팔로워 수는 공란으로 저장하고 크롬 확장 프로그램이
  // 나중에 실제 프로필 방문 시 채워 넣습니다.
  useEffect(() => {
    const handle = parseHandleFromUrl(url);
    if (!handle) {
      setFetchStatus(url.trim() ? 'error' : 'idle');
      setAccountInfo(null);
      return;
    }

    let cancelled = false;
    setFetchStatus('loading');

    const timer = setTimeout(async () => {
      try {
        const info = await api.lookupInstagramProfile(url);
        if (cancelled) return;
        setAccountInfo(info);
        setFetchStatus('done');
      } catch {
        if (cancelled) return;
        setAccountInfo({ handle, nickname: '', followers: '' });
        setFetchStatus('unavailable');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  if (!isOpen) return null;

  const canSubmit = (fetchStatus === 'done' || fetchStatus === 'unavailable') && !!accountInfo && projects.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !accountInfo) return;

    const nickname = accountInfo.nickname;
    const targetProject = projects.find((p) => p.id === projectId) || projects[0];

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newLog: DmLog = {
      id: `manual_${Date.now()}`,
      projectId: targetProject.id,
      projectName: targetProject.name,
      timestamp: timestampStr,
      timeAgo: '방금',
      influencer: {
        handle: accountInfo.handle,
        nickname,
        profileUrl: `https://instagram.com/${accountInfo.handle}`,
        followers: accountInfo.followers,
        verified: false,
      },
      status: 'waiting',
      channel: 'none',
      secondMessageSent: false,
      memo: '',
    };

    onAddLog(newLog);
    setUrl('');
    setAccountInfo(null);
    setFetchStatus('idle');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">데이터 직접 추가</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-3 pb-[29px] space-y-4">
          {/* 연동 캠페인 선택 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">프로젝트 선택</label>
            <div className="relative">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!!lockedProjectId}
                className="w-full appearance-none pl-3 pr-9 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-[#00c73c] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {projects.length === 0 && <option value="">생성된 프로젝트가 없습니다</option>}
                {(lockedProjectId ? projects.filter((p) => p.id === lockedProjectId) : projects).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 인스타그램 URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              <span>인스타그램 URL</span>
              <span className="text-emerald-600 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: https://instagram.com/stylist_minji"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white font-mono"
            />

            {fetchStatus === 'loading' && (
              <p className="flex items-center gap-1.5 text-[13.2px] text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                계정 정보를 불러오는 중...
              </p>
            )}
            {fetchStatus === 'error' && (
              <p className="text-[13.2px] text-rose-500">
                인스타그램 프로필 URL 형식이 아닙니다. (예: https://instagram.com/계정아이디)
              </p>
            )}
            {fetchStatus === 'done' && accountInfo && (
              <div className="flex items-center gap-1.5 text-[13.2px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="font-mono font-bold">@{accountInfo.handle}</span>
                <span>· {accountInfo.nickname}</span>
                <span>· 팔로워 {accountInfo.followers}</span>
              </div>
            )}
            {fetchStatus === 'unavailable' && accountInfo && (
              <div className="flex items-start gap-1.5 text-[13.2px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  일부 계정 정보를 불러오는 데 실패하였습니다.
                  <br />
                  확장 프로그램 위젯에서 [빈 데이터 채우기] 버튼을 클릭하면 누락된 정보를 불러옵니다.
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-[#00c73c] hover:bg-[#00b035] disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-[#00c73c]/30 cursor-pointer"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
