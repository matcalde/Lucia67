import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCreated, apiError, apiOk, apiSuccess, apiUnauthorized, apiValidationError } from "@/lib/api";
import { requireAdmin } from "@/lib/authGuard";
import { z } from "zod";
import { PAGINATION, GALLERY_CATEGORY_VALUES } from "@/lib/constants";
import { GalleryImageCreateSchema, GalleryImageUpdateSchema, GalleryImageDeleteSchema } from "@/lib/schemas";
import fs from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidateTags, getRevalidateTagsForAction } from "@/lib/revalidate";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
  category: z.enum([...GALLERY_CATEGORY_VALUES] as [typeof GALLERY_CATEGORY_VALUES[number], ...typeof GALLERY_CATEGORY_VALUES[number][]]).optional(),
  // expose config status when requested
  config: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parse = QuerySchema.safeParse({
    page: searchParams.get("page"),
    take: searchParams.get("take"),
    category: (searchParams.get("category") || undefined) as any,
    config: searchParams.get("config") ?? undefined,
  });

  if (!parse.success) {
    return apiError("Invalid query", parse.error.flatten(), 400);
  }

  const { page, take } = parse.data;
  const skip = (page - 1) * take;
  const where = parse.data.category ? { category: parse.data.category } : undefined;

  const [items, total] = await Promise.all([
    prisma.galleryImage.findMany({ where, orderBy: [{ order: "asc" }, { id: "asc" }], skip, take }),
    prisma.galleryImage.count({ where }),
  ]);

  // Optionally include env/config status for Admin UI banners
  if (parse.data.config) {
    const supa = getSupabase();
    const config = {
      supabaseConfigured: !!supa,
      environment: {
        isProduction: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV || "development",
        vercel: !!process.env.VERCEL,
      },
    };
    return apiSuccess({ items, total, page, take, config });
  }

  return apiSuccess({ items, total, page, take });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const file = form.get("file") as unknown as File | null;
      const alt = String(form.get("alt") || "").trim();
      const title = (form.get("title") ? String(form.get("title")) : undefined) as string | undefined;
      const description = (form.get("description") ? String(form.get("description")) : undefined) as string | undefined;
      const order = form.get("order") != null ? Number(form.get("order")) : 0;
      const isActive = form.get("isActive") == null ? true : String(form.get("isActive")).toLowerCase() !== "false";
      const category = (form.get("category") ? String(form.get("category")) : "GENERIC") as any;

      if (!file) return apiValidationError({ formErrors: ["File immagine mancante"], fieldErrors: {} }, "Validazione fallita");
      if (!alt) return apiValidationError({ formErrors: ["ALT richiesto"], fieldErrors: {} }, "Validazione fallita");

      // Validate server-side mime and size
      const mime = (file as any).type || "";
      if (!ALLOWED_MIME.includes(mime)) {
        return apiValidationError({ formErrors: ["Formato non supportato"], fieldErrors: {} }, "Validazione fallita");
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > MAX_FILE_SIZE) {
        return apiValidationError({ formErrors: ["File troppo grande (max 5MB)"], fieldErrors: {} }, "Validazione fallita");
      }

      // Try remote upload first (Supabase Storage) if configured
      const supa = getSupabase();
      if (supa) {
        const filename = getSafeFilename((file as any).name ? String((file as any).name) : "upload");
        // Ensure bucket exists (idempotent)
        try {
          await supa.client.storage.createBucket(supa.bucket, { public: true });
        } catch {}
        const { error: upErr } = await supa.client.storage
          .from(supa.bucket)
          .upload(filename, buffer, { contentType: mime, upsert: false });
        if (upErr) {
          return apiError("Upload remoto fallito", upErr.message, 400);
        }
        const { data: pub } = supa.client.storage.from(supa.bucket).getPublicUrl(filename);
        const url = pub.publicUrl;
        const item = await prisma.galleryImage.create({
          data: { url, alt, title, description, order: Number.isFinite(order) ? order : 0, isActive, category },
        });
        // Revalidate caches for gallery create
        await revalidateTags(getRevalidateTagsForAction("create", "gallery"));
        return apiCreated({ item });
      }

      // In produzione non permettere fallback locale per evitare file effimeri su Vercel
      if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        return apiError(
          "Upload file disabilitato in produzione: configura SUPABASE_URL, SUPABASE_SERVICE_ROLE (o ANON) e SUPABASE_STORAGE_BUCKET",
          undefined,
          503
        );
      }

      // Fallback: save locally to /public/uploads (solo in sviluppo)
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      // Derive filename
      const originalName = (file as any).name ? String((file as any).name) : "upload";
      const filename = getSafeFilename(originalName);
      const filePath = path.join(uploadsDir, filename);

      await fs.writeFile(filePath, buffer);

      const url = `/uploads/${filename}`;

      const item = await prisma.galleryImage.create({
        data: { url, alt, title, description, order: Number.isFinite(order) ? order : 0, isActive, category },
      });
      // Revalidate caches for gallery create
      await revalidateTags(getRevalidateTagsForAction("create", "gallery"));
      return apiCreated({ item });
    } catch (e: any) {
      return apiError(e?.message || "Upload fallito", undefined, 400);
    }
  }

  // Fallback: JSON payload con URL esterno (sempre permesso)
  const body = await req.json();
  const parsed = await GalleryImageCreateSchema.safeParseAsync(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }

  const item = await prisma.galleryImage.create({ data: parsed.data });
  // Revalidate caches for gallery create
  await revalidateTags(getRevalidateTagsForAction("create", "gallery"));
  return apiCreated({ item });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();

  const body = await req.json();
  const parsed = GalleryImageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }

  const { id, data } = parsed.data;
  const item = await prisma.galleryImage.update({ where: { id }, data });
  // Revalidate caches for gallery update
  await revalidateTags(getRevalidateTagsForAction("update", "gallery"));
  return apiSuccess({ item });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return apiUnauthorized();

  const body = await req.json();
  const parsed = GalleryImageDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten(), "Validazione fallita");
  }
  const { id } = parsed.data;

  // Fetch record to know its URL
  const existing = await prisma.galleryImage.findUnique({ where: { id } });
  if (!existing) {
    // Idempotent delete: if not found, return ok
    return apiOk();
  }

  // If the image URL points to our local uploads folder, try to remove the file
  try {
    const url = existing.url || "";

    // Try deletion from Supabase if URL points there
    const supa = getSupabase();
    if (supa) {
      const key = extractSupabaseKeyFromPublicUrl(url, supa.bucket);
      if (key) {
        await supa.client.storage.from(supa.bucket).remove([key]).catch(() => {});
      }
    }

    if (url.startsWith("/uploads/")) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      const resolved = path.resolve(filePath);
      const allowedBase = path.resolve(uploadsDir);
      if (resolved.startsWith(allowedBase)) {
        await fs.unlink(resolved).catch(() => {});
      }
    }
  } catch {
    // Ignore file deletion errors
  }

  await prisma.galleryImage.delete({ where: { id } });
  // Revalidate caches for gallery delete
  await revalidateTags(getRevalidateTagsForAction("delete", "gallery"));
  return apiOk();
}

// Helper to get Supabase client if configured
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "gallery";
  if (!url || !key) return null as null | { client: ReturnType<typeof createSupabaseClient>; bucket: string };
  const client = createSupabaseClient(url, key);
  return { client, bucket };
}

function getSafeFilename(originalName: string) {
  const safeBase = originalName.replace(/[^a-z0-9.\-]+/gi, "_").toLowerCase();
  return `${Date.now()}_${safeBase}`;
}

function extractSupabaseKeyFromPublicUrl(publicUrl: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null as string | null;
  return publicUrl.slice(idx + marker.length);
}