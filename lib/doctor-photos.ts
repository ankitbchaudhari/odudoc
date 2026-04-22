// Deterministic professional portrait URL for a doctor.
//
// Uses randomuser.me portraits — free, no API key, stable CDN, 100 portraits
// per gender. Given the same doctor.id, the same photo comes back every time.
// Admins can later override with a real photo by setting `photoUrl` directly.

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickDoctorPhoto(
  opts: { id: string; gender?: "Male" | "Female"; explicit?: string | null }
): string {
  if (opts.explicit && opts.explicit.trim()) return opts.explicit;
  const bucket = opts.gender === "Female" ? "women" : "men";
  const n = hashString(opts.id) % 100; // 0..99
  return `https://randomuser.me/api/portraits/${bucket}/${n}.jpg`;
}
