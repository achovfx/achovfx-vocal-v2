import { NextRequest, NextResponse } from 'next/server';
import { updatePresence, removePresence, getActiveParticipants, addRoomMessage } from '@/lib/serverState';
import { VoiceParticipant } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') || 'voice-1';

  const participants = getActiveParticipants(roomId);
  return NextResponse.json({ participants, count: participants.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, participant, action } = body;

    if (!roomId || !participant || !participant.id) {
      return NextResponse.json({ error: 'Invalid presence payload' }, { status: 400 });
    }

    if (action === 'leave') {
      const remaining = removePresence(roomId, participant.id);
      
      // Post system announcement
      if (participant.name) {
        addRoomMessage({
          id: `sys-leave-${Date.now()}`,
          roomId,
          userId: 'system',
          userName: 'System',
          userColor: '#94a3b8',
          avatarSeed: 'system',
          content: `🚪 ${participant.name} از ویس چنل خارج شد.`,
          timestamp: Date.now(),
          type: 'voice-event',
        });
      }

      return NextResponse.json({ success: true, participants: remaining });
    }

    // Join or heartbeat
    const activeList = updatePresence(roomId, participant as VoiceParticipant);

    if (action === 'join') {
      addRoomMessage({
        id: `sys-join-${Date.now()}`,
        roomId,
        userId: 'system',
        userName: 'System',
        userColor: '#10b981',
        avatarSeed: 'system',
        content: `🎙️ ${participant.name} به ویس چنل متصل شد.`,
        timestamp: Date.now(),
        type: 'voice-event',
      });
    }

    return NextResponse.json({ success: true, participants: activeList });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown presence error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
