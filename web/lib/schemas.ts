import { z } from "zod";
import { BOOKING_STATUS_VALUES, GALLERY_CATEGORY_VALUES } from "@/lib/constants";

// Booking schemas
export const BookingCreateSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data non valida"
  }),
  guests: z.number().min(1, "Minimo 1 ospite").max(12, "Massimo 12 ospiti"),
  name: z.string().min(2, "Nome richiesto").max(100, "Nome troppo lungo"),
  email: z.string().email("Email non valida").max(100),
  phone: z.string().min(8, "Telefono non valido").max(20),
  allergies: z.string().max(500, "Troppe informazioni").optional(),
  preferences: z.string().max(500, "Troppe informazioni").optional(),
  notes: z.string().max(1000, "Note troppo lunghe").optional(),
  specialEventId: z.string().min(1).optional(),
});

export const BookingStatusUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  status: z.enum(BOOKING_STATUS_VALUES as ["PENDING","CONFIRMED","CANCELLED"]),
});

// NEW: update booking date schema
export const BookingDateUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data non valida" }),
});

// NEW: booking delete schema
export const BookingDeleteSchema = z.object({ id: z.string().min(1, "ID richiesto") });

// Announcement schemas
export const AnnouncementCreateSchema = z.object({
  title: z.string().min(3, "Titolo troppo corto").max(200, "Titolo troppo lungo"),
  content: z.string().min(10, "Contenuto troppo corto").max(2000, "Contenuto troppo lungo"),
  isActive: z.boolean().default(true),
  eventDate: z.string().optional().refine((v) => v === undefined || !isNaN(Date.parse(v)), { message: "Data evento non valida" }),
  imageUrl: z.string().url("URL immagine non valido").max(500).optional(),
});

export const AnnouncementUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  data: z.object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(10).max(2000).optional(),
    isActive: z.boolean().optional(),
    eventDate: z.string().optional().refine((v) => v === undefined || !isNaN(Date.parse(v)), { message: "Data evento non valida" }),
    imageUrl: z.string().url().max(500).optional(),
  }),
});

export const AnnouncementDeleteSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
});

// Gallery schemas (simplified, no Cloudinary publicId)
export const GalleryImageCreateSchema = z.object({
  url: z.string().url("URL immagine non valido").max(500),
  alt: z.string().min(1, "Testo alternativo richiesto").max(200),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500, "Descrizione troppo lunga").optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  category: z.enum(GALLERY_CATEGORY_VALUES as ["HERO","GENERIC","FOOD","DRINKS","AMBIENCE","EVENTS","PEOPLE"]).default("GENERIC"),
});

export const GalleryImageUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  data: z.object({
    url: z.string().url().max(500).optional(),
    alt: z.string().min(1).max(200).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    category: z.enum(GALLERY_CATEGORY_VALUES as ["HERO","GENERIC","FOOD","DRINKS","AMBIENCE","EVENTS","PEOPLE"]).optional(),
  }),
});

export const GalleryImageDeleteSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
});

// Reviews schemas
export const ReviewCreateSchema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(100, "Nome troppo lungo"),
  rating: z.number().int().min(1, "Min 1").max(5, "Max 5"),
  comment: z.string().max(1000, "Commento troppo lungo").optional(),
  approved: z.boolean().default(false).optional(),
});

export const ReviewUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  data: z.object({
    name: z.string().min(2).max(100).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
    approved: z.boolean().optional(),
  }),
});

export const ReviewDeleteSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
});

// Menu schemas
export const MenuSectionCreateSchema = z.object({
  title: z.string().min(2, "Titolo troppo corto").max(200, "Titolo troppo lungo"),
  description: z.string().max(500, "Descrizione troppo lunga").optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const MenuSectionUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  data: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const MenuSectionDeleteSchema = z.object({ id: z.string().min(1, "ID richiesto") });

export const MenuItemCreateSchema = z.object({
  sectionId: z.string().min(1, "Sezione richiesta"),
  name: z.string().min(2, "Nome troppo corto").max(200, "Nome troppo lungo"),
  note: z.string().max(500, "Nota troppo lunga").optional(),
  price: z.string().max(50, "Prezzo troppo lungo").optional(),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const MenuItemUpdateSchema = z.object({
  id: z.string().min(1, "ID richiesto"),
  data: z.object({
    sectionId: z.string().min(1).optional(),
    name: z.string().min(2).max(200).optional(),
    note: z.string().max(500).optional(),
    price: z.string().max(50).optional(),
    featured: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const MenuItemDeleteSchema = z.object({ id: z.string().min(1, "ID richiesto") });

// Inferred types for TypeScript
export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type BookingStatusUpdate = z.infer<typeof BookingStatusUpdateSchema>;
export type BookingDateUpdate = z.infer<typeof BookingDateUpdateSchema>;
export type BookingDelete = z.infer<typeof BookingDeleteSchema>;
export type AnnouncementCreate = z.infer<typeof AnnouncementCreateSchema>;
export type AnnouncementUpdate = z.infer<typeof AnnouncementUpdateSchema>;
export type AnnouncementDelete = z.infer<typeof AnnouncementDeleteSchema>;
export type GalleryImageCreate = z.infer<typeof GalleryImageCreateSchema>;
export type GalleryImageUpdate = z.infer<typeof GalleryImageUpdateSchema>;
export type GalleryImageDelete = z.infer<typeof GalleryImageDeleteSchema>;
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;
export type ReviewUpdate = z.infer<typeof ReviewUpdateSchema>;
export type ReviewDelete = z.infer<typeof ReviewDeleteSchema>;

// Response schemas
export const ApiSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.any().optional(),
});

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;