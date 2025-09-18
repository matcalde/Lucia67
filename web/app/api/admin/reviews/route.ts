import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { z } from "zod";
import { PAGINATION } from "@/lib/constants";
import { apiCreated, apiError, apiOk, apiSuccess, apiUnauthorized, apiValidationError } from "@/lib/api";
import { ReviewCreateSchema, ReviewUpdateSchema, ReviewDeleteSchema } from "@/lib/schemas";
import { getRevalidateTagsForAction, revalidateTags } from "@/lib/revalidate";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
  search: z.string().max(100).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  approved: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const { searchParams } = new URL(req.url);
  const parse = QuerySchema.safeParse({
    page: searchParams.get("page"),
    take: searchParams.get("take"),
    search: searchParams.get("search") || undefined,
    minRating: searchParams.get("minRating") || undefined,
    approved: searchParams.get("approved") ?? undefined,
  });
  if (!parse.success) return apiError("Invalid query", parse.error.flatten(), 400);

  const { page, take, search, minRating, approved } = parse.data;
  const skip = (page - 1) * take;
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { comment: { contains: search, mode: "insensitive" } }];
  if (minRating) where.rating = { gte: minRating };
  if (typeof approved === "boolean") where.approved = approved;

  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip, take }),
    prisma.review.count({ where }),
  ]);
  return apiSuccess({ items, total, page, take });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = ReviewCreateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const item = await prisma.review.create({ data: parsed.data });
  await revalidateTags(getRevalidateTagsForAction("create", "review"));
  return apiCreated({ item });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = ReviewUpdateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { id, data } = parsed.data;
  const item = await prisma.review.update({ where: { id }, data });
  await revalidateTags(getRevalidateTagsForAction("update", "review"));
  return apiSuccess({ item });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();
  const body = await req.json();
  const parsed = ReviewDeleteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  const { id } = parsed.data;
  await prisma.review.delete({ where: { id } });
  await revalidateTags(getRevalidateTagsForAction("delete", "review"));
  return apiOk();
}