'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Minimize2,
  Maximize2,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Radio,
  Sparkles,
  Server,
  Users,
  Copy,
  Check,
  Headphones,
} from 'lucide-react';
import { VoiceParticipant, UserProfile, VoiceEngine } from '@/lib/types';

interface VoiceConferenceWidgetProps {
  roomId: string;
  roomNameFa: string;
  currentUser: UserProfile;
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  participants: VoiceParticipant[];
  jitsiUrl: string;
  jitsiRoomName: string;
  engine: VoiceEngine;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onChangeEngine?: (engine: VoiceEngine) => void;
}

export function VoiceConferenceWidget({
  roomId,
  roomNameFa,
  currentUser,
  isConnected,
  isMuted,
  isDeafened,
  participants,
  jitsiUrl,
  jitsiRoomName,
  engine,
  onDisconnect,
  onToggleMute,
  onToggleDeafen,
  onChangeEngine,
}: VoiceConferenceWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isConnected) return null;

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const copyVoiceLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(jitsiUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      id="voice-conference-widget"
      className={`fixed z-40 transition-all duration-300 ${
        isMinimized
          ? 'bottom-4 left-4 right-4 sm:right-auto sm:w-96'
          : 'bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[480px] max-w-full'
      }`}
      dir="rtl"
    >
      <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-950/80 via-slate-900/80 to-slate-950/90 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white truncate max-w-[130px] sm:max-w-[170px]">
                  {roomNameFa}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono hidden sm:inline">
                  {engine === 'jitsi-8x8' ? '8x8 Cloud' : 'Jitsi Meet'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>{participants.length} کاربر حاضر</span>
                <span>•</span>
                <span className="text-emerald-400">اتصال سرور آماده</span>
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1">
            {/* Open in new tab button */}
            <button
              onClick={openInNewTab}
              title="باز کردن در تب اختصاصی (بدون محدودیت دسترسی میکروفون)"
              className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-indigo-200 text-[11px] flex items-center gap-1 transition-all active:scale-95"
            >
              <ExternalLink className="w-3 h-3 text-indigo-300" />
              <span className="hidden sm:inline font-medium">تب جداگانه</span>
            </button>

            {/* Mute button */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'فعال‌سازی میکروفون' : 'قطع میکروفون'}
              className={`p-1.5 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Minimize / Maximize toggle */}
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              title={isMinimized ? 'بزرگ کردن پنجره ویس' : 'کوچک کردن پنجره ویس'}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Disconnect button */}
            <button
              onClick={onDisconnect}
              title="قطع اتصال از ویس چت"
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded View with embedded ready-made audio room */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5">
            {/* Embedded Jitsi Room Frame */}
            <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
              <iframe
                key={iframeKey}
                src={jitsiUrl}
                allow="camera; microphone; display-capture; autoplay; clipboard-write; ambient-light-sensor"
                className="w-full h-full border-0"
                title="Jitsi Meet Ready Voice Room"
              />

              {/* Top overlay hint for best experience */}
              <div className="absolute top-2 right-2 left-2 pointer-events-none flex justify-between items-center z-10">
                <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-slate-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>سایت آماده Jitsi Meet (کاملاً رایگان)</span>
                </div>
              </div>
            </div>

            {/* Quick helper tip & shortcuts */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[11px] text-slate-300">
                  برای بهترین کیفیت صدا و دور زدن محدودیت‌های مرورگر:
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openInNewTab}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>ورود مستقیم در تب جدید</span>
                </button>

                <button
                  onClick={copyVoiceLink}
                  title="کپی لینک اختصاصی اتاق صوتی"
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
