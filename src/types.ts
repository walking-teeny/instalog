export type ProjectStatus = 'active' | 'waiting' | 'paused' | 'completed';

export type ProjectType = '공동구매' | '협찬' | '광고' | '기타';

export interface Project {
  id: string;
  name: string;
  projectType: ProjectType;
  brand: string;
  tag: string;
  status: ProjectStatus;
  statusText: string;
  iconType: 'hanger' | 'leaf' | 'sparkles' | 'bag' | 'camera';
  totalSent: number;
  repliedCount: number;
  confirmedCount: number;
  latestLog?: {
    handle: string;
    action: string;
    timeAgo: string;
  };
  createdAt: string;
  description?: string;
}

export type DmStatus = 'waiting' | 'in_talks' | 'confirmed' | 'rejected';

export type ContactChannel = 'none' | 'email' | 'inpock' | 'email_inpock';

export interface DmLog {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  timeAgo: string;
  influencer: {
    handle: string;
    profileUrl: string;
    avatarUrl?: string;
    followers: string;
    verified: boolean;
  };
  status: DmStatus;
  channel: ContactChannel;
  secondMessageSent: boolean;
  memo: string;
}

export interface WidgetSettings {
  isRecording: boolean;
  selectedProjectId: string;
  pairingAccount: string;
  latencyMs: number;
  port: string;
  todayLogsCount: number;
  lastPing: string;
}
