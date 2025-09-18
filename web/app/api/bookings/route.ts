import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { BookingCreateSchema } from "@/lib/schemas";
import { revalidateTags, getRevalidateTagsForAction } from "@/lib/revalidate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BookingCreateSchema.safeParse({
      ...body,
      guests: typeof body.guests === "string" ? Number(body.guests) : body.guests,
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Validazione fallita", details: parsed.error.flatten() }, { status: 400 });
    }

    const { date, guests, name, email, phone, allergies, preferences, notes, specialEventId } = parsed.data;

    const dateObj = new Date(date);
    const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const nextDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1, 0, 0, 0, 0);

    const existing = await prisma.booking.findFirst({
      where: {
        date: { gte: dayStart, lt: nextDay },
        status: { not: "CANCELLED" },
      },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Data non disponibile" }, { status: 409 });
    }

    const booking = await prisma.booking.create({
      data: {
        date: dateObj,
        guests: Number(guests),
        name,
        email,
        phone,
        allergies: allergies || null,
        preferences: preferences || null,
        notes: notes || null,
        specialEventId: specialEventId || null,
      },
    });

    // Revalidate homepage and admin bookings caches
    await revalidateTags(getRevalidateTagsForAction("create", "booking"));

    return NextResponse.json({ ok: true, data: { booking } }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Errore del server" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { date: "asc" } });
    return NextResponse.json({ ok: true, data: { bookings } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Errore del server" }, { status: 500 });
  }
}