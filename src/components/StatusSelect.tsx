import React from 'react';
import { ChevronDown } from 'lucide-react';
import { DmStatus } from '../types';

interface StatusSelectProps {
  status: DmStatus;
  onChange: (status: DmStatus) => void;
}

const STATUS_TEXT_CLASS: Record<DmStatus, string> = {
  confirmed: 'text-emerald-700',
  in_talks: 'text-amber-800',
  rejected: 'text-rose-700',
  list_up: 'text-purple-700',
  waiting: 'text-blue-700',
  '': 'text-blue-700',
};

export const StatusSelect: React.FC<StatusSelectProps> = ({ status, onChange }) => {
  return (
    <div className="relative">
      <select
        value={status || 'waiting'}
        onChange={(e) => onChange(e.target.value as DmStatus)}
        className={`w-full appearance-none text-xs font-bold pl-0 pr-4 py-1 rounded-lg cursor-pointer focus:outline-none ${STATUS_TEXT_CLASS[status]}`}
      >
        <option value="list_up">리스트업</option>
        <option value="waiting">회신 대기</option>
        <option value="in_talks">소통 중</option>
        <option value="confirmed">협업 성사</option>
        <option value="rejected">거절</option>
      </select>
      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
};
