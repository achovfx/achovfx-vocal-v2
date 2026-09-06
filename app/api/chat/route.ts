import { NextRequest, NextResponse } from 'next/server';
import { getRoomMessages, addRoomMessage, updateMessageReaction } from '@/lib/serverState';
import { ChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') || 'general-voice';
  const since = searchParams.get('since');

  const allMessages = getRoomMessages(roomId);

  if (since) {
    const sinceTimestamp = parseInt(since, 10);
    if (!isNaN(sinceTimestamp)) {
      const filtered = allMessages.filter(m => m.timestamp > sinceTimestamp);
      return NextResponse.json({ messages: filtered, total: allMessages.length, timestamp: Date.now() });
    }
  }

  return NextResponse.json({
    messages: allMessages,
    total: allMessages.length,
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a reaction update
    if (body.action === 'reaction') {
      const { roomId, messageId, emoji, userId } = body;
      if (!roomId || !messageId || !emoji || !userId) {
        return NextResponse.json({ error: 'Missing reaction parameters' }, { status: 400 });
      }
      const success = updateMessageReaction(roomId, messageId, emoji, userId);
      return NextResponse.json({ success });
    }

    // Normal chat message
    const { roomId, userId, userName, userColor, avatarSeed, content, type } = body;

    if (!roomId || !content || !userName) {
      return NextResponse.json({ error: 'Missing message fields' }, { status: 400 });
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      roomId: String(roomId),
      userId: String(userId || 'anonymous'),
      userName: String(userName).slice(0, 32),
      userColor: String(userColor || '#6366f1'),
      avatarSeed: String(avatarSeed || userName),
      content: String(content).slice(0, 1000),
      timestamp: Date.now(),
      type: type || 'text',
      reactions: {},
    };

    const saved = addRoomMessage(newMessage);

    return NextResponse.json({ success: true, message: saved });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
