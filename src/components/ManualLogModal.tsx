import React, { useState } from 'react';
import { X, UserPlus, AtSign, Link2, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Project, DmLog, DmStatus, ContactChannel } from '../types';

interface ManualLogModalProps {
  isOpen: boolean;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onAddLog: (newLog: DmLog) => void;
}

export const ManualLogModal: React.FC<ManualLogModalProps> = ({
  isOpen,
  projects,
  defaultProjectId,
  onClose,
  onAddLog,
}) => {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [handle, setHandle] = useState('');
  const [followers, setFollowers] = useState('');
  const [status, setStatus] = useState<DmStatus>('waiting');
  const [channel, setChannel] = useState<ContactChannel>('none');
  const [secondMessage, setSecondMessage] = useState(false);
  const [memo, setMemo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = handle.replace(/^@/, '').trim();
    if (!cleanHandle) return;

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
        handle: cleanHandle,
        profileUrl: `https://instagram.com/${cleanHandle}`,
        followers: followers.trim() || '10.5K',
        verified: false,
      },
      status,
      channel,
      secondMessageSent: secondMessage,
      memo: memo.trim(),
    };

    onAddLog(newLog);
    setHandle('');
    setFollowers('');
    setMemo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00c73c]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">수기 발송 로그 추가</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                인스타그램에서 누락되었거나 직접 전송한 제안 내역을 보완 등록합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 연동 캠페인 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">연동 대상 캠페인 (프로젝트)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-[#00c73c]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          {/* 인플루언서 아이디 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-slate-500" />
              <span>인스타그램 계정 아이디</span>
              <span className="text-emerald-600 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: stylist_minji (골뱅이 제외 또는 포함 가능)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white font-mono"
            />
          </div>

          {/* 팔로워 수 & 초기 상태 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>팔로워 수</span>
              </label>
              <input
                type="text"
                placeholder="예: 45.2K"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00c73c] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">진행 상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DmStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
              >
                <option value="waiting">회신 대기</option>
                <option value="in_talks">소통 중</option>
                <option value="confirmed">협업 성사</option>
                <option value="rejected">거절</option>
              </select>
            </div>
          </div>

          {/* 기타 수단 & 2차 발송 여부 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">기타 연락 수단</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ContactChannel)}
                className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
              >
                <option value="none">없음</option>
                <option value="email">메일</option>
                <option value="inpock">인포크</option>
                <option value="email_inpock">메일+인포크</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secondMessage}
                  onChange={(e) => setSecondMessage(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 accent-[#00c73c]"
                />
                <span>2차 리마인드 발송 완료</span>
              </label>
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>특이사항 및 협업 메모</span>
            </label>
            <textarea
              rows={2}
              placeholder="예: 샘플 협의 필요, 릴스 1회 확정 등..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white resize-none"
            />
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
              className="px-5 py-2.5 rounded-xl bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold shadow-sm shadow-[#00c73c]/30 cursor-pointer"
            >
              수기 로그 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
