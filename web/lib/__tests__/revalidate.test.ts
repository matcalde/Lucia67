/**
 * @jest-environment node
 */

import { REVALIDATE_TAGS, getRevalidateTagsForAction, getRevalidateHeaders } from "../revalidate";

// Mock next/cache
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

const { revalidateTag } = require("next/cache");

describe("Revalidate System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("REVALIDATE_TAGS constants", () => {
    it("should contain all expected tags", () => {
      expect(REVALIDATE_TAGS).toEqual({
        GALLERY: "gallery",
        GALLERY_LIST: "gallery-list",
        GALLERY_IMAGE: "gallery-image",
        ANNOUNCEMENTS: "announcements",
        ANNOUNCEMENT_LIST: "announcement-list",
        ANNOUNCEMENT_ITEM: "announcement-item",
        HOMEPAGE: "homepage",
        HOMEPAGE_GALLERY: "homepage-gallery",
        HOMEPAGE_ANNOUNCEMENTS: "homepage-announcements",
        ADMIN_BOOKINGS: "admin-bookings",
        ADMIN_GALLERY: "admin-gallery",
        ADMIN_ANNOUNCEMENTS: "admin-announcements",
        ADMIN_DISABLED_DAYS: "admin-disabled-days",
        // New reviews related tags
        REVIEWS: "reviews",
        REVIEW_LIST: "review-list",
        ADMIN_REVIEWS: "admin-reviews",
        // Calendar / Disabled days
        DISABLED_DAYS: "disabled-days",
      });
    });
  });

  describe("getRevalidateTagsForAction", () => {
    it("should return correct tags for gallery create action", () => {
      const tags = getRevalidateTagsForAction("create", "gallery");
      
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE_GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
    });

    it("should return correct tags for gallery update action", () => {
      const tags = getRevalidateTagsForAction("update", "gallery");
      
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
      expect(tags).not.toContain(REVALIDATE_TAGS.HOMEPAGE_GALLERY);
    });

    it("should return correct tags for gallery delete action", () => {
      const tags = getRevalidateTagsForAction("delete", "gallery");
      
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.GALLERY_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE_GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_GALLERY);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
    });

    it("should return correct tags for announcement create action", () => {
      const tags = getRevalidateTagsForAction("create", "announcement");
      
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENT_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE_ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
    });

    it("should return correct tags for announcement update action", () => {
      const tags = getRevalidateTagsForAction("update", "announcement");
      
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENT_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
      expect(tags).not.toContain(REVALIDATE_TAGS.HOMEPAGE_ANNOUNCEMENTS);
    });

    it("should return correct tags for announcement delete action", () => {
      const tags = getRevalidateTagsForAction("delete", "announcement");
      
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.ANNOUNCEMENT_LIST);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE_ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.ADMIN_ANNOUNCEMENTS);
      expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
    });

    it("should return correct tags for booking actions", () => {
      const createTags = getRevalidateTagsForAction("create", "booking");
      const updateTags = getRevalidateTagsForAction("update", "booking");
      const deleteTags = getRevalidateTagsForAction("delete", "booking");
      
      [createTags, updateTags, deleteTags].forEach(tags => {
        expect(tags).toContain(REVALIDATE_TAGS.ADMIN_BOOKINGS);
        expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
      });
    });

    it("should return correct tags for review actions", () => {
      const createTags = getRevalidateTagsForAction("create", "review");
      const updateTags = getRevalidateTagsForAction("update", "review");
      const deleteTags = getRevalidateTagsForAction("delete", "review");
      
      [createTags, updateTags, deleteTags].forEach(tags => {
        expect(tags).toContain(REVALIDATE_TAGS.REVIEWS);
        expect(tags).toContain(REVALIDATE_TAGS.REVIEW_LIST);
        expect(tags).toContain(REVALIDATE_TAGS.ADMIN_REVIEWS);
        expect(tags).toContain(REVALIDATE_TAGS.HOMEPAGE);
      });
    });

    it("should return unique tags without duplicates", () => {
      const tags = getRevalidateTagsForAction("create", "gallery");
      const uniqueTags = new Set(tags);
      
      expect(tags.length).toBe(uniqueTags.size);
    });
  });

  describe("getRevalidateHeaders", () => {
    it("should create correct headers object", () => {
      const tags = [REVALIDATE_TAGS.GALLERY, REVALIDATE_TAGS.HOMEPAGE];
      const headers = getRevalidateHeaders(tags);
      
      expect(headers).toEqual({
        "Cache-Control": "no-cache",
        "X-Revalidate-Tags": "gallery,homepage",
      });
    });

    it("should handle empty tags array", () => {
      const headers = getRevalidateHeaders([]);
      
      expect(headers).toEqual({
        "Cache-Control": "no-cache",
        "X-Revalidate-Tags": "",
      });
    });

    it("should handle single tag", () => {
      const headers = getRevalidateHeaders([REVALIDATE_TAGS.GALLERY]);
      
      expect(headers).toEqual({
        "Cache-Control": "no-cache",
        "X-Revalidate-Tags": "gallery",
      });
    });
  });

  describe("revalidateTags utility", () => {
    it("should call revalidateTag for each tag", async () => {
      const { revalidateTags } = require("../revalidate");
      const tags = [REVALIDATE_TAGS.GALLERY, REVALIDATE_TAGS.HOMEPAGE];
      
      await revalidateTags(tags);
      
      expect(revalidateTag).toHaveBeenCalledTimes(2);
      expect(revalidateTag).toHaveBeenCalledWith(REVALIDATE_TAGS.GALLERY);
      expect(revalidateTag).toHaveBeenCalledWith(REVALIDATE_TAGS.HOMEPAGE);
    });

    it("should handle empty tags array", async () => {
      const { revalidateTags } = require("../revalidate");
      
      await revalidateTags([]);
      
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      const { revalidateTags } = require("../revalidate");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      
      revalidateTag.mockImplementation(() => {
        throw new Error("Revalidation failed");
      });
      
      await revalidateTags([REVALIDATE_TAGS.GALLERY]);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});