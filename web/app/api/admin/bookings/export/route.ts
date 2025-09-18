import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authGuard";
import { BOOKING_STATUS_VALUES } from "@/lib/constants";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export async function GET(req: NextRequest) {
  // Auth
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as typeof BOOKING_STATUS_VALUES[number] | null;
  const where: any = {};
  if (status && (BOOKING_STATUS_VALUES as readonly string[]).includes(status)) {
    where.status = status;
  }

  // Fetch ALL matching bookings (no pagination) ordered by date asc
  const bookings = await prisma.booking.findMany({ where, orderBy: [{ date: "asc" }, { id: "asc" }] });

  // Build CSV
  const headers = [
    "Data",
    "Ora",
    "Nome",
    "Telefono",
    "Email",
    "Ospiti",
    "Stato",
    "Note"
  ];

  const escapeCell = (val: unknown) => {
    const str = (val ?? "").toString();
    // Escape quotes by doubling them and wrap in quotes to be safe
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCell).join(";"));

  for (const b of bookings) {
    const d = new Date(b.date as any);
    const data = format(d, "dd/MM/yyyy", { locale: it });
    const ora = format(d, "HH:mm", { locale: it });
    rows.push([
      data,
      ora,
      b.name,
      b.phone,
      b.email || "",
      String(b.guests),
      b.status,
      b.notes || "",
    ].map(escapeCell).join(";"));
  }

  const csvBody = "\uFEFF" + rows.join("\n"); // add BOM for Excel UTF-8
  const filenameSuffix = status ? `-${status.toLowerCase()}` : "";
  const filename = `prenotazioni${filenameSuffix}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}