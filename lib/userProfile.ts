'use client';

import { useSyncExternalStore } from 'react';
import { UserProfile } from '@/lib/types';

export const DEFAULT_USER: UserProfile = {
  id: 'user-default',
  name: 'کاربر آنلاین',
  color: '#6366f1',
  avatarSeed: 'default',
  noiseSuppression: true,
  echoCancellation: true,
};

let cachedRaw: string | null = null;
let cachedProfile: UserProfile = DEFAULT_USER;

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('vc-user-update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('vc-user-update', callback);
  };
}

function getClientSnapshot(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem('vc_user_profile');
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      if (raw) {
        cachedProfile = JSON.parse(raw);
      } else {
        const randId = Math.random().toString(36).substring(2, 9);
        const names = ['شاهین', 'آریا', 'سروش', 'امیر', 'سارا', 'نیما', 'پرهام', 'رویا'];
        const colors = ['#6366f1', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        cachedProfile = {
          id: `user-${randId}`,
          name: `${randomName}_${Math.floor(Math.random() * 90 + 10)}`,
          color: randomColor,
          avatarSeed: randId,
          noiseSuppression: true,
          echoCancellation: true,
        };
        localStorage.setItem('vc_user_profile', JSON.stringify(cachedProfile));
      }
    }
  } catch {}
  return cachedProfile;
}

function getServerSnapshot(): UserProfile {
  return DEFAULT_USER;
}

export function useUserProfile(): [UserProfile, (updated: Partial<UserProfile>) => void] {
  const profile = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const updateProfile = (updated: Partial<UserProfile>) => {
    try {
      const next = { ...profile, ...updated };
      cachedRaw = JSON.stringify(next);
      cachedProfile = next;
      localStorage.setItem('vc_user_profile', cachedRaw);
      window.dispatchEvent(new Event('vc-user-update'));
    } catch {}
  };

  return [profile, updateProfile];
}
