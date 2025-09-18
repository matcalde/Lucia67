import { cookies } from "next/headers";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api";

// Simple password-only admin gate (no users table needed)
// Configure ADMIN_PASSWORD in env; fallback to 'admin' in development
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "admin";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!password || password !== ADMIN_PASSWORD) {
      return apiUnauthorized("Password non valida");
    }

    const token = Math.random().toString(36).slice(2);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    // No DB session; just set signed-like cookie (httpOnly)
    const cookieStore = await cookies();
    cookieStore.set("rv_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });

    return apiSuccess();
  } catch (e: any) {
    console.error(e);
    return apiError("Login failed", undefined, 500);
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("rv_session", "", { maxAge: 0, path: "/" });
    return apiSuccess();
  } catch (e: any) {
    console.error(e);
    return apiError("Logout failed", undefined, 500);
  }
}