/**
 * Revalidate tags for cache invalidation
 * Used with Next.js revalidateTag API
 */

export const REVALIDATE_TAGS = {
  // Gallery related tags
  GALLERY: "gallery",
  GALLERY_LIST: "gallery-list",
  GALLERY_IMAGE: "gallery-image",
  
  // Announcements related tags
  ANNOUNCEMENTS: "announcements",
  ANNOUNCEMENT_LIST: "announcement-list",
  ANNOUNCEMENT_ITEM: "announcement-item",
  
  // Homepage content
  HOMEPAGE: "homepage",
  HOMEPAGE_GALLERY: "homepage-gallery",
  HOMEPAGE_ANNOUNCEMENTS: "homepage-announcements",
  
  // Admin content
  ADMIN_BOOKINGS: "admin-bookings",
  ADMIN_GALLERY: "admin-gallery",
  ADMIN_ANNOUNCEMENTS: "admin-announcements",
  ADMIN_DISABLED_DAYS: "admin-disabled-days",

  // Reviews
  REVIEWS: "reviews",
  REVIEW_LIST: "review-list",
  ADMIN_REVIEWS: "admin-reviews",

  // Calendar / Disabled Days
  DISABLED_DAYS: "disabled-days",
} as const;

export type RevalidateTag = typeof REVALIDATE_TAGS[keyof typeof REVALIDATE_TAGS];

/**
 * Helper function to revalidate multiple tags at once
 */
export async function revalidateTags(tags: RevalidateTag[]): Promise<void> {
  if (typeof window !== "undefined") {
    // Client-side: call revalidate API
    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      console.error("Failed to revalidate tags:", error);
    }
    return;
  }

  // Server-side: use revalidateTag directly
  try {
    const { revalidateTag } = await import("next/cache");
    for (const tag of tags) {
      revalidateTag(tag);
    }
  } catch (error) {
    console.error("Failed to revalidate tags server-side:", error);
  }
}

/**
 * Get tags that should be invalidated for a specific action
 */
export function getRevalidateTagsForAction(
  action: "create" | "update" | "delete",
  resource: "gallery" | "announcement" | "booking" | "review" | "disabled_day"
): RevalidateTag[] {
  const tags: RevalidateTag[] = [];

  switch (resource) {
    case "gallery":
      tags.push(REVALIDATE_TAGS.GALLERY, REVALIDATE_TAGS.GALLERY_LIST);
      
      if (action === "create" || action === "delete") {
        tags.push(REVALIDATE_TAGS.HOMEPAGE_GALLERY);
      }
      
      tags.push(REVALIDATE_TAGS.ADMIN_GALLERY);
      break;

    case "announcement":
      tags.push(REVALIDATE_TAGS.ANNOUNCEMENTS, REVALIDATE_TAGS.ANNOUNCEMENT_LIST);
      
      if (action === "create" || action === "delete") {
        tags.push(REVALIDATE_TAGS.HOMEPAGE_ANNOUNCEMENTS);
      }
      
      tags.push(REVALIDATE_TAGS.ADMIN_ANNOUNCEMENTS);
      break;

    case "booking":
      tags.push(REVALIDATE_TAGS.ADMIN_BOOKINGS, REVALIDATE_TAGS.DISABLED_DAYS);
      break;

    case "review":
      tags.push(REVALIDATE_TAGS.REVIEWS, REVALIDATE_TAGS.REVIEW_LIST, REVALIDATE_TAGS.ADMIN_REVIEWS);
      break;

    case "disabled_day":
      tags.push(REVALIDATE_TAGS.ADMIN_DISABLED_DAYS, REVALIDATE_TAGS.DISABLED_DAYS, REVALIDATE_TAGS.ADMIN_BOOKINGS);
      break;
  }

  // Always revalidate homepage for any content change
  tags.push(REVALIDATE_TAGS.HOMEPAGE);

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Create revalidate headers for API responses
 */
export function createRevalidateHeaders(tags: RevalidateTag[]): HeadersInit {
  return {
    "Cache-Control": "no-cache",
    "X-Revalidate-Tags": tags.join(","),
  };
}

// New: alias expected by tests
export function getRevalidateHeaders(tags: RevalidateTag[]): HeadersInit {
  return createRevalidateHeaders(tags);
}