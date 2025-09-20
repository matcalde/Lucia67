"use client";

import { useEffect, useState, useMemo } from "react";
import { Pagination } from "@/app/components/Pagination";
import { PAGINATION } from "@/lib/constants";
import { format } from "date-fns";

type Booking = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  date: string; // ISO string dal backend
  guests: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes?: string;
  allergies?: string;
  preferences?: string;
};

type DisabledDay = { id: string; day: string; reason?: string | null };

export default function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  const [filter, setFilter] = useState<"all" | Booking["status"]>("all");
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Disabled days admin state
  const [disabledDays, setDisabledDays] = useState<DisabledDay[]>([]);
  const [ddLoading, setDdLoading] = useState(false);
  const [newDisabledDate, setNewDisabledDate] = useState("");
  const [newDisabledReason, setNewDisabledReason] = useState("");

  useEffect(() => {
    load();
    loadDisabledDays();
  }, []);

  const pushToast = (msg: string) => {
    setToast(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setTimeout(() => setToast(null), 200);
    }, 2200);
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pagination.take));
      if (filter !== "all") sp.set("status", filter);
      const res = await fetch(`/api/admin/bookings?${sp.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.data.items);
        setPagination({ page: json.data.page, total: json.data.total, take: json.data.take });
      } else {
        alert(json.error || "Errore nel caricamento");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDisabledDays = async () => {
    setDdLoading(true);
    try {
      const res = await fetch("/api/admin/disabled-days");
      const json = await res.json();
      if (json.ok) setDisabledDays(json.data.items);
    } finally {
      setDdLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Booking["status"]) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
      await load(pagination.page);
      const msg = status === "CONFIRMED" ? "confermata" : status === "CANCELLED" ? "annullata" : "aggiornata";
      pushToast(`Prenotazione ${msg}`);
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setActionLoading(false);
    }
  };

  const updateDate = async (id: string, dateISO: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date: dateISO }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Aggiornamento data fallito");
      await load(pagination.page);
      pushToast("Data prenotazione aggiornata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questa prenotazione?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Eliminazione fallita");
      await load(pagination.page);
      pushToast("Prenotazione eliminata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setActionLoading(false);
    }
  };

  const addDisabledDay = async () => {
    if (!newDisabledDate) return alert("Seleziona una data");
    setDdLoading(true);
    try {
      const res = await fetch("/api/admin/disabled-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: newDisabledDate, reason: newDisabledReason || undefined }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Salvataggio fallito");
      setNewDisabledDate("");
      setNewDisabledReason("");
      await loadDisabledDays();
      pushToast("Giorno disabilitato aggiunto");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setDdLoading(false);
    }
  };

  const removeDisabledDay = async (id: string) => {
    if (!confirm("Ripristinare la disponibilità per questo giorno?")) return;
    setDdLoading(true);
    try {
      const res = await fetch("/api/admin/disabled-days", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Eliminazione fallita");
      await loadDisabledDays();
      pushToast("Giorno disabilitato rimosso");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setDdLoading(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.take));
  const makeHref = () => "#";

  const filtered = useMemo(() => items, [items]);

  const statusBadge = (s: Booking["status"]) =>
    s === "CONFIRMED" ? "badge--success" : s === "CANCELLED" ? "badge--warning" : "";

  const exportCsv = () => {
    const sp = new URLSearchParams();
    if (filter !== "all") sp.set("status", filter);
    const qs = sp.toString();
    const url = `/api/admin/bookings/export${qs ? `?${qs}` : ""}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200"
          style={{ opacity: showToast ? 1 : 0 }}
        >
          {toast}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Prenotazioni</h1>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="input">
            <option value="all">Tutte</option>
            <option value="PENDING">In attesa</option>
            <option value="CONFIRMED">Confermate</option>
            <option value="CANCELLED">Annullate</option>
          </select>
          <button onClick={() => load(1)} className="btn btn-secondary btn-sm">Applica</button>
          <button onClick={exportCsv} className="btn btn-glow btn-sm" aria-label="Esporta prenotazioni in CSV">Esporta CSV</button>
        </div>
      </div>

      {/* Gestione giorni disabilitati */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Giorni disabilitati</h2>
          <div className="flex items-center gap-2">
            <input type="date" className="input" value={newDisabledDate} onChange={(e) => setNewDisabledDate(e.target.value)} />
            <input type="text" className="input" placeholder="Motivo (opzionale)" value={newDisabledReason} onChange={(e) => setNewDisabledReason(e.target.value)} />
            <button disabled={ddLoading} onClick={addDisabledDay} className="btn btn-ghost">Aggiungi</button>
          </div>
        </div>
        {ddLoading && disabledDays.length === 0 ? (
          <div className="text-sm text-black/60 dark:text-white/60">Caricamento...</div>
        ) : disabledDays.length === 0 ? (
          <div className="text-sm text-black/60 dark:text-white/60">Nessun giorno disabilitato</div>
        ) : (
          <ul className="divide-y">
            {disabledDays.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{format(new Date(d.day), "dd/MM/yyyy")}</div>
                  {d.reason && <div className="text-sm text-black/60 dark:text-white/60">{d.reason}</div>}
                </div>
                <button disabled={ddLoading} onClick={() => removeDisabledDay(d.id)} className="btn btn-ghost btn-sm text-red-600">Rimuovi</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`sk-${i}`} className="card p-4 animate-pulse">
              <div className="h-5 w-56 bg-slate-200 rounded" />
              <div className="mt-2 h-4 w-full bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center text-black/60 dark:text-white/60">Nessuna prenotazione</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{b.name} · {b.guests} ospiti</div>
                  <div className="text-sm text-black/70 dark:text-white/70">
                    {format(new Date(b.date), "dd/MM/yyyy HH:mm")} <span className="text-xs text-black/60 dark:text-white/60">(orario indicativo)</span> · Tel: {b.phone}{b.email ? ` · ${b.email}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusBadge(b.status)}`}>{b.status.toLowerCase()}</span>
                  <button disabled={actionLoading} onClick={() => updateStatus(b.id, "CONFIRMED")} className="btn btn-ghost btn-sm">Conferma</button>
                  <button disabled={actionLoading} onClick={() => updateStatus(b.id, "CANCELLED")} className="btn btn-ghost btn-sm">Annulla</button>
                  <button disabled={actionLoading} onClick={() => remove(b.id)} className="btn btn-ghost btn-sm text-red-600">Elimina</button>
                </div>
              </div>
              {/* Editor cambio data */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="date"
                  className="input"
                  defaultValue={new Date(b.date).toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const day = e.target.value; // yyyy-MM-dd
                    // Manteniamo l'orario corrente
                    const current = new Date(b.date);
                    const dateISO = `${day}T${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}:00`;
                    (e.target as any)._nextIso = dateISO;
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousSibling as HTMLInputElement) as any;
                    const iso = input?._nextIso || new Date(b.date).toISOString();
                    updateDate(b.id, iso);
                  }}
                >Modifica data</button>
              </div>
              {b.allergies && <div className="mt-2 text-sm">Allergie/Intolleranze: {b.allergies}</div>}
              {b.preferences && <div className="mt-1 text-sm">Preferenze/Richieste: {b.preferences}</div>}
              {b.notes && <div className="mt-1 text-sm">Note: {b.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination page={pagination.page} pageCount={pageCount} makeHref={makeHref} onPageChange={(p) => load(p)} />
        </div>
      )}
    </div>
  );
}