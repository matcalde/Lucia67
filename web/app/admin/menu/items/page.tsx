"use client";

import { useEffect, useMemo, useState } from "react";
import { PAGINATION } from "@/lib/constants";
import { Pagination } from "@/app/components/Pagination";

type Section = { id: string; title: string };
type Item = { id: string; sectionId: string; name: string; note?: string | null; price?: string | null; featured: boolean; order: number; isActive: boolean };

export default function AdminMenuItems() {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newSectionId, setNewSectionId] = useState("");
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFeatured, setNewFeatured] = useState(false);
  const [newActive, setNewActive] = useState(true);
  const [newOrder, setNewOrder] = useState<number>(0);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterFeatured, setFilterFeatured] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("true");
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  // --- editing state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSectionId, setEditSectionId] = useState("");
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editOrder, setEditOrder] = useState<number>(0);

  useEffect(() => { loadSections(); loadItems(); }, []);

  const pushToast = (msg: string) => { setToast(msg); setShowToast(true); setTimeout(() => { setShowToast(false); setTimeout(() => setToast(null), 200); }, 2200); };

  const loadSections = async () => {
    const res = await fetch(`/api/admin/menu/sections?page=1&take=100`);
    const json = await res.json(); if (json.ok) setSections(json.data.items || []);
  };

  const loadItems = async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page)); sp.set("take", String(pagination.take));
      if (filterSection) sp.set("sectionId", filterSection);
      if (filterFeatured) sp.set("featured", filterFeatured);
      if (filterActive !== "all") sp.set("active", filterActive);
      const res = await fetch(`/api/admin/menu/items?${sp.toString()}`);
      const json = await res.json();
      if (json.ok) { setItems(json.data.items || []); setPagination({ page: json.data.page, total: json.data.total, take: json.data.take }); }
      else { alert(json.error || "Errore nel caricamento"); }
    } finally { setLoading(false); }
  };

  const createItem = async () => {
    if (!newSectionId || !newName) return alert("Sezione e nome richiesti");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId: newSectionId, name: newName, note: newNote || undefined, price: newPrice || undefined, featured: newFeatured, order: newOrder, isActive: newActive }) });
      const json = await res.json(); if (!json.ok) throw new Error(json.error || "Creazione fallita");
      setNewSectionId(""); setNewName(""); setNewNote(""); setNewPrice(""); setNewFeatured(false); setNewOrder(0); setNewActive(true); setFormOpen(false); await loadItems(1); pushToast("Piatto creato");
    } catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditSectionId(item.sectionId);
    setEditName(item.name);
    setEditNote(item.note || "");
    setEditPrice(item.price || "");
    setEditFeatured(!!item.featured);
    setEditOrder(item.order || 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editSectionId || !editName) return alert("Sezione e nome richiesti");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, data: { sectionId: editSectionId, name: editName, note: editNote || undefined, price: editPrice || undefined, featured: editFeatured, order: editOrder } }) });
      const json = await res.json(); if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
      await loadItems(pagination.page);
      setEditingId(null);
      pushToast("Piatto aggiornato");
    } catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(true);
    try { const res = await fetch("/api/admin/menu/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, data: { isActive: !isActive } }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error || "Aggiornamento fallito"); await loadItems(pagination.page); pushToast("Piatto aggiornato"); }
    catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Eliminare questo piatto?")) return;
    setLoading(true);
    try { const res = await fetch("/api/admin/menu/items", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error || "Eliminazione fallita"); await loadItems(pagination.page); pushToast("Piatto eliminato"); }
    catch (e: any) { alert(e.message || "Errore di rete"); } finally { setLoading(false); }
  };

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.take));

  return (
    <div>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200" style={{ opacity: showToast ? 1 : 0 }}>{toast}</div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Menu · Piatti</h1>
        <div className="flex items-center gap-3">
          <select value={filterSection} onChange={(e) => { setFilterSection(e.target.value); loadItems(1); }} className="input">
            <option value="">Tutte le sezioni</option>
            {sections.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
          </select>
          <select value={filterFeatured} onChange={(e) => { setFilterFeatured(e.target.value); loadItems(1); }} className="input">
            <option value="">Tutti</option>
            <option value="true">In evidenza</option>
            <option value="false">Non in evidenza</option>
          </select>
          <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); loadItems(1); }} className="input">
            <option value="true">Attivi</option>
            <option value="false">Inattivi</option>
            <option value="all">Tutti</option>
          </select>
          <div className="text-sm text-black/60 dark:text-white/60">Pagina {pagination.page} di {pageCount} · {pagination.total} totali</div>
          <button onClick={() => setFormOpen(true)} className="btn btn-glow btn-sm">+ Aggiungi</button>
        </div>
      </div>

      {formOpen && (
        <div className="mb-6 card p-4 space-y-4">
          <div>
            <label className="label block">Sezione</label>
            <select value={newSectionId} onChange={(e) => setNewSectionId(e.target.value)} className="input w-full">
              <option value="">Seleziona sezione</option>
              {sections.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
            </select>
          </div>
          <div>
            <label className="label block">Nome</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label block">Nota (opz.)</label>
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label block">Prezzo (opz.)</label>
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="input w-60" placeholder="es. 12€" />
          </div>
          <div className="flex items-center gap-2">
            <input id="featured" type="checkbox" checked={newFeatured} onChange={(e) => setNewFeatured(e.target.checked)} />
            <label htmlFor="featured">In evidenza</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="activeItem" type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
            <label htmlFor="activeItem">Attivo</label>
          </div>
          <div>
            <label className="label block">Ordine</label>
            <input type="number" value={newOrder} onChange={(e) => setNewOrder(parseInt(e.target.value || "0", 10))} className="input w-28" />
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
          <div className="p-6 text-center text-black/60 dark:text-white/60">Nessun piatto</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card p-4">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label block">Sezione</label>
                      <select value={editSectionId} onChange={(e) => setEditSectionId(e.target.value)} className="input w-full">
                        <option value="">Seleziona sezione</option>
                        {sections.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="label block">Nome</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input w-full" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label block">Nota (opz.)</label>
                      <input value={editNote} onChange={(e) => setEditNote(e.target.value)} className="input w-full" />
                    </div>
                    <div>
                      <label className="label block">Prezzo (opz.)</label>
                      <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="input w-60" placeholder="es. 12€" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)} /> In evidenza</label>
                    <label className="inline-flex items-center gap-2 text-sm">Ordine <input type="number" value={editOrder} onChange={(e) => setEditOrder(parseInt(e.target.value || "0", 10))} className="input w-24 ml-2" /></label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={loading} className="btn btn-glow btn-sm">Salva</button>
                    <button onClick={cancelEdit} className="btn btn-ghost btn-sm">Annulla</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-black/60 dark:text-white/60">Sezione: {sections.find(s => s.id === item.sectionId)?.title || "-"}</div>
                    <h3 className="font-medium">{item.name}</h3>
                    {item.note && <p className="text-sm text-black/70 dark:text-white/70 mt-1">{item.note}</p>}
                    {item.price && <div className="text-sm mt-1">{item.price}</div>}
                    <div className="text-xs text-black/60 dark:text-white/60 mt-2">{item.featured ? "In evidenza" : ""} · Ordine: {item.order}</div>
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