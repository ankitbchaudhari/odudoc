// Daily.co configuration and helpers for video consultations

export const DAILY_API_KEY = process.env.DAILY_API_KEY || "";
export const DAILY_API_URL = process.env.DAILY_API_URL || "https://api.daily.co/v1";

export function isDailyConfigured(): boolean {
  return DAILY_API_KEY !== "" && DAILY_API_KEY !== "placeholder_change_this";
}

export async function createDailyRoom(roomName: string): Promise<{
  url: string;
  name: string;
  id: string;
} | null> {
  if (!isDailyConfigured()) {
    return null;
  }

  try {
    const res = await fetch(`${DAILY_API_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          max_participants: 2,
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        },
      }),
    });

    if (!res.ok) {
      console.error("Failed to create Daily room:", await res.text());
      return null;
    }

    const data = await res.json();
    return { url: data.url, name: data.name, id: data.id };
  } catch (err) {
    console.error("Error creating Daily room:", err);
    return null;
  }
}

export async function createDailyToken(
  roomName: string,
  userName: string,
  isOwner: boolean = false
): Promise<string | null> {
  if (!isDailyConfigured()) {
    return null;
  }

  try {
    const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      }),
    });

    if (!res.ok) {
      console.error("Failed to create Daily token:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error("Error creating Daily token:", err);
    return null;
  }
}

export function generateRoomName(doctorId: string, bookingId: string): string {
  const timestamp = Date.now().toString(36);
  return `odudoc-${doctorId}-${bookingId}-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, "-");
}
