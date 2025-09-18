import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { z } from "zod";
import { PAGINATION } from "@/lib/constants";
import { apiCreated, apiOk, apiSuccess, apiUnauthorized, apiValidationError } from "@/lib/api";
import { MenuItemCreateSchema, MenuItemUpdateSchema, MenuItemDeleteSchema } from "@/lib/schemas";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
  sectionId: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const { searchParams } = new URL(req.url);
  const parse = QuerySchema.safeParse({
    page: searchParams.get("page"),
    take: searchParams.get("take"),
    sectionId: searchParams.get("sectionId") || undefined,
    featured: searchParams.get("featured") ?? undefined,
    active: searchParams.get("active") ?? undefined,
  });
  if (!parse.success) return apiValidationError(parse.error.flatten(), "Invalid query");
  const { page, take, sectionId, featured, active } = parse.data; const skip = (page - 1) * take;
  const where: any = {};
  if (sectionId) where.sectionId = sectionId;
  const isActive = active ?? true; // default: solo attivi
  if (typeof isActive === "boolean") where.isActive = isActive;
  if (typeof featured === "boolean") where.featured = featured;
  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }], skip, take }),
    prisma.menuItem.count({ where }),
  ]);
  return apiSuccess({ items, total, page, take });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = MenuItemCreateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const item = await prisma.menuItem.create({ data: parsed.data });
  return apiCreated({ item });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = MenuItemUpdateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { id, data } = parsed.data;
  const item = await prisma.menuItem.update({ where: { id }, data });
  return apiSuccess({ item });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = MenuItemDeleteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { id } = parsed.data;
  await prisma.menuItem.delete({ where: { id } });
  return apiOk();
}