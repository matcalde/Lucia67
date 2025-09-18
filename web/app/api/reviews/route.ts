import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { PAGINATION } from "@/lib/constants";
import { apiCreated, apiError, apiSuccess, apiValidationError } from "@/lib/api";
import { ReviewCreateSchema } from "@/lib/schemas";
import { getRevalidateTagsForAction, revalidateTags } from "@/lib/revalidate";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z
    .coerce
    .number()
    .int()
    .min(PAGINATION.MIN_PAGE_SIZE)
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parse = QuerySchema.safeParse({
      page: searchParams.get("page"),
      take: searchParams.get("take"),
    });
    if (!parse.success) return apiError("Invalid query", parse.error.flatten(), 400);
    const { page, take } = parse.data;
    const skip = (page - 1) * take;

    const where = { approved: true } as const;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take,
        select: { id: true, name: true, rating: true, comment: true, createdAt: true },
      }),
      prisma.review.count({ where }),
    ]);

    return apiSuccess({ items, total, page, take });
  } catch (e) {
    console.error(e);
    return apiError("Failed to fetch reviews", undefined, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ReviewCreateSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.flatten(), "Validazione fallita");

    // Ignora eventuale 'approved' dal client e forza bozza
    const { name, rating, comment } = parsed.data as { name: string; rating: number; comment?: string | null };
    const created = await prisma.review.create({ data: { name, rating, comment, approved: false } });

    // Revalida liste admin (e homepage aggregati) per riflettere la nuova recensione
    await revalidateTags(getRevalidateTagsForAction("create", "review"));

    return apiCreated({ id: created.id });
  } catch (e) {
    console.error(e);
    return apiError("Failed to create review", undefined, 500);
  }
}