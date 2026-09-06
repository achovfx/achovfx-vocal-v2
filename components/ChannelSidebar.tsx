'use client';

import React from 'react';
import {
  Radio,
  Gamepad2,
  Headphones,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Settings,
  Users,
  Sparkles,
} from 'lucide-react';
import { RoomChannel, UserProfile, VoiceParticipant, ConnectionQuality } from '@/lib/types';
import { ConnectionQualityIndicator } from '@/components/ConnectionQualityIndicator';

interface ChannelSidebarProps {
  currentRoomId: string;
  channels: RoomChannel[];
  currentUser: UserProfile;
  connectedRoomId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  participants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
  localAudioLevel: number;
  connectionQuality?: ConnectionQuality;
  onSelectChannel: (roomId: string) => void;
  onConnectVoice: (roomId: string) => void;
  onDisconnectVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenProfileSettings: () => void;
}

export function ChannelSidebar({
  currentRoomId,
  channels,
  currentUser,
  connectedRoomId,
  isConnected,
  isConnecting,
  participants,
  isMuted,
  isDeafened,
  localAudioLevel,
  connectionQuality,
  onSelectChannel,
  onConnectVoice,
  onDisconnectVoice,
  onToggleMute,
  onToggleDeafen,
  onOpenProfileSettings,
}: ChannelSidebarProps) {
  const getChannelIcon = (category: string) => {
    switch (category) {
      case 'gaming':
        return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      case 'lounge':
        return <Headphones className="w-4 h-4 text-violet-400" />;
      default:
        return <Radio className="w-4 h-4 text-indigo-400" />;
    }
  };

  const connectedChannel = channels.find((c) => c.id === connectedRoomId);

  return (
    <aside
      id="channel-sidebar"
      className="w-full md:w-72 lg:w-80 flex flex-col h-full bg-slate-950/70 border-r border-white/5 backdrop-blur-2xl overflow-hidden select-none"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              Vocalis <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">WebRTC</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              چت صوتی و متنی آنلاین
            </p>
          </div>
        </div>

        <button
          id="btn-sidebar-settings"
          onClick={onOpenProfileSettings}
          title="تنظیمات پروفایل و صدا"
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Voice Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        <div className="text-[11px] font-semibold text-slate-400 px-2 pt-1 pb-1 tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>کانال‌های صوتی (۳ کانال)</span>
          </span>
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-400 font-mono">
            {channels.length} چنل
          </span>
        </div>

        <div className="space-y-1.5">
          {channels.map((channel) => {
            const isSelected = channel.id === currentRoomId;
            const isVoiceHere = isConnected && connectedRoomId === channel.id;

            return (
              <div
                key={channel.id}
                className={`rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-md shadow-indigo-500/5'
                    : 'bg-white/[0.02] hover:bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                {/* Channel Header row */}
                <div
                  id={`channel-btn-${channel.id}`}
                  onClick={() => onSelectChannel(channel.id)}
                  className="p-3 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isVoiceHere
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-900 text-slate-400 border border-white/5 group-hover:border-indigo-500/30'
                      }`}
                    >
                      {getChannelIcon(channel.category)}
                    </div>
                    <div className="truncate text-right">
                      <p className="text-xs font-semibold truncate group-hover:text-indigo-300 transition-colors">
                        {channel.nameFa || channel.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {channel.description || channel.name}
                      </p>
                    </div>
                  </div>

                  {/* Connect / Connected status button */}
                  {isVoiceHere ? (
                    <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      در ویس
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChannel(channel.id);
                        onConnectVoice(channel.id);
                      }}
                      disabled={isConnecting}
                      title="اتصال به این ویس چنل"
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-600 hover:text-white text-slate-400 border border-white/10 transition-all active:scale-95 disabled:opacity-40"
                    >
                      اتصال
                    </button>
                  )}
                </div>

                {/* If connected to this channel: list active participants */}
                {isVoiceHere && participants.length > 0 && (
                  <div className="px-3 pb-2.5 pt-1 border-t border-white/5 space-y-1">
                    <p className="text-[10px] text-slate-400 font-medium mb-1">
                      اعضای حاضر در ویس ({participants.length}):
                    </p>
                    <div className="space-y-1">
                      {participants.map((p) => {
                        const isSpeaking =
                          p.isSpeaking || (p.id === currentUser.id && localAudioLevel > 12 && !isMuted && !isDeafened);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-black/20"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSpeaking
                                    ? 'bg-emerald-400 ring-4 ring-emerald-400/30 animate-pulse'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="truncate text-slate-200">
                                {p.name} {p.id === currentUser.id && '(شما)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                              {p.isDeafened && <VolumeX className="w-3 h-3 text-red-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Voice Controls Dock (when connected to voice) */}
      {isConnected && connectedChannel && (
        <div className="p-3 bg-emerald-950/20 border-t border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-emerald-300 truncate max-w-[130px]">
                    {connectedChannel.nameFa || connectedChannel.name}
                  </p>
                  {connectionQuality && (
                    <ConnectionQualityIndicator
                      quality={connectionQuality}
                      isConnected={isConnected}
                    />
                  )}
                </div>
                <p className="text-[10px] text-emerald-400/70">
                  اتصال زنده P2P WebRTC
                </p>
              </div>
            </div>

            <button
              onClick={onDisconnectVoice}
              title="قطع اتصال از ویس"
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Controls row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleMute}
              className={`py-1.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 font-medium border transition-colors ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'میکروفون بسته' : 'میکروفون باز'}</span>
            </button>

            <button
              onClick={onToggleDeafen}
              className={`py-1.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 font-medium border transition-colors ${
                isDeafened
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isDeafened ? 'ناشنوا' : 'صدا فعال'}</span>
            </button>
          </div>
        </div>
      )}

      {/* User Profile Badge Footer */}
      <div className="p-3 border-t border-white/5 bg-slate-950/60 flex items-center justify-between">
        <button
          onClick={onOpenProfileSettings}
          className="flex items-center gap-2.5 text-right hover:opacity-90 transition-opacity"
          title="تغییر نام و رنگ پروفایل"
        >
          <div
            suppressHydrationWarning
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 border-indigo-400 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${currentUser.color || '#6366f1'} 0%, #020617 100%)`,
            }}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate text-right">
            <p suppressHydrationWarning className="text-xs font-semibold text-white truncate max-w-[130px]">
              {currentUser.name}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>آنلاین در سامانه</span>
            </div>
          </div>
        </button>

        <button
          onClick={onOpenProfileSettings}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="تنظیمات"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
