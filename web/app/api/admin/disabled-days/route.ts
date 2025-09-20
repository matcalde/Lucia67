import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/authGuard";
import { apiSuccess, apiCreated, apiOk, apiUnauthorized, apiValidationError, apiError } from "@/lib/api";
import { revalidateTags, getRevalidateTagsForAction } from "@/lib/revalidate";

const CreateSchema = z.object({
  day: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Data non valida" }),
  reason: z.string().max(200).optional(),
});

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return apiUnauthorized();
  try {
    const items = await prisma.disabledDay.findMany({ orderBy: { day: "asc" } });
    return apiSuccess({ items });
  } catch (e) {
    return apiError("Errore nel recupero giorni disabilitati", e as any, 500);
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { day, reason } = parsed.data;
  const dateObj = new Date(day);
  const created = await prisma.disabledDay.create({ data: { day: dateObj, reason: reason || null } });
  await revalidateTags(getRevalidateTagsForAction("update", "disabled_day"));
  return apiCreated({ item: created });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { id } = parsed.data;
  await prisma.disabledDay.delete({ where: { id } });
  await revalidateTags(getRevalidateTagsForAction("update", "disabled_day"));
  return apiOk();
}