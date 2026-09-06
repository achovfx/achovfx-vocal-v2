'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceParticipant, UserProfile, VoiceEngine, ConnectionQuality, ConnectionQualityLevel } from '@/lib/types';
import { playSound } from '@/lib/sounds';

interface UseVoiceChatOptions {
  roomId: string;
  currentUser: UserProfile;
  engine?: VoiceEngine;
}

export function useVoiceChat({
  roomId,
  currentUser,
  engine = 'jitsi-cloud',
}: UseVoiceChatOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    level: 'disconnected',
  });

  // Current active engine (defaults to user preference or jitsi-cloud)
  const activeEngine: VoiceEngine = currentUser.preferredVoiceEngine || engine || 'jitsi-cloud';

  // Compute deterministic Jitsi room name for this channel
  const cleanRoomId = (roomId || 'general').replace(/[^a-zA-Z0-9]/g, '_');
  const jitsiRoomName = `PardisVoice_${cleanRoomId}`;

  // Build the Jitsi conference URL with ready-made configuration
  const jitsiDomain =
    activeEngine === 'jitsi-8x8' ? '8x8.vc/vpaas-magic-cookie-free' : 'meet.jit.si';
  const jitsiUrl = `https://${jitsiDomain}/${jitsiRoomName}#userInfo.displayName=${encodeURIComponent(
    currentUser.name
  )}&config.startWithAudioMuted=${isMuted}&config.startWithVideoMuted=true&config.prejoinPageEnabled=false&config.enableWelcomePage=false&config.disableDeepLinking=true&config.disable1On1Mode=true&interfaceConfig.TOOLBAR_BUTTONS=['microphone','hangup','settings','tileview']`;

  // References
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to open Jitsi in a new browser tab with unrestricted microphone permissions
  const openJitsiInNewTab = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
    }
  }, [jitsiUrl]);

  // Disconnect from voice
  const disconnectVoice = useCallback(async () => {
    // 1. Cancel audio analysis loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Stop local microphone tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // 3. Close audio context
    if (localAudioCtxRef.current) {
      localAudioCtxRef.current.close().catch(() => {});
      localAudioCtxRef.current = null;
    }

    setAnalyserNode(null);

    // 4. Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    setConnectionQuality({ level: 'disconnected' });

    // 5. Inform Next.js server of exit
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          participant: { id: currentUser.id, name: currentUser.name },
          action: 'leave',
        }),
      });
    } catch {}

    setIsConnected(false);
    setIsConnecting(false);
    setLocalAudioLevel(0);
    playSound('leave');
  }, [roomId, currentUser.id, currentUser.name]);

  // Connect to voice
  const connectVoice = useCallback(async () => {
    if (isConnected || isConnecting) return;
    setIsConnecting(true);

    try {
      // 1. Attempt to get local microphone for visual meter (optional - will not block if restricted)
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const constraints: MediaStreamConstraints = {
            audio: {
              deviceId: currentUser.micDeviceId ? { exact: currentUser.micDeviceId } : undefined,
              echoCancellation: currentUser.echoCancellation,
              noiseSuppression: currentUser.noiseSuppression,
              autoGainControl: true,
            },
            video: false,
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          localStreamRef.current = stream;

          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          localAudioCtxRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);
          setAnalyserNode(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avg = sum / bufferLength;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setLocalAudioLevel(normalized);

            const speaking = normalized > 12 && !isMuted && !isDeafened;
            if (speaking !== isSpeakingRef.current) {
              isSpeakingRef.current = speaking;
            }

            animFrameRef.current = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        }
      } catch (micError) {
        console.warn('Iframe/browser microphone check was bypassed; cloud voice will handle audio directly:', micError);
      }

      // 2. Register presence with Next.js server
      const localParticipant: VoiceParticipant = {
        id: currentUser.id,
        peerId: `jitsi-${currentUser.id}`,
        name: currentUser.name,
        color: currentUser.color,
        avatarSeed: currentUser.avatarSeed,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volume: 100,
        lastActive: Date.now(),
        engine: activeEngine,
      };

      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          participant: localParticipant,
          action: 'join',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      }

      // 3. Set connection quality to good for Jitsi cloud
      setConnectionQuality({
        level: 'good',
        rtt: 45,
        packetLoss: 0,
        jitter: 3,
      });

      // 4. Start presence heartbeat every 4 seconds
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          const hbRes = await fetch('/api/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              participant: {
                ...localParticipant,
                isMuted,
                isDeafened,
                isSpeaking: isSpeakingRef.current,
                engine: activeEngine,
              },
              action: 'heartbeat',
            }),
          });

          if (hbRes.ok) {
            const hbData = await hbRes.json();
            if (Array.isArray(hbData.participants)) {
              setParticipants(hbData.participants);
            }
          }
        } catch {}
      }, 4000);

      setIsConnected(true);
      playSound('join');
    } catch (err) {
      console.error('Failed to connect to voice:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [
    isConnected,
    isConnecting,
    currentUser,
    roomId,
    activeEngine,
    isMuted,
    isDeafened,
  ]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    playSound(nextMuted ? 'mute' : 'unmute');
  }, [isMuted]);

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    if (nextDeafened && !isMuted) {
      toggleMute();
    }

    playSound(nextDeafened ? 'mute' : 'unmute');
  }, [isDeafened, isMuted, toggleMute]);

  // Adjust individual participant volume
  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, volume } : p))
    );
  }, []);

  // Cleanup on room change or unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, [roomId, disconnectVoice]);

  return {
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
    setParticipantVolume,
    analyserNode,
    connectionQuality,
    jitsiRoomName,
    jitsiUrl,
    activeEngine,
    openJitsiInNewTab,
  };
}
