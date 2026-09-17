import React, { useState } from 'react';
import { X, User, LogOut, Info, Download, BookOpen, ChevronLeft } from 'lucide-react';

const APP_VERSION = '1.0.0';

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
  onClose: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, username, onClose, onLogout }) => {
  const [view, setView] = useState<'main' | 'guide'>('main');

  if (!isOpen) return null;

  const handleClose = () => {
    setView('main');
    onClose();
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

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">아이디</p>
                  <p className="text-sm font-bold text-[#111827]">{username || '알 수 없음'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Chrome 확장 프로그램</p>
                <div className="flex items-center gap-2">
                  <a
                    href="/instalog-extension.zip"
                    download
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>프로그램 설치</span>
                  </a>
                  <button
                    onClick={() => setView('guide')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>설치 가이드</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>InstaLog v{APP_VERSION}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors text-sm font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
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
              <p className="mt-4 text-xs font-bold text-black">인스타그램 DM 발송 내역 자동 기록을 시작합니다.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
