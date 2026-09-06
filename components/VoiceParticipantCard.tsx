'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Headphones } from 'lucide-react';
import { VoiceParticipant } from '@/lib/types';
import { GlassCard } from './glass/GlassCard';

interface VoiceParticipantCardProps {
  participant: VoiceParticipant;
  isCurrentUser: boolean;
  onVolumeChange?: (newVolume: number) => void;
  onMuteToggle?: () => void;
}

export function VoiceParticipantCard({
  participant,
  isCurrentUser,
  onVolumeChange,
  onMuteToggle,
}: VoiceParticipantCardProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Avatar initials or first 2 chars
  const initials = participant.name ? participant.name.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="relative group min-w-[200px] flex-1 max-w-[280px]">
      {/* Immersive aura glow when speaking */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />
      )}

      <GlassCard
        id={`participant-${participant.id}`}
        variant={participant.isSpeaking ? 'glow' : 'default'}
        className={`relative rounded-[32px] p-6 flex flex-col items-center justify-between transition-all duration-300 ${
          participant.isSpeaking
            ? 'border-indigo-400/40 shadow-2xl scale-[1.02]'
            : participant.isMuted
            ? 'opacity-80 hover:opacity-100 hover:border-white/20'
            : 'hover:border-white/20'
        }`}
      >
        {/* Speaking Indicator Status Ripple */}
        {participant.isSpeaking && (
          <span className="absolute top-4 right-4 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        )}

        {/* Top bar: Connection type & mute status */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono tracking-wider">
            {participant.engine === 'jitsi-cloud' ? 'JITSI' : 'WEBRTC'}
          </span>
          <div className="flex items-center gap-1">
            {participant.isDeafened && (
              <span
                title="هدفون قطع است"
                className="p-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"
              >
                <Headphones className="w-3 h-3" />
              </span>
            )}
            {participant.isMuted ? (
              <span
                title="میکروفون بسته است"
                className="p-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20"
              >
                <MicOff className="w-3 h-3" />
              </span>
            ) : (
              <span
                title="میکروفون فعال است"
                className={`p-1 rounded-full ${
                  participant.isSpeaking
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                <Mic className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Avatar Container with immersive glowing ring */}
        <div className="relative my-3">
          {participant.isSpeaking && (
            <div className="absolute -inset-2 bg-indigo-500 rounded-full blur animate-pulse opacity-60" />
          )}
          <div
            className={`relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-xl transition-all ${
              participant.isSpeaking
                ? 'border-2 border-indigo-400 ring-4 ring-indigo-500/20'
                : participant.isMuted
                ? 'border-2 border-white/10 opacity-70'
                : 'border-2 border-white/15'
            }`}
            style={{
              background: `linear-gradient(135deg, ${participant.color || '#6366f1'} 0%, #0f172a 100%)`,
            }}
          >
            {initials}
          </div>
        </div>

        {/* Participant Name */}
        <div className="text-center w-full">
          <h3 className="text-base sm:text-lg font-semibold text-white truncate flex items-center justify-center gap-1.5">
            {participant.name}
            {isCurrentUser && (
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-normal">
                YOU
              </span>
            )}
          </h3>

          {/* Equalizer Wave or Status Badge */}
          <div className="flex flex-col items-center justify-center mt-1.5 gap-1">
            {participant.isSpeaking ? (
              <>
                <div className="flex gap-1.5 my-0.5">
                  <div className="h-1 w-6 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="h-1 w-6 bg-indigo-400 rounded-full animate-bounce [animation-delay:75ms]"></div>
                  <div className="h-1 w-6 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                </div>
                <span className="text-[10px] text-indigo-300 font-bold tracking-widest uppercase">
                  Speaking
                </span>
              </>
            ) : participant.isMuted ? (
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
                Muted
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Connected
              </span>
            )}
          </div>
        </div>

        {/* Individual Volume Control for remote peers */}
        {!isCurrentUser && onVolumeChange && (
          <div className="w-full mt-4 pt-3 border-t border-white/5 flex flex-col items-center">
            <button
              id={`btn-vol-toggle-${participant.id}`}
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              {participant.volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>Volume: {participant.volume}%</span>
            </button>

            {showVolumeSlider && (
              <div className="w-full mt-2 flex items-center gap-2 px-1">
                <input
                  id={`slider-vol-${participant.id}`}
                  type="range"
                  min="0"
                  max="150"
                  value={participant.volume}
                  onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
