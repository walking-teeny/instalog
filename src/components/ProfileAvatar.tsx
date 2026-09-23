import React from 'react';
import { Profile } from '../constants';

interface ProfileAvatarProps {
  profile: Profile;
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ profile, className = 'w-8 h-8 text-xs' }) => {
  if (profile.avatar) {
    return <img src={profile.avatar} alt={profile.name} className={`${className} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div
      className={`${className} rounded-full flex items-center justify-center text-white font-black shrink-0`}
      style={{ backgroundColor: profile.color }}
    >
      {profile.name.slice(0, 1)}
    </div>
  );
};
