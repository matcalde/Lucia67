import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BookingStatusUpdateSchema, BookingDeleteSchema, BookingDateUpdateSchema } from "@/lib/schemas";
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

    // Decide whether it's a status update or a date update based on provided fields
    const isDateUpdate = typeof body?.date === "string" && !!body?.id && !body?.status;

    if (isDateUpdate) {
      const parsed = BookingDateUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return apiValidationError(parsed.error.flatten());
      }
      const { id, date } = parsed.data;

      // Normalize to day range for conflict check
      const dateObj = new Date(date);
      const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
      const nextDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1, 0, 0, 0, 0);

      // Check: target day must not have other active booking
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: id },
          date: { gte: dayStart, lt: nextDay },
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      });
      if (conflict) {
        return apiError("Data non disponibile", undefined, 409);
      }

      // Keep time part of existing booking if present, otherwise keep time part from provided date string
      const current = await prisma.booking.findUnique({ where: { id }, select: { date: true } });
      if (!current) return apiNotFound("Booking not found");
      const currentDate = current.date;

      const newDate = new Date(date);
      // if provided date has time, use it; else keep hour/min/sec from current
      const providedHasTime = !/T00:00:00(\.000)?Z?$/.test(newDate.toISOString());
      const finalDate = providedHasTime
        ? newDate
        : new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds(), currentDate.getMilliseconds());

      await prisma.booking.update({ where: { id }, data: { date: finalDate } });
      await revalidateTags(getRevalidateTagsForAction("update", "booking"));
      return apiSuccess({ id, date: finalDate.toISOString() });
    }

    // Fallback: status update
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