import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, createCustomRoom, getActiveParticipants } from '@/lib/serverState';
import { RoomChannel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rooms = getAllRooms();
  const roomsWithCounts = rooms.map(room => {
    const participants = getActiveParticipants(room.id);
    return {
      ...room,
      participantsCount: participants.length,
    };
  });

  return NextResponse.json({ rooms: roomsWithCounts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameFa, description, category } = body;

    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: RoomChannel = {
      id: roomId,
      name: name.trim().slice(0, 40),
      nameFa: (nameFa || name).trim().slice(0, 40),
      description: (description || 'Custom voice & text room').slice(0, 100),
      icon: category === 'gaming' ? 'Gamepad2' : category === 'lounge' ? 'Headphones' : 'Radio',
      category: category || 'voice',
      isDefault: false,
    };

    const saved = createCustomRoom(newRoom);
    return NextResponse.json({ success: true, room: saved });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
