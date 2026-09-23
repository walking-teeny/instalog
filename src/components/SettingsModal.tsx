import React, { useState, useEffect } from 'react';
import { X, User, UserCircle, LogOut, Download, BookOpen, ChevronLeft, ArrowLeftRight, Check, Plus, Trash2 } from 'lucide-react';
import { getProfiles, addProfile } from '../api';
import { ProfileAvatar } from './ProfileAvatar';

const GUIDE_STEPS = [
  'InstaLog에서 Chrome 확장 프로그램 설치',
  '설치한 zip 파일 압축 해제',
  'Chrome 웹 브라우저 실행',
  '더보기 버튼 클릭',
  '확장 프로그램 메뉴 클릭',
  '확장 프로그램 관리 메뉴 클릭',
  '압축해제된 확장 프로그램 로드 버튼 클릭',
  'instalog-extension 선택',
  '세부 정보 버튼 클릭',
  '툴바에 고정 옵션 활성화',
  'Instagram 웹 페이지 접속 + 새로고침(필수)',
  '툴바에 고정된 InstaLog 아이콘 클릭',
  'InstaLog 계정으로 로그인',
];

interface SettingsModalProps {
  isOpen: boolean;
  username: string | null;
  profileName: string | null;
  onClose: () => void;
  onLogout: () => void;
  onSwitchProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  username,
  profileName,
  onClose,
  onLogout,
  onSwitchProfile,
  onDeleteProfile,
}) => {
  const [view, setView] = useState<'main' | 'guide' | 'profile'>('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profiles, setProfiles] = useState(getProfiles);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [deleteTargetProfile, setDeleteTargetProfile] = useState<string | null>(null);
  const selectedProfile = profiles.find((p) => p.name === profileName);

  // Another tab may have added/deleted a profile since this list was read; pick that up
  // instead of risking this modal's next add/delete overwriting it with a stale copy.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'instalog_profiles') setProfiles(getProfiles());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setView('main');
    setShowLogoutConfirm(false);
    setIsAddingProfile(false);
    setNewProfileName('');
    setDeleteTargetProfile(null);
    onClose();
  };

  const handleAddProfile = () => {
    const name = newProfileName.trim();
    if (!name || profiles.some((p) => p.name === name)) return;
    setProfiles([...profiles, addProfile(name)]);
    setNewProfileName('');
    setIsAddingProfile(false);
  };

  const handleConfirmDeleteProfile = () => {
    if (!deleteTargetProfile) return;
    onDeleteProfile(deleteTargetProfile);
    setProfiles(profiles.filter((p) => p.name !== deleteTargetProfile));
    setDeleteTargetProfile(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'main' ? (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827]">설정</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-6 space-y-4">
              <div className="space-y-2">
                <p className="text-[13.2px] font-bold text-slate-500">계정 정보</p>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="flex-1 text-left text-sm font-bold text-[#111827]">{username || '알 수 없음'}</p>
                  <LogOut className="w-4 h-4 text-rose-500" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[13.2px] font-bold text-slate-500">프로필 정보</p>
                <button
                  onClick={() => setView('profile')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  {selectedProfile ? (
                    <ProfileAvatar profile={selectedProfile} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <UserCircle className="w-4 h-4" />
                    </div>
                  )}
                  <p className="flex-1 text-left text-sm font-bold text-[#111827]">{profileName || '선택되지 않음'}</p>
                  <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[13.2px] font-bold text-slate-500">인스타그램 연동</p>
                <div className="flex items-center gap-2">
                  <a
                    href="/instalog-extension.zip"
                    download
                    className="flex-1 flex items-center justify-center gap-1.5 py-[19px] px-3 bg-[#00c73c] hover:bg-[#00b035] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-[#00c73c]/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>연동 프로그램 설치</span>
                  </a>
                  <button
                    onClick={() => setView('guide')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-[19px] px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>설치 및 사용 가이드</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : view === 'guide' ? (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setView('main')}
                className="p-1 -ml-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-[#111827] flex-1">설치 및 사용 가이드</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-6 max-h-[70vh] overflow-y-auto">
              <ol className="space-y-2.5 list-decimal list-inside">
                {GUIDE_STEPS.map((step, i) => (
                  <li key={i} className="text-xs text-slate-700 leading-relaxed pl-1">
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-4 pl-1 text-xs font-bold text-slate-500">인스타그램 DM 발송 내역 자동 기록을 시작합니다.</p>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setView('main')}
                className="p-1 -ml-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-[#111827] flex-1">프로필 전환</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-6 space-y-2">
              {profiles.map((p) => {
                const isSelected = p.name === profileName;
                return (
                  <div
                    key={p.name}
                    className={`w-full flex items-center gap-1 pl-4 pr-2 py-2 rounded-xl border transition-colors ${
                      isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSwitchProfile(p.name);
                        handleClose();
                      }}
                      className="flex-1 flex items-center gap-3 min-w-0 py-1 cursor-pointer"
                    >
                      <ProfileAvatar profile={p} />
                      <p className="flex-1 text-left text-sm font-bold text-[#111827] truncate">{p.name}</p>
                    </button>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <button
                      onClick={() => setDeleteTargetProfile(p.name)}
                      disabled={profiles.length <= 1}
                      title={profiles.length <= 1 ? '최소 1개의 프로필이 필요합니다' : '프로필 삭제'}
                      className="p-2 text-slate-300 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {isAddingProfile ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    autoFocus
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddProfile();
                      if (e.key === 'Escape') setIsAddingProfile(false);
                    }}
                    placeholder="닉네임을 입력하세요. (수정 불가)"
                    className="flex-1 px-3 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={handleAddProfile}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    추가
                  </button>
                </div>
              ) : (
                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setIsAddingProfile(true)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    프로필 추가
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-[#111827]">로그아웃 하시겠습니까?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetProfile && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTargetProfile(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#111827]">'{deleteTargetProfile}' 프로필을 삭제하시겠습니까?</p>
              <p className="text-xs text-slate-500">이미 추가된 데이터의 담당자는 그대로 유지됩니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteTargetProfile(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteProfile}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
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
