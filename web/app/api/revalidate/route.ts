import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    // Endpoint mantenuto per compatibilità, ma non esegue revalidazioni.
    const body = await request.json().catch(() => ({}));
    return apiSuccess({ message: "Revalidation disabled in MVP", received: body });
  } catch (error) {
    return apiError("Revalidation handler error", error);
  }
}

export async function GET() {
  return apiSuccess({ message: "Revalidate API disabled in MVP" });
}