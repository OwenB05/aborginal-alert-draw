import { redirect } from "next/navigation";

// Password management moved to the shared /account page (see
// AAMODULESETTINGSGUIDE). Keep this route as a redirect for any old links.
export default function PasswordRedirect() {
  redirect("/account");
}
