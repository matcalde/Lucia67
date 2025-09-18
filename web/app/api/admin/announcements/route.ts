import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { AnnouncementCreateSchema, AnnouncementUpdateSchema, AnnouncementDeleteSchema } from "@/lib/schemas";
import { z } from "zod";
import { PAGINATION } from "@/lib/constants";
import { apiCreated, apiError, apiOk, apiSuccess, apiUnauthorized, apiValidationError } from "@/lib/api";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export async function GET(req: NextRequest) {
  const ok = await requireAdmin();
  if (!ok) return apiUnauthorized();

  const { searchParams } = new URL(req.url);
  const parse = QuerySchema.safeParse({
    page: searchParams.get("page"),
    take: searchParams.get("take"),
  });

  if (!parse.success) {
    return apiError("Invalid query", parse.error.flatten(), 400);
  }

  const { page, take } = parse.data;
  const skip = (page - 1) * take;

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({ where: {}, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip, take }),
    prisma.announcement.count({ where: {} }),
  ]);
  
  return apiSuccess({ items, total, page, take });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = AnnouncementCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }
  const data = parsed.data as any;
  const created = await prisma.announcement.create({ data: { ...data, eventDate: data.eventDate ? new Date(data.eventDate) : null } });
  return apiCreated({ item: created });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = AnnouncementUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }
  const { id, data } = parsed.data as any;
  const updated = await prisma.announcement.update({ where: { id }, data: { ...data, eventDate: data.eventDate ? new Date(data.eventDate) : undefined } });
  return apiSuccess({ item: updated });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = AnnouncementDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }
  const { id } = parsed.data;
  await prisma.announcement.delete({ where: { id } });
  return apiOk();
}