'use client';

import React, { useState } from 'react';
import { SignalHigh, SignalMedium, SignalLow, SignalZero } from 'lucide-react';
import { ConnectionQuality } from '@/lib/types';

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  isConnected: boolean;
  className?: string;
  showPingText?: boolean;
}

export function ConnectionQualityIndicator({
  quality,
  isConnected,
  className = '',
  showPingText = false,
}: ConnectionQualityIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isConnected) {
    return null;
  }

  const { level, rtt, packetLoss, jitter } = quality;

  // Visual configuration based on WebRTC stream quality
  const config = {
    good: {
      icon: SignalHigh,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      label: 'کیفیت عالی',
      sublabel: 'WebRTC Direct Stream',
    },
    fair: {
      icon: SignalMedium,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      label: 'کیفیت متوسط',
      sublabel: 'تأخیر قابل قبول',
    },
    poor: {
      icon: SignalLow,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      label: 'کیفیت ضعیف',
      sublabel: 'احتمال افت پکت یا تأخیر بالا',
    },
    disconnected: {
      icon: SignalZero,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10 border-slate-500/20',
      label: 'قطع',
      sublabel: 'بدون سیگنال صوتی',
    },
  }[level] || {
    icon: SignalHigh,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'کیفیت عالی',
    sublabel: 'WebRTC Direct Stream',
  };

  const IconComponent = config.icon;

  return (
    <div
      id="voice-connection-quality-indicator"
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((prev) => !prev)}
      role="status"
      aria-label={`وضعیت سیگنال صوتی: ${config.label}`}
    >
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border transition-all cursor-pointer select-none ${config.bg}`}
      >
        <IconComponent className={`w-3.5 h-3.5 ${config.color} transition-transform duration-300 hover:scale-110`} />
        {showPingText && typeof rtt === 'number' && (
          <span className={`text-[10px] font-mono font-medium ${config.color}`}>
            {rtt}ms
          </span>
        )}
      </div>

      {/* Subtle Tooltip */}
      {showTooltip && (
        <div
          className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 min-w-[160px] p-2 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md text-slate-100 text-right text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-white/5">
            <span className="font-semibold text-[11px] text-white flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${level === 'good' ? 'bg-emerald-400' : level === 'fair' ? 'bg-amber-400' : 'bg-rose-400'}`} />
              {config.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">WebRTC</span>
          </div>

          <div className="space-y-1 text-[10px] text-slate-300">
            {typeof rtt === 'number' ? (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">تأخیر (Ping):</span>
                <span className="font-mono text-emerald-300 font-semibold">{rtt} میلی‌ثانیه</span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">وضعیت استریم:</span>
                <span className="text-emerald-300">اتصال مستقیم آماده</span>
              </div>
            )}

            {typeof packetLoss === 'number' && packetLoss > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">اتلاف بسته:</span>
                <span className={`font-mono ${packetLoss > 5 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {packetLoss}%
                </span>
              </div>
            )}

            {typeof jitter === 'number' && jitter > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">نوسان (Jitter):</span>
                <span className="font-mono text-slate-300">{jitter}ms</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
