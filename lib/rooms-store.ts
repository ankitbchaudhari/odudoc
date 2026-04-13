// In-memory room storage for video consultations

export interface Room {
  id: string;
  roomName: string;
  roomUrl: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  bookingId: string;
  specialty: string;
  fee: number;
  status: "waiting" | "active" | "ended";
  createdAt: string;
}

const rooms = new Map<string, Room>();

export function createRoom(room: Room): Room {
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function updateRoomStatus(id: string, status: Room["status"]): Room | undefined {
  const room = rooms.get(id);
  if (room) {
    room.status = status;
    rooms.set(id, room);
  }
  return room;
}

export function getRoomsByDoctor(doctorId: string): Room[] {
  return Array.from(rooms.values()).filter((r) => r.doctorId === doctorId);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}
