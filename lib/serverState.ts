import { ChatMessage, VoiceParticipant, RoomChannel } from './types';

// Global in-memory storage for Next.js server
// In serverless / node environment, globalThis retains state across requests in the warm container
declare global {
  var __chatMessages: Map<string, ChatMessage[]> | undefined;
  var __voicePresences: Map<string, Map<string, VoiceParticipant>> | undefined;
  var __customRooms: RoomChannel[] | undefined;
}

if (!globalThis.__chatMessages) {
  globalThis.__chatMessages = new Map();
}
if (!globalThis.__voicePresences) {
  globalThis.__voicePresences = new Map();
}
if (!globalThis.__customRooms) {
  globalThis.__customRooms = [];
}

export const defaultChannels: RoomChannel[] = [
  {
    id: 'voice-1',
    name: 'Voice Channel 1',
    nameFa: 'ویس چنل ۱ (عمومی)',
    description: 'گفتگوی صوتی و متنی عمومی',
    icon: 'Radio',
    category: 'voice',
    isDefault: true,
  },
  {
    id: 'voice-2',
    name: 'Voice Channel 2',
    nameFa: 'ویس چنل ۲ (گیمینگ)',
    description: 'اتاق صوتی و متنی اسکواد گیمینگ',
    icon: 'Gamepad2',
    category: 'gaming',
  },
  {
    id: 'voice-3',
    name: 'Voice Channel 3',
    nameFa: 'ویس چنل ۳ (گپ و گفت)',
    description: 'اتاق صوتی و متنی دوستانه و استراحت',
    icon: 'Headphones',
    category: 'lounge',
  },
];

export function getRoomMessages(roomId: string): ChatMessage[] {
  const store = globalThis.__chatMessages!;
  if (!store.has(roomId)) {
    // Add welcome message for new room
    store.set(roomId, [
      {
        id: `sys-welcome-${roomId}`,
        roomId,
        userId: 'system',
        userName: 'VoiceBot',
        userColor: '#10b981',
        avatarSeed: 'system',
        content: '👋 خوش آمدید به اتاق گفتگو! چت متنی مستقیماً از طریق سرور Next.js پردازش می‌شود و ویس‌چت از پروتکل‌های ابری رایگان پشتیبانی می‌کند.',
        timestamp: Date.now() - 5000,
        type: 'system',
      },
    ]);
  }
  return store.get(roomId) || [];
}

export function addRoomMessage(message: ChatMessage): ChatMessage {
  const store = globalThis.__chatMessages!;
  const msgs = getRoomMessages(message.roomId);
  msgs.push(message);
  // Keep last 250 messages per room to prevent memory bloat
  if (msgs.length > 250) {
    msgs.splice(0, msgs.length - 250);
  }
  store.set(message.roomId, msgs);
  return message;
}

export function updateMessageReaction(roomId: string, messageId: string, emoji: string, userId: string): boolean {
  const msgs = getRoomMessages(roomId);
  const msg = msgs.find(m => m.id === messageId);
  if (!msg) return false;
  if (!msg.reactions) msg.reactions = {};
  const currentUsers = msg.reactions[emoji] || [];
  if (currentUsers.includes(userId)) {
    // toggle off
    msg.reactions[emoji] = currentUsers.filter(u => u !== userId);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    // toggle on
    msg.reactions[emoji] = [...currentUsers, userId];
  }
  return true;
}

// Presence store: roomId -> Map<userId, VoiceParticipant>
export function updatePresence(roomId: string, participant: VoiceParticipant): VoiceParticipant[] {
  const presences = globalThis.__voicePresences!;
  if (!presences.has(roomId)) {
    presences.set(roomId, new Map());
  }
  const roomMap = presences.get(roomId)!;
  roomMap.set(participant.id, {
    ...participant,
    lastActive: Date.now(),
  });

  // Clean up inactive users (no heartbeat in 15 seconds)
  const now = Date.now();
  for (const [id, user] of roomMap.entries()) {
    if (now - user.lastActive > 15000) {
      roomMap.delete(id);
    }
  }

  return Array.from(roomMap.values());
}

export function removePresence(roomId: string, participantId: string): VoiceParticipant[] {
  const presences = globalThis.__voicePresences!;
  const roomMap = presences.get(roomId);
  if (roomMap) {
    roomMap.delete(participantId);
    return Array.from(roomMap.values());
  }
  return [];
}

export function getActiveParticipants(roomId: string): VoiceParticipant[] {
  const presences = globalThis.__voicePresences!;
  const roomMap = presences.get(roomId);
  if (!roomMap) return [];
  const now = Date.now();
  for (const [id, user] of roomMap.entries()) {
    if (now - user.lastActive > 15000) {
      roomMap.delete(id);
    }
  }
  return Array.from(roomMap.values());
}

export function getAllRooms(): RoomChannel[] {
  return [...defaultChannels];
}

export function createCustomRoom(room: RoomChannel): RoomChannel {
  if (!globalThis.__customRooms) {
    globalThis.__customRooms = [];
  }
  globalThis.__customRooms.push(room);
  return room;
}
