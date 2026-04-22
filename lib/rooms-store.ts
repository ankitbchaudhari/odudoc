// Room storage for video consultations — backed by Postgres via app_kv.

import { bindPersistentArray } from "./persistent-array";

export interface Room {
  id: string;
  roomName: string;
  roomUrl: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientPhone?: string;
  bookingId: string;
  specialty: string;
  fee: number;
  status: "waiting" | "active" | "ended";
  createdAt: string;
}

const rooms: Room[] = [];
const { hydrate, flush } = bindPersistentArray<Room>("rooms", rooms, () => []);
await hydrate();

export function createRoom(room: Room): Room {
  const idx = rooms.findIndex((r) => r.id === room.id);
  if (idx >= 0) rooms[idx] = room;
  else rooms.push(room);
  flush();
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function updateRoomStatus(id: string, status: Room["status"]): Room | undefined {
  const room = rooms.find((r) => r.id === id);
  if (room) {
    room.status = status;
    flush();
  }
  return room;
}

export function getRoomsByDoctor(doctorId: string): Room[] {
  return rooms.filter((r) => r.doctorId === doctorId);
}

export function getAllRooms(): Room[] {
  return [...rooms];
}
