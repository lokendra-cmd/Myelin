import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

/** Require a signed-in user; throws if the session is missing. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error("Unauthorized");
  }

  return {
    id,
    name: session.user?.name?.trim() || "there",
    email: session.user?.email ?? "",
  };
}

export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}
