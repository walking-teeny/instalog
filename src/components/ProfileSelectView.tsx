import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getProfiles, addProfile } from '../api';

interface ProfileSelectViewProps {
  onSelect: (name: string) => void;
}

export const ProfileSelectView: React.FC<ProfileSelectViewProps> = ({ onSelect }) => {
  const [profiles, setProfiles] = useState(getProfiles);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  // Another tab may have added/deleted a profile since this list was read; pick that up
  // instead of risking this screen's next add overwriting it with a stale copy.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'instalog_profiles') setProfiles(getProfiles());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name || profiles.some((p) => p.name === name)) return;
    setProfiles([...profiles, addProfile(name)]);
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-10">
        <h1 className="text-xl font-black text-[#111827]">프로필을 선택하세요</h1>
        <p className="text-xs text-slate-400 -mt-8">
          본부 OS와의 안정적인 데이터 연동을 위해, 반드시 본인의 프로필을 선택해주세요!
          <br />
          본인의 프로필이 없다면 새 프로필을 추가하세요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {profiles.map((p) => (
            <button
              key={p.name}
              onClick={() => onSelect(p.name)}
              className="group flex flex-col items-center gap-3 cursor-pointer"
            >
              {p.avatar ? (
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-2 ring-transparent group-hover:ring-offset-2 transition-all"
                  style={{ ['--tw-ring-color' as any]: p.color }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-sm ring-2 ring-transparent group-hover:ring-offset-2 transition-all"
                  style={{ backgroundColor: p.color, ['--tw-ring-color' as any]: p.color }}
                >
                  {p.name.slice(0, 1)}
                </div>
              )}
              <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                {p.name}
              </span>
            </button>
          ))}

          <button
            onClick={() => setIsAdding(true)}
            className="group flex flex-col items-center gap-3 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-emerald-400 group-hover:text-emerald-500 transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
              프로필 추가
            </span>
          </button>
        </div>

        {isAdding && (
          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              placeholder="닉네임을 입력하세요. (수정 불가)"
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
