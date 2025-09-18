import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { getRevalidateHeaders, REVALIDATE_TAGS } from "@/lib/revalidate";

export async function GET() {
  try {
    const aggregate = await prisma.review.aggregate({
      where: { approved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const average = aggregate._avg.rating ? Number(aggregate._avg.rating) : 0;
    const count = aggregate._count._all;

    const headers = getRevalidateHeaders([
      REVALIDATE_TAGS.REVIEWS,
      REVALIDATE_TAGS.HOMEPAGE,
    ]);

    return apiSuccess({ average, count }, { headers });
  } catch (e) {
    console.error(e);
    return apiError("Failed to fetch reviews summary", undefined, 500);
  }
}