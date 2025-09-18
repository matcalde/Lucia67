import { cookies } from "next/headers";

// Minimal guard: consider any existing rv_session cookie as authenticated
export async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("rv_session")?.value;
  return Boolean(token);
}