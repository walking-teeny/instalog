import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Project, ProjectType } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newProject: Omit<Project, 'id' | 'totalSent' | 'repliedCount' | 'confirmedCount' | 'createdAt' | 'updatedAt'>) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('협찬');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedTag = `#${name.slice(0, 4).toUpperCase().replace(/\s+/g, '_')}`;

    onCreate({
      name: name.trim(),
      projectType,
      brand: '뷰티 커머스 팀',
      tag: formattedTag,
      status: 'active',
      statusText: '기록 활성',
      iconType: 'sparkles',
      description: description.trim(),
    });

    setName('');
    setProjectType('협찬');
    setDescription('');
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
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00c73c]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">신규 프로젝트 생성</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 프로젝트 이름 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>프로젝트 이름</span>
              <span className="text-emerald-600 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="create-project-name"
                type="text"
                required
                placeholder="예: 24년 가을 신상품 협업 제안"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* 프로젝트 유형 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>프로젝트 유형</span>
            </label>
            <div className="relative">
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00c73c] focus:bg-white transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="공동구매">공동구매</option>
                <option value="협찬">협찬</option>
                <option value="광고">광고</option>
                <option value="기타">기타</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>메모 (선택)</span>
            </label>
            <textarea
              rows={3}
              placeholder="협업 제안 타겟군, 주요 일정, 프로모션 혜택 요약 등..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c73c] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#00c73c] hover:bg-[#00b035] text-white text-xs font-bold shadow-sm shadow-[#00c73c]/30 transition-all cursor-pointer"
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
