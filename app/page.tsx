'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Users, Share2, Check, Settings, MessageSquare } from 'lucide-react';
import { RoomChannel, UserProfile } from '@/lib/types';
import { ChannelSidebar } from '@/components/ChannelSidebar';
import { TextChatPanel } from '@/components/TextChatPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { ConnectionQualityIndicator } from '@/components/ConnectionQualityIndicator';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { defaultChannels } from '@/lib/serverState';
import { useUserProfile } from '@/lib/userProfile';

export default function Home() {
  // Current user state (hydrated safely with useSyncExternalStore)
  const [currentUser, handleSaveProfile] = useUserProfile();

  // Exactly 3 channels
  const [channels, setChannels] = useState<RoomChannel[]>(defaultChannels);
  const [currentRoomId, setCurrentRoomId] = useState<string>('voice-1');
  const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch rooms list from Next.js server
  useEffect(() => {
    let isMounted = true;
    const loadRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.rooms) && data.rooms.length > 0) {
            setChannels(data.rooms);
          }
        }
      } catch {}
    };

    loadRooms();
    const interval = setInterval(loadRooms, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Voice Chat Hook (WebRTC mesh - Zero external keys or env required)
  const {
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    participants,
    localAudioLevel,
    connectVoice,
    disconnectVoice,
    toggleMute,
    toggleDeafen,
    connectionQuality,
  } = useVoiceChat({
    roomId: connectedRoomId || currentRoomId,
    currentUser,
    engine: 'webrtc-mesh',
  });

  // Update connectedRoomId on connection state changes
  const handleConnectToVoice = async (targetRoomId?: string) => {
    const target = targetRoomId || currentRoomId;
    if (isConnected && connectedRoomId !== target) {
      await disconnectVoice();
    }
    setConnectedRoomId(target);
    await connectVoice();
  };

  const handleDisconnectVoice = async () => {
    await disconnectVoice();
    setConnectedRoomId(null);
  };

  // Current selected room details
  const currentRoom = channels.find((c) => c.id === currentRoomId) || channels[0];

  // Hotkeys support (M = mute, D = deafen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        if (isConnected) toggleMute();
      } else if (e.key === 'd' || e.key === 'D') {
        if (isConnected) toggleDeafen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, toggleMute, toggleDeafen]);

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#020617] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Subtle Ambient Radial Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 h-14 px-4 sm:px-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-slate-950/40">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            title="کانال‌ها"
          >
            <Radio className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Vocalis <span className="text-indigo-400 font-medium">Chat</span>
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-mono">
            {currentRoom?.nameFa || currentRoom?.name}
          </span>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ویس فعال ({participants.length} نفر)</span>
              <ConnectionQualityIndicator
                quality={connectionQuality}
                isConnected={isConnected}
                showPingText={true}
              />
            </div>
          )}

          <button
            id="btn-top-share"
            onClick={copyShareLink}
            title="کپی لینک اشتراک‌گذاری"
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">کپی شد</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>اشتراک‌گذاری</span>
              </>
            )}
          </button>

          <button
            id="btn-top-settings"
            onClick={() => setIsSettingsOpen(true)}
            title="تنظیمات کاربر"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden p-2 sm:p-3 gap-3">
        {/* Left: 3 Channels Sidebar */}
        <div
          className={`fixed inset-y-14 left-0 z-30 md:static md:inset-auto md:z-auto transition-transform ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <ChannelSidebar
            currentRoomId={currentRoomId}
            channels={channels}
            currentUser={currentUser}
            connectedRoomId={connectedRoomId}
            isConnected={isConnected}
            isConnecting={isConnecting}
            participants={participants}
            isMuted={isMuted}
            isDeafened={isDeafened}
            localAudioLevel={localAudioLevel}
            connectionQuality={connectionQuality}
            onSelectChannel={(roomId) => {
              setCurrentRoomId(roomId);
              setMobileSidebarOpen(false);
            }}
            onConnectVoice={handleConnectToVoice}
            onDisconnectVoice={handleDisconnectVoice}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
            onOpenProfileSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* Mobile backdrop for sidebar */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Main Center Area: The Spacious Text Chat! */}
        <TextChatPanel
          roomId={currentRoomId}
          roomName={currentRoom?.nameFa || currentRoom?.name || 'چنل'}
          roomDescription={currentRoom?.description}
          currentUser={currentUser}
          isConnectedToVoice={isConnected && connectedRoomId === currentRoomId}
          isConnectingVoice={isConnecting}
          voiceParticipants={connectedRoomId === currentRoomId ? participants : []}
          isMuted={isMuted}
          isDeafened={isDeafened}
          localAudioLevel={localAudioLevel}
          connectionQuality={connectionQuality}
          onConnectVoice={() => handleConnectToVoice(currentRoomId)}
          onDisconnectVoice={handleDisconnectVoice}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Settings & Profile Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        currentUser={currentUser}
        onClose={() => setIsSettingsOpen(false)}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
