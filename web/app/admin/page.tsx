import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { StatusBadge } from "@/app/components/StatusBadge";
import { FaListAlt, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaHistory } from "react-icons/fa";
import type { IconType } from "react-icons";

export default async function AdminHome() {
  // Carico alcune metriche
  const [totalBookings, upcomingCount, confirmedCount, cancelledCount, latest] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { date: { gte: new Date() } } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const nextUpcoming = await prisma.booking.findFirst({ where: { date: { gte: new Date() } }, orderBy: { date: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-black/70 dark:text-white/70">Benvenuto nell’area gestore. Qui trovi un riepilogo veloce.</p>
      </div>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Prenotazioni totali" value={totalBookings} icon={FaListAlt} color="text-slate-700 bg-slate-100" />
        <KpiCard label="Prossime (>= oggi)" value={upcomingCount} icon={FaCalendarAlt} color="text-indigo-700 bg-indigo-100" />
        <KpiCard label="Confermate" value={confirmedCount} icon={FaCheckCircle} color="text-emerald-700 bg-emerald-100" />
        <KpiCard label="Annullate" value={cancelledCount} icon={FaTimesCircle} color="text-rose-700 bg-rose-100" />
      </section>

      {/* Next upcoming */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-medium mb-3 flex items-center gap-2"><FaClock className="text-indigo-600" /> Prossima prenotazione</h2>
          {!nextUpcoming ? (
            <p className="text-sm text-black/70 dark:text-white/70">Nessuna prenotazione futura.</p>
          ) : (
            <div className="text-sm">
              <div className="font-medium">{format(new Date(nextUpcoming.date), "dd/MM/yyyy")}</div>
              <div className="text-black/70 dark:text-white/70">{nextUpcoming.name} · {nextUpcoming.guests} ospiti</div>
              <div className="text-black/60 dark:text-white/60">{nextUpcoming.email} · {nextUpcoming.phone}</div>
            </div>
          )}
        </div>

        {/* Latest bookings */}
        <div className="card p-5">
          <h2 className="font-medium mb-3 flex items-center gap-2"><FaHistory className="text-slate-600" /> Ultime prenotazioni</h2>
          {latest.length === 0 ? (
            <p className="text-sm text-black/70 dark:text-white/70">Nessuna prenotazione recente.</p>
          ) : (
            <ul className="divide-y">
              {latest.map((b) => (
                <li key={b.id} className="py-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.name} · {b.guests} ospiti</div>
                    <div className="text-black/60 dark:text-white/60">{format(new Date(b.date), "dd/MM/yyyy")}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: IconType; color: string }) {
  return (
<div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-black/60 dark:text-white/60">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <span className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;