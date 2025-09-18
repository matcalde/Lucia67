"use server";
import { prisma } from "@/lib/prisma";


export async function getDisabledDates(): Promise<string[]> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { date: true },
  });
  // Una sola prenotazione per serata: disabilita il giorno se esiste qualsiasi prenotazione non cancellata
  const set = new Set<string>();
  for (const b of bookings) {
    set.add(b.date.toISOString().slice(0, 10));
  }
  return Array.from(set);
}

// Restituisce le date raggruppate per stato (utile per legenda/UX)
export async function getDateStatuses(): Promise<{ confirmed: string[]; pending: string[] }> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { date: true, status: true },
  });
  const confirmedSet = new Set<string>();
  const pendingSet = new Set<string>();
  for (const b of bookings) {
    const iso = b.date.toISOString().slice(0, 10);
    if (b.status === "CONFIRMED") confirmedSet.add(iso);
    else if (b.status === "PENDING") pendingSet.add(iso);
  }
  return { confirmed: Array.from(confirmedSet), pending: Array.from(pendingSet) };
}

export async function getAnnouncements() {
  return prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, content: true, isActive: true, eventDate: true, createdAt: true, imageUrl: true },
  });
}