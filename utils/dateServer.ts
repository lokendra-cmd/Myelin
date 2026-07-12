import { cookies } from "next/headers";

export async function getServerTimeZone(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const tzCookie = cookieStore.get("timezone")?.value;
    if (tzCookie) {
      return decodeURIComponent(tzCookie);
    }
  } catch {
    // Fallback if cookies() is called outside request context (e.g. static generation)
  }
  return "UTC";
}
