"use client";

import { useEffect, useMemo, useState } from "react";
import { PAGINATION } from "@/lib/constants";
import { UI } from "@/lib/constants";
import { FaPlus, FaSearch, FaTrash, FaEdit, FaStar } from "react-icons/fa";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Review = {
  id: string;
  name: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  approved: boolean;
};

type Paged<T> = { items: T[]; total: number; page: number; take: number };

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Review[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [approvedFilter, setApprovedFilter] = useState<"" | "true" | "false">("");
  // Toast stato azioni
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Create/Edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [approved, setApproved] = useState(false);

  const fetchList = async (page = 1) => {
    try {
      setLoading(true);
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pagination.take));
      if (search) sp.set("search", search);
      if (minRating) sp.set("minRating", String(minRating));
      if (approvedFilter) sp.set("approved", approvedFilter);
      const res = await fetch(`/api/admin/reviews?${sp.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore caricamento");
      const data = json.data as Paged<Review>;
      setItems(data.items);
      setPagination({ page: data.page, take: data.take, total: data.total });
    } catch (e) {
      console.error(e);
      alert("Errore nel caricamento delle recensioni");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(1); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchList(1), UI.DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, minRating, approvedFilter]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setRating(5);
    setComment("");
    setApproved(false);
  };

  const pushToast = (msg: string) => {
    setToast(msg);
    setShowToast(true);
    setTimeout(() => { setShowToast(false); setTimeout(() => setToast(null), 200); }, 2500);
  };

  const openCreate = () => { resetForm(); setFormOpen(true); };
  const openEdit = (r: Review) => {
    setEditingId(r.id);
    setName(r.name);
    setRating(r.rating);
    setComment(r.comment || "");
    setApproved(r.approved);
    setFormOpen(true);
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      const wasEditing = !!editingId;
      const payload = { name, rating, comment: comment || undefined, approved };
      const res = await fetch("/api/admin/reviews", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, data: payload } : payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore salvataggio");
      setFormOpen(false);
      resetForm();
      await fetchList(pagination.page);
      pushToast(wasEditing ? "Recensione aggiornata" : "Recensione creata");
    } catch (e) {
      console.error(e);
      alert("Errore nel salvataggio della recensione");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questa recensione?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore eliminazione");
      await fetchList(pagination.page);
      pushToast("Recensione eliminata");
    } catch (e) {
      console.error(e);
      alert("Errore nell'eliminazione");
    } finally {
      setLoading(false);
    }
  };

  const toggleApproved = async (id: string, next: boolean) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data: { approved: next } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore aggiornamento stato");
      await fetchList(pagination.page);
      pushToast(next ? "Recensione pubblicata" : "Spostata in bozza");
    } catch (e) {
      console.error(e);
      alert("Errore nel cambio di stato");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(pagination.total / pagination.take)), [pagination]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200" style={{ opacity: showToast ? 1 : 0 }}>
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recensioni</h1>
          <p className="text-black/70 dark:text-white/70 text-sm">Gestisci le recensioni degli ospiti.</p>
        </div>
        <button onClick={openCreate} className="btn btn-glow inline-flex items-center gap-2"><FaPlus /> Nuova recensione</button>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FaSearch className="text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per nome o commento..." className="input" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm">Valutazione minima</label>
          <select value={minRating} onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : "")} className="select">
            <option value="">Tutte</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Stato</label>
          <select value={approvedFilter} onChange={(e) => setApprovedFilter(e.target.value as any)} className="select">
            <option value="">Tutte</option>
            <option value="true">Pubblicate</option>
            <option value="false">Bozze</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Valutazione</th>
              <th className="text-left p-3">Commento</th>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Stato</th>
              <th className="p-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s-${i}`} className="border-t animate-pulse">
                  <td className="p-3"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="h-4 w-64 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
                  <td className="p-3 text-right"><div className="h-8 w-40 bg-slate-200 rounded" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nessuna recensione trovata</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-amber-500">{Array.from({ length: r.rating }).map((_,i) => <FaStar key={i} />)}<span className="ml-1 text-xs text-slate-500">{r.rating}/5</span></span>
                </td>
                <td className="p-3 max-w-md truncate" title={r.comment || ""}>{r.comment}</td>
                <td className="p-3">{format(new Date(r.createdAt), "dd MMM yyyy", { locale: it })}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.approved ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {r.approved ? "Pubblicata" : "Bozza"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button disabled={loading} onClick={() => openEdit(r)} className="btn btn-secondary btn-sm inline-flex items-center gap-1"><FaEdit /> Modifica</button>
                    <button disabled={loading} onClick={() => toggleApproved(r.id, !r.approved)} className={`btn btn-sm ${r.approved ? "btn-warning" : "btn-success"}`}>
                      {r.approved ? "Metti in bozza" : "Pubblica"}
                    </button>
                    <button disabled={loading} onClick={() => remove(r.id)} className="btn btn-danger btn-sm inline-flex items-center gap-1"><FaTrash /> Elimina</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Totale: {pagination.total}</div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" disabled={pagination.page === 1 || loading} onClick={() => fetchList(pagination.page - 1)}>Precedente</button>
          <span className="text-sm">Pagina {pagination.page} / {totalPages}</span>
          <button className="btn btn-sm" disabled={pagination.page >= totalPages || loading} onClick={() => fetchList(pagination.page + 1)}>Successiva</button>
        </div>
      </div>

      {/* Modal form */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">{editingId ? "Modifica recensione" : "Nuova recensione"}</h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm">Nome</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Valutazione (1-5)</label>
                <input type="number" min={1} max={5} className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Commento</label>
                <textarea className="textarea" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input id="approved" type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                <label htmlFor="approved" className="text-sm">Pubblicata</label>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button disabled={loading} onClick={() => setFormOpen(false)} className="btn">Annulla</button>
                <button disabled={loading} onClick={submitForm} className="btn btn-glow">Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}