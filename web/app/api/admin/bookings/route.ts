import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BookingStatusUpdateSchema, BookingDeleteSchema } from "@/lib/schemas";
import { PAGINATION, BOOKING_STATUS_VALUES } from "@/lib/constants";
import { apiSuccess, apiError, apiUnauthorized, apiValidationError, apiNotFound, apiOk } from "@/lib/api";
import { revalidateTags, getRevalidateTagsForAction } from "@/lib/revalidate";
import { requireAdmin } from "@/lib/authGuard";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
  status: z.enum(BOOKING_STATUS_VALUES as ["PENDING","CONFIRMED","CANCELLED"]).optional(),
});

export async function GET(req: NextRequest) {
  const ok = await requireAdmin();
  if (!ok) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(req.url);
  const parse = QuerySchema.safeParse({
    page: searchParams.get("page"),
    take: searchParams.get("take"),
    status: searchParams.get("status") ?? undefined,
  });

  if (!parse.success) {
    return apiValidationError(parse.error.flatten(), "Invalid query");
  }

  const { page, take, status } = parse.data;
  const skip = (page - 1) * take;
  const where = status ? { status } : {};

  try {
    const [items, total] = await Promise.all([
      prisma.booking.findMany({ where, orderBy: [{ date: "asc" }, { id: "asc" }], skip, take }),
      prisma.booking.count({ where }),
    ]);

    return apiSuccess({ items, total, page, take });
  } catch (e: any) {
    return apiError("Failed to fetch bookings", e, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const ok = await requireAdmin();
  if (!ok) {
    return apiUnauthorized();
  }

  try {
    const body = await req.json();
    const parsed = BookingStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten());
    }

    const { id, status } = parsed.data;

    await prisma.booking.update({ where: { id }, data: { status } });

    await revalidateTags(getRevalidateTagsForAction("update", "booking"));

    return apiSuccess({ id, status });
  } catch (e: any) {
    if (e instanceof Error && e.message.includes("Record to update not found")) {
      return apiNotFound("Booking not found");
    }
    return apiError("Failed to update booking", e, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const ok = await requireAdmin();
  if (!ok) {
    return apiUnauthorized();
  }

  try {
    const { searchParams } = new URL(req.url);
    const idFromQuery = searchParams.get("id");

    // Try query param first (more robust across proxies/CDNs)
    const QueryDeleteSchema = z.object({ id: z.string().min(1) });
    let id: string | null = null;

    if (idFromQuery) {
      const qp = QueryDeleteSchema.safeParse({ id: idFromQuery });
      if (!qp.success) return apiValidationError(qp.error.flatten(), "Validazione fallita");
      id = qp.data.id;
    } else {
      // Fallback to JSON body (supported locally and by most environments)
      const body = await req.json().catch(() => null);
      if (!body) return apiValidationError({ fieldErrors: { id: ["ID mancante"] }, formErrors: [] } as any, "Validazione fallita");
      const parsed = BookingDeleteSchema.safeParse(body);
      if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
      id = parsed.data.id;
    }

    await prisma.booking.delete({ where: { id: id! } });

    await revalidateTags(getRevalidateTagsForAction("delete", "booking"));

    return apiOk();
  } catch (e: any) {
    if (e instanceof Error && e.message.includes("Record to delete does not exist")) {
      return apiNotFound("Booking not found");
    }
    return apiError("Failed to delete booking", e, 500);
  }
}