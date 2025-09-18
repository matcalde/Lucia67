// Costanti condivise per paginazione e configurazione
// Nota: evitare l'uso diretto di Prisma enums a runtime nei Server Components

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

// Stati prenotazione disponibili
export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export const BOOKING_STATUS_VALUES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
// Aggiunta: fasce orarie disponibili per prenotazione (30 minuti)
export const TIME_SLOTS: string[] = [
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];


// Categorie galleria
export const GALLERY_CATEGORY = {
  HERO: "HERO",
  GENERIC: "GENERIC",
  FOOD: "FOOD",
  DRINKS: "DRINKS",
  AMBIENCE: "AMBIENCE",
  EVENTS: "EVENTS",
  PEOPLE: "PEOPLE",
} as const;

export const GALLERY_CATEGORY_VALUES = [
  "HERO",
  "GENERIC",
  "FOOD",
  "DRINKS",
  "AMBIENCE",
  "EVENTS",
  "PEOPLE",
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORY_VALUES)[number];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  HERO: "Immagine principale (HERO)",
  GENERIC: "Generico",
  FOOD: "Cucina (piatti)",
  DRINKS: "Bevande",
  AMBIENCE: "Ambiente",
  EVENTS: "Eventi / Musica",
  PEOPLE: "Persone",
} as const;
// Configurazioni UI
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_MS: 300,
} as const;

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/linguine_parlanti?igsh=cjBkaDc2bnBmOWk%3D&utm_source=qr",
};

export const CONTACT_INFO = {
  phone: "3394205087",
  email: "viola.7laurenzi@libero.it",
};

export const LOCATION_INFO = {
  address: "Via Michelangelo Antonioni 5, Morlupo, 00067 RM",
  mapsUrl: "https://www.google.com/maps?q=Via+Michelangelo+Antonioni+5,+Morlupo,+00067+RM&output=embed",
};