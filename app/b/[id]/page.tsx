// Short URL → booking confirmation. The QR encoded on the confirmation
// page points to /b/BK-XXXX so scanning with a phone camera opens this
// page in the patient's browser. This page just redirects to the full
// /booking/BK-XXXX route, keeping the QR payload short.

import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function ShortBookingRedirect({ params }: { params: { id: string } }) {
  redirect(`/booking/${params.id}`);
}
