'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceParticipant, UserProfile, ConnectionQuality, ConnectionQualityLevel } from '@/lib/types';
import { playSound } from '@/lib/sounds';

interface UseVoiceChatOptions {
  roomId: string;
  currentUser: UserProfile;
  engine: 'webrtc-mesh' | 'jitsi-cloud';
}

export function useVoiceChat({ roomId, currentUser, engine }: UseVoiceChatOptions) {
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

  // References
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerInstanceRef = useRef<any>(null);
  const myPeerIdRef = useRef<string>('');
  const callsRef = useRef<Map<string, any>>(new Map()); // peerId -> call
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map()); // participantId -> audio
  const localAudioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qualityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Measure WebRTC stream quality from active RTCPeerConnections
  const updateConnectionQuality = useCallback(async () => {
    if (!peerInstanceRef.current || peerInstanceRef.current.destroyed) {
      setConnectionQuality({ level: 'disconnected' });
      return;
    }

    // If connected to voice room without other participants yet, WebRTC signaling is healthy
    if (callsRef.current.size === 0) {
      setConnectionQuality({
        level: 'good',
        rtt: undefined,
        packetLoss: 0,
        jitter: 0,
      });
      return;
    }

    let totalRtt = 0;
    let rttCount = 0;
    let totalLoss = 0;
    let lossCount = 0;
    let totalJitter = 0;
    let jitterCount = 0;
    let failedConnections = 0;

    for (const call of callsRef.current.values()) {
      const pc = call?.peerConnection as RTCPeerConnection | undefined;
      if (!pc) continue;

      if (
        pc.connectionState === 'failed' ||
        pc.iceConnectionState === 'failed' ||
        pc.connectionState === 'disconnected'
      ) {
        failedConnections++;
        continue;
      }

      try {
        const stats = await pc.getStats();
        stats.forEach((report: any) => {
          // Candidate pair round trip time
          if (
            (report.type === 'candidate-pair' || report.type === 'remote-candidate') &&
            (report.state === 'succeeded' || report.nominated === true)
          ) {
            const rttVal = report.currentRoundTripTime ?? report.roundTripTime;
            if (typeof rttVal === 'number' && !isNaN(rttVal) && rttVal > 0) {
              totalRtt += rttVal * 1000;
              rttCount++;
            }
          }

          // Inbound audio RTP stats
          if (
            report.type === 'inbound-rtp' &&
            (report.kind === 'audio' || report.mediaType === 'audio')
          ) {
            if (typeof report.jitter === 'number' && !isNaN(report.jitter)) {
              totalJitter += report.jitter * 1000;
              jitterCount++;
            }
            if (
              typeof report.packetsLost === 'number' &&
              typeof report.packetsReceived === 'number'
            ) {
              const totalPackets = report.packetsLost + report.packetsReceived;
              if (totalPackets > 0) {
                const lossRate = (report.packetsLost / totalPackets) * 100;
                totalLoss += lossRate;
                lossCount++;
              }
            }
          }
        });
      } catch {}
    }

    if (failedConnections > 0 && rttCount === 0) {
      setConnectionQuality({
        level: 'poor',
        packetLoss: 100,
      });
      return;
    }

    const avgRtt = rttCount > 0 ? Math.round(totalRtt / rttCount) : undefined;
    const avgLoss = lossCount > 0 ? Math.round((totalLoss / lossCount) * 10) / 10 : 0;
    const avgJitter = jitterCount > 0 ? Math.round(totalJitter / jitterCount) : undefined;

    let level: ConnectionQualityLevel = 'good';
    if (avgLoss > 6 || (avgRtt !== undefined && avgRtt > 280)) {
      level = 'poor';
    } else if (avgLoss > 1.8 || (avgRtt !== undefined && avgRtt > 140)) {
      level = 'fair';
    } else {
      level = 'good';
    }

    setConnectionQuality({
      level,
      rtt: avgRtt,
      packetLoss: avgLoss,
      jitter: avgJitter,
    });
  }, []);

  // Helper to attach remote audio stream
  const attachRemoteAudio = useCallback((id: string, stream: MediaStream) => {
    let audio = remoteAudioElsRef.current.get(id);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.id = `audio-remote-${id}`;
      document.body.appendChild(audio);
      remoteAudioElsRef.current.set(id, audio);
    }
    audio.srcObject = stream;
    audio.volume = isDeafened ? 0 : 1.0;
    audio.play().catch(() => {});
  }, [isDeafened]);

  const detachRemoteAudio = useCallback((id: string) => {
    const audio = remoteAudioElsRef.current.get(id);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      remoteAudioElsRef.current.delete(id);
    }
  }, []);

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

    // 4. Close all active WebRTC calls
    callsRef.current.forEach((call) => {
      try {
        call.close();
      } catch {}
    });
    callsRef.current.clear();

    // 5. Remove remote audio elements
    remoteAudioElsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    remoteAudioElsRef.current.clear();

    // 6. Destroy Peer instance
    if (peerInstanceRef.current) {
      try {
        peerInstanceRef.current.destroy();
      } catch {}
      peerInstanceRef.current = null;
    }

    // 7. Clear heartbeat and quality monitors
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
    setConnectionQuality({ level: 'disconnected' });

    // 8. Inform Next.js server of exit
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
      // 1. Get microphone audio stream
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

      // 2. Setup AudioContext and AnalyserNode for volume meter
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

      // 3. Setup volume analysis loop
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

        // Speaking threshold
        const speaking = normalized > 12 && !isMuted && !isDeafened;
        if (speaking !== isSpeakingRef.current) {
          isSpeakingRef.current = speaking;
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();

      // If in WebRTC mesh mode, connect via PeerJS
      if (engine === 'webrtc-mesh') {
        const { Peer } = await import('peerjs');

        // Deterministic unique peer ID
        const peerId = `voice-${roomId}-${currentUser.id}-${Math.random().toString(36).substring(2, 6)}`;
        myPeerIdRef.current = peerId;

        const peer = new Peer(peerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });

        peerInstanceRef.current = peer;

        // Handle incoming calls
        peer.on('call', (call: any) => {
          call.answer(stream);
          callsRef.current.set(call.peer, call);

          call.on('stream', (remoteStream: MediaStream) => {
            attachRemoteAudio(call.peer, remoteStream);
          });

          call.on('close', () => {
            detachRemoteAudio(call.peer);
          });
        });

        peer.on('error', (err: any) => {
          console.warn('PeerJS event:', err?.type || err);
        });

        await new Promise<void>((resolve) => {
          peer.on('open', () => resolve());
          setTimeout(() => resolve(), 3000);
        });
      }

      // 4. Register presence with Next.js server
      const localParticipant: VoiceParticipant = {
        id: currentUser.id,
        peerId: myPeerIdRef.current || currentUser.id,
        name: currentUser.name,
        color: currentUser.color,
        avatarSeed: currentUser.avatarSeed,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volume: 100,
        lastActive: Date.now(),
        engine,
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

          // In mesh mode: call all other existing peers
          if (engine === 'webrtc-mesh' && peerInstanceRef.current) {
            data.participants.forEach((remote: VoiceParticipant) => {
              if (
                remote.id !== currentUser.id &&
                remote.peerId &&
                !callsRef.current.has(remote.peerId)
              ) {
                try {
                  const call = peerInstanceRef.current.call(remote.peerId, stream);
                  if (call) {
                    callsRef.current.set(remote.peerId, call);
                    call.on('stream', (remoteStream: MediaStream) => {
                      attachRemoteAudio(remote.id, remoteStream);
                    });
                    call.on('close', () => {
                      detachRemoteAudio(remote.id);
                    });
                  }
                } catch (e) {
                  console.warn('Call error to peer:', remote.peerId, e);
                }
              }
            });
          }
        }
      }

      // 5. Start presence heartbeat every 4 seconds
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
                engine,
              },
              action: 'heartbeat',
            }),
          });

          if (hbRes.ok) {
            const hbData = await hbRes.json();
            if (Array.isArray(hbData.participants)) {
              setParticipants(hbData.participants);

              // Auto-connect to any new peers that arrived
              if (engine === 'webrtc-mesh' && peerInstanceRef.current && localStreamRef.current) {
                hbData.participants.forEach((remote: VoiceParticipant) => {
                  if (
                    remote.id !== currentUser.id &&
                    remote.peerId &&
                    !callsRef.current.has(remote.peerId)
                  ) {
                    try {
                      const call = peerInstanceRef.current.call(
                        remote.peerId,
                        localStreamRef.current
                      );
                      if (call) {
                        callsRef.current.set(remote.peerId, call);
                        call.on('stream', (remoteStream: MediaStream) => {
                          attachRemoteAudio(remote.id, remoteStream);
                        });
                      }
                    } catch {}
                  }
                });
              }
            }
          }
        } catch {}
      }, 4000);

      setIsConnected(true);
      playSound('join');

      // Start connection quality check
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = setInterval(updateConnectionQuality, 2500);
      updateConnectionQuality();
    } catch (err) {
      console.error('Failed to connect to microphone/voice:', err);
      alert('دسترسی به میکروفون در مرورگر داده نشد یا خطایی رخ داد.');
    } finally {
      setIsConnecting(false);
    }
  }, [
    isConnected,
    isConnecting,
    currentUser,
    roomId,
    engine,
    isMuted,
    isDeafened,
    attachRemoteAudio,
    detachRemoteAudio,
    updateConnectionQuality,
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

    // When deafened, mute local mic as well
    if (nextDeafened && !isMuted) {
      toggleMute();
    }

    // Set all remote audio streams volume to 0 if deafened, restore to 1 if undeafened
    remoteAudioElsRef.current.forEach((audioEl) => {
      audioEl.volume = nextDeafened ? 0 : 1.0;
    });

    playSound(nextDeafened ? 'mute' : 'unmute');
  }, [isDeafened, isMuted, toggleMute]);

  // Adjust individual participant volume
  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, volume } : p))
    );

    const audioEl = remoteAudioElsRef.current.get(participantId);
    if (audioEl) {
      audioEl.volume = isDeafened ? 0 : Math.max(0, Math.min(1.5, volume / 100));
    }
  }, [isDeafened]);

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
  };
}
