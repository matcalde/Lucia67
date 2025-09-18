"use client";

import { useEffect, useState } from "react";
import { PAGINATION } from "@/lib/constants";
import { Pagination } from "@/app/components/Pagination";

type Section = { id: string; title: string; description?: string | null; order: number; isActive: boolean };

export default function AdminMenuSections() {
  const [items, setItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOrder, setNewOrder] = useState<number>(0);
  const [newActive, setNewActive] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [filterActive, setFilterActive] = useState<string>("true");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editActive, setEditActive] = useState<boolean>(true);

  useEffect(() => { loadItems(); }, []);

  const pushToast = (msg: string) => { setToast(msg); setShowToast(true); setTimeout(() => { setShowToast(false); setTimeout(() => setToast(null), 200); }, 2200); };

  const loadItems = async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page)); sp.set("take", String(pagination.take));
      if (filterActive !== "all") sp.set("active", filterActive);
      const res = await fetch(`/api/admin/menu/sections?${sp.toString()}`);
      const json = await res.json(); if (json.ok) { setItems(json.data.items || []); setPagination({ page: json.data.page, total: json.data.total, take: json.data.take }); }
      else { alert(json.error || "Errore nel caricamento"); }
    } finally { setLoading(false); }
  };

  const createItem = async () => {
    if (!newTitle) return alert("Titolo richiesto");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle, description: newDescription || undefined, order: newOrder, isActive: newActive }) });
      const json = await res.json(); if (!json.ok) throw new Error(json.error || "Creazione fallita");
      setNewTitle(""); setNewDescription(""); setNewOrder(0); setNewActive(true); setFormOpen(false); await loadItems(1); pushToast("Sezione creata");
    } catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const startEdit = (item: Section) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditOrder(item.order);
    setEditActive(item.isActive);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editTitle.trim()) return alert("Titolo richiesto");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, data: { title: editTitle.trim(), description: editDescription.trim() || undefined, order: Number.isFinite(editOrder) ? editOrder : 0, isActive: editActive } }) });
      const json = await res.json(); if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
      await loadItems(pagination.page);
      setEditingId(null);
      pushToast("Sezione aggiornata");
    } catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(true);
    try { const res = await fetch("/api/admin/menu/sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, data: { isActive: !isActive } }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error || "Aggiornamento fallito"); await loadItems(pagination.page); pushToast("Sezione aggiornata"); }
    catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Eliminare questa sezione?")) return;
    setLoading(true);
    try { const res = await fetch("/api/admin/menu/sections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error || "Eliminazione fallita"); await loadItems(pagination.page); pushToast("Sezione eliminata"); }
    catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.take));

  return (
    <div>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200" style={{ opacity: showToast ? 1 : 0 }}>{toast}</div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Menu · Sezioni</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-black/60 dark:text-white/60">Pagina {pagination.page} di {pageCount} · {pagination.total} totali</div>
          <button onClick={() => setFormOpen(true)} className="btn btn-glow btn-sm">+ Aggiungi</button>
        </div>
      </div>

      {formOpen && (
        <div className="mb-6 card p-4 space-y-4">
          <div>
            <label className="label block">Titolo</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label block">Descrizione</label>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input w-full min-h-24" rows={3} />
          </div>
          <div>
            <label className="label block">Ordine</label>
            <input type="number" value={newOrder} onChange={(e) => setNewOrder(parseInt(e.target.value || "0", 10))} className="input w-28" />
          </div>
          <div className="flex items-center gap-2">
            <input id="activeSec" type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
            <label htmlFor="activeSec">Attivo</label>
          </div>
          <div className="flex gap-2">
            <button onClick={createItem} disabled={loading} className="btn btn-glow btn-sm">Crea</button>
            <button onClick={() => setFormOpen(false)} className="btn btn-ghost btn-sm">Annulla</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading && items.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`s-${i}`} className="card p-4 animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="mt-2 h-4 w-full bg-slate-200 rounded" />
              <div className="mt-2 h-4 w-2/3 bg-slate-200 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-black/60 dark:text-white/60">Nessuna sezione</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card p-4">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="label block">Titolo</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="label block">Descrizione</label>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input w-full min-h-24" rows={3} />
                  </div>
                  <div>
                    <label className="label block">Ordine</label>
                    <input type="number" value={editOrder} onChange={(e) => setEditOrder(parseInt(e.target.value || "0", 10))} className="input w-28" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id={`active-${item.id}`} type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                    <label htmlFor={`active-${item.id}`}>Attivo</label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={loading} className="btn btn-glow btn-sm">Salva</button>
                    <button onClick={cancelEdit} className="btn btn-ghost btn-sm">Annulla</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    {item.description && <p className="text-sm text-black/70 dark:text-white/70 mt-1">{item.description}</p>}
                    <div className="text-xs text-black/60 dark:text-white/60 mt-2">Ordine: {item.order}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`badge ${item.isActive ? "badge--success" : ""}`}>{item.isActive ? "Attivo" : "Inattivo"}</span>
                    <button onClick={() => startEdit(item)} disabled={loading} className="btn btn-ghost btn-sm">Modifica</button>
                    <button onClick={() => toggleActive(item.id, item.isActive)} disabled={loading} className="btn btn-ghost btn-sm">{item.isActive ? "Disattiva" : "Attiva"}</button>
                    <button onClick={() => deleteItem(item.id)} disabled={loading} className="btn btn-ghost btn-sm text-red-600">Elimina</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination page={pagination.page} pageCount={pageCount} makeHref={() => "#"} onPageChange={(p) => loadItems(p)} />
        </div>
      )}
    </div>
  );
}