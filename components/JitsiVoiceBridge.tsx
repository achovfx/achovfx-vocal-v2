'use client';

import React from 'react';
import { GlassCard } from './glass/GlassCard';
import { Radio, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

interface JitsiVoiceBridgeProps {
  roomId: string;
  roomName: string;
  userName: string;
}

export function JitsiVoiceBridge({ roomId, roomName, userName }: JitsiVoiceBridgeProps) {
  // Clean Jitsi room name
  const jitsiRoomName = `VoiceChatPro_${roomId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  // Audio-only config flags for Jitsi
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}#userInfo.displayName="${encodeURIComponent(
    userName
  )}"&config.startWithVideoMuted=true&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.enableClosePage=false&config.toolbarButtons=["microphone","hangup","tileview"]`;

  return (
    <GlassCard
      id="jitsi-voice-bridge"
      variant="default"
      className="flex-1 flex flex-col h-full border-white/10 overflow-hidden relative"
    >
      {/* Top Banner */}
      <div className="p-3 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-semibold text-white">
              اتصال ویس گروهی Jitsi Meet Cloud (100% رایگان)
            </h3>
            <p className="text-[10px] text-slate-400">
              کانال: {roomName} • بدون محدودیت تعداد نفرات و بدون نیاز به سرور واسط
            </p>
          </div>
        </div>

        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-cyan-300 flex items-center gap-1 border border-white/10 transition-colors"
          title="باز کردن در تب جدید"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[10px]">باز کردن مستقیم</span>
        </a>
      </div>

      {/* Embedded Iframe */}
      <div className="flex-1 w-full bg-slate-950 relative min-h-[360px]">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Jitsi Free Voice Chat Room"
        />
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-950/80 border-t border-white/10 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          اتصال صوتی مستقیم روی زیرساخت جهانی Jitsi با کیفیت بالا و کاملاً سازگار با Vercel
        </span>
      </div>
    </GlassCard>
  );
}
