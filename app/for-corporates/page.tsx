import { redirect } from "next/navigation";

// Spec lists /for-corporates as the corporate feature page. We already
// have a comprehensive /corporate marketing page, so this route is a
// permanent redirect — keeps the spec-listed URL valid for inbound
// links + email campaigns without duplicating 700 lines of copy.

export default function ForCorporatesRedirect() {
  redirect("/corporate");
}
