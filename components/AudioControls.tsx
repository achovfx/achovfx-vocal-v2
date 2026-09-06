'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Settings,
  Sparkles,
  Volume2,
  Copy,
  Check,
} from 'lucide-react';
import { GlassCard } from './glass/GlassCard';
import { playSound } from '@/lib/sounds';

interface AudioControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  localAudioLevel: number;
  channelName: string;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
  onOpenSettings: () => void;
}

export function AudioControls({
  isConnected,
  isMuted,
  isDeafened,
  localAudioLevel,
  channelName,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
  onOpenSettings,
}: AudioControlsProps) {
  const [copied, setCopied] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      playSound('ping');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const soundboardItems = [
    { name: 'اعلان صوتی (Chime)', type: 'chime' as const, icon: '🔔' },
    { name: 'صدای پینگ (Ping)', type: 'ping' as const, icon: '✨' },
    { name: 'خوش‌آمد (Join)', type: 'join' as const, icon: '🎉' },
    { name: 'خروج (Leave)', type: 'leave' as const, icon: '🚪' },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4">
      {/* Soundboard Popover */}
      {showSoundboard && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <GlassCard variant="default" className="p-3 shadow-2xl border-cyan-500/20 w-72">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                ساندبورد و افکت صوتی
              </span>
              <button
                onClick={() => setShowSoundboard(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {soundboardItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    playSound(item.type);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-xs text-slate-200 flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Main Glass Control Bar */}
      <footer
        id="audio-controls-bar"
        className="w-full h-20 bg-slate-950/80 border-t border-white/5 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 md:px-8 rounded-2xl border border-white/10 shadow-2xl"
      >
        {/* Connection status & metrics info */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ping</span>
            <span className="text-xs sm:text-sm text-emerald-400 font-mono flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {isConnected ? '24ms' : 'Offline'}
            </span>
          </div>
          <div className="w-px h-7 bg-white/10 hidden sm:block" />
          <div className="flex flex-col min-w-0 hidden xs:flex">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
              {channelName || 'Voice Studio'}
            </span>
            <span className="text-xs text-slate-300 font-medium truncate">
              WebRTC / FreeBridge
            </span>
          </div>

          {/* Voice input activity bar */}
          {isConnected && !isMuted && !isDeafened && (
            <div className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
              <div
                className="h-full bg-indigo-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(5, localAudioLevel))}%` }}
              />
            </div>
          )}
        </div>

        {/* Center Primary Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute / Unmute Button */}
          <button
            id="btn-toggle-mic"
            onClick={onToggleMute}
            disabled={!isConnected}
            title={isMuted ? 'فعال‌سازی میکروفون (Unmute)' : 'قطع میکروفون (Mute)'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
              isMuted
                ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Deafen Button (Mutes headset & mic) */}
          <button
            id="btn-toggle-deafen"
            onClick={onToggleDeafen}
            disabled={!isConnected}
            title={isDeafened ? 'فعال‌سازی صدا (Undeafen)' : 'قطع کل صدا (Deafen)'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
              isDeafened
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Headphones className="w-5 h-5" />
          </button>

          {/* Leave Call Button */}
          {isConnected && (
            <button
              id="btn-disconnect-voice"
              onClick={onDisconnect}
              title="Leave Call"
              className="px-5 sm:px-7 h-11 sm:h-12 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full font-bold hover:bg-rose-500 hover:text-white transition-all text-xs sm:text-sm flex items-center gap-2 active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave Call</span>
            </button>
          )}
        </div>

        {/* Right side utility buttons: Soundboard, Link copy, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Soundboard */}
          <button
            id="btn-soundboard"
            onClick={() => setShowSoundboard(!showSoundboard)}
            title="Sound Effects"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 flex items-center justify-center transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Share room invite */}
          <button
            id="btn-copy-room-link"
            onClick={copyRoomLink}
            title="Invite Link"
            className="h-9 sm:h-10 px-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 flex items-center gap-1.5 transition-all text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 hidden md:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Invite</span>
              </>
            )}
          </button>

          {/* Studio info */}
          <div className="text-right hidden lg:block">
            <p className="text-xs font-semibold text-slate-200">Vocalis Studio</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Next.js FreeBridge</p>
          </div>

          {/* Settings modal */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            title="Audio Settings"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
