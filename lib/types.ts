export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  avatarSeed: string;
  content: string;
  timestamp: number;
  type?: 'text' | 'system' | 'voice-event';
  reactions?: Record<string, string[]>; // emoji -> array of userIds
}

export interface VoiceParticipant {
  id: string; // unique participant ID
  peerId: string; // PeerJS peer ID
  name: string;
  color: string;
  avatarSeed: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0 to 100, local volume adjustment
  audioLevel?: number; // 0 to 100 live RMS audio level
  lastActive: number;
  engine?: VoiceEngine;
}

export type VoiceEngine = 'jitsi-cloud' | 'jitsi-8x8' | 'webrtc-mesh';

export type ConnectionQualityLevel = 'good' | 'fair' | 'poor' | 'disconnected';

export interface ConnectionQuality {
  level: ConnectionQualityLevel;
  rtt?: number;
  packetLoss?: number;
  jitter?: number;
}

export interface RoomChannel {
  id: string;
  name: string;
  nameFa: string;
  description: string;
  icon: string;
  category: 'voice' | 'lounge' | 'gaming' | 'focus';
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  color: string;
  avatarSeed: string;
  micDeviceId?: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  preferredVoiceEngine?: VoiceEngine;
}
