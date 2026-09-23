import React from 'react';
import { DmStatus } from '../types';

export interface StatusCounts {
  all: number;
  list_up: number;
  waiting: number;
  in_talks: number;
  confirmed: number;
  rejected: number;
}

interface StatusFilterBarProps {
  value: 'all' | DmStatus;
  onChange: (status: 'all' | DmStatus) => void;
  counts: StatusCounts;
}

const PILLS: {
  status: 'all' | DmStatus;
  label: string;
  dotClass: string | null;
  activeClass: string;
  countKey: keyof StatusCounts;
}[] = [
  { status: 'all', label: '전체', dotClass: null, activeClass: 'bg-[#00c73c] text-white shadow-sm border-[#00c73c]', countKey: 'all' },
  { status: 'list_up', label: '리스트업', dotClass: 'bg-purple-500', activeClass: 'bg-purple-600 text-white shadow-sm border-purple-600', countKey: 'list_up' },
  { status: 'waiting', label: '회신 대기', dotClass: 'bg-blue-500', activeClass: 'bg-blue-600 text-white shadow-sm border-blue-600', countKey: 'waiting' },
  { status: 'in_talks', label: '소통 중', dotClass: 'bg-amber-500', activeClass: 'bg-amber-500 text-white shadow-sm border-amber-500', countKey: 'in_talks' },
  { status: 'confirmed', label: '협업 성사', dotClass: 'bg-emerald-500', activeClass: 'bg-emerald-600 text-white shadow-sm border-emerald-600', countKey: 'confirmed' },
  { status: 'rejected', label: '거절', dotClass: 'bg-rose-500', activeClass: 'bg-rose-500 text-white shadow-sm border-rose-500', countKey: 'rejected' },
];

export function computeStatusCounts(logs: { status: DmStatus }[]): StatusCounts {
  return {
    all: logs.length,
    list_up: logs.filter((l) => l.status === 'list_up').length,
    waiting: logs.filter((l) => l.status === 'waiting' || l.status === '').length,
    in_talks: logs.filter((l) => l.status === 'in_talks').length,
    confirmed: logs.filter((l) => l.status === 'confirmed').length,
    rejected: logs.filter((l) => l.status === 'rejected').length,
  };
}

export const StatusFilterBar: React.FC<StatusFilterBarProps> = ({ value, onChange, counts }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PILLS.map(({ status, label, dotClass, activeClass, countKey }) => {
        const isActive = value === status;
        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isActive ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>}
            <span>{label}</span>
            <span
              className={`text-[13.2px] px-1.5 py-0.2 rounded-full ${
                status === 'all' && isActive ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts[countKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
