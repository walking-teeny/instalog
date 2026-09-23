import { DmStatus, ContactChannel } from './types';

export const DM_STATUS_LABELS: Record<DmStatus, string> = {
  list_up: '리스트업',
  waiting: '회신 대기',
  in_talks: '소통 중',
  confirmed: '협업 성사',
  rejected: '거절',
  '': '회신 대기',
};

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  none: '없음',
  email: '메일',
  inpock: '인포크',
  email_inpock: '메일+인포크',
};

export interface Profile {
  name: string;
  color: string;
  avatar?: string;
}

// ponytail: placeholder seed profiles, swap for real team member names when known.
export const DEFAULT_PROFILES: Profile[] = [
  { name: '티니', color: '#00c73c', avatar: '/avatars/tiger.png' },
  { name: '프로필 2', color: '#6366f1' },
  { name: '게스트', color: '#f59e0b' },
];

// Colors cycled through for profiles added later, via the "+ 프로필 추가" button.
export const PROFILE_COLOR_PALETTE = ['#00c73c', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'];

// Avatar images handed out (randomly, avoiding repeats while any are unused) to profiles
// added via the "+ 프로필 추가" button.
export const AVATAR_POOL = [
  '/avatars/tiger.png',
  '/avatars/polar-bear.png',
  '/avatars/dolphin.png',
  '/avatars/fox.png',
  '/avatars/rabbit.png',
  '/avatars/chick.png',
  '/avatars/cat.png',
  '/avatars/dog.png',
  '/avatars/ghost.png',
  '/avatars/black-cat.png',
  '/avatars/poodle.png',
  '/avatars/hedgehog.png',
];

// 본부 OS에 실제로 존재하는 파이프라인 이름(2026-09-23 확인). 오타로 새 칸이 생기는 걸 막기 위한
// 자동완성 후보일 뿐, 목록에 없는 이름이라도 그대로 입력할 수 있다 — 새 파이프라인이
// 본부 OS에 생기면 이 배열에 한 줄만 추가하면 된다.
export const OS_PIPELINE_OPTIONS = [
  '공동구매 인플루언서 확보',
  '칸디데 | 인플루언서 섭외',
  '키즈데이 | 인플루언서 섭외',
  '관리 인플루언서 확보',
  '브랜드 소싱',
];
