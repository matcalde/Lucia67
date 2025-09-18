"use client";

import { useState, useEffect } from "react";
import { Pagination } from "@/app/components/Pagination";
import { PAGINATION, GALLERY_CATEGORY_VALUES, GALLERY_CATEGORY_LABELS } from "@/lib/constants";
import type { GalleryCategory } from "@/lib/constants";

type Announcement = { id: string; title: string; content: string; isActive: boolean; eventDate?: string | null };

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newEventDate, setNewEventDate] = useState<string>("");
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Image Picker (Gallery EVENTS)
  type PickerImg = { id: string; url: string; alt: string; isActive: boolean };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItems, setPickerItems] = useState<PickerImg[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<PickerImg | null>(null);
  const [pickerPagination, setPickerPagination] = useState({ page: 1, total: 0, take: 12 });
  const [pickerCategory, setPickerCategory] = useState<GalleryCategory>("EVENTS");
  const [pickerActiveOnly, setPickerActiveOnly] = useState(true);
  type PickerMode = "create" | "edit";
  const [pickerMode, setPickerMode] = useState<PickerMode>("create");
  const [editingImageForId, setEditingImageForId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const pushToast = (msg: string) => {
    setToast(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setTimeout(() => setToast(null), 200);
    }, 2200);
  };

  const loadItems = async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pagination.take));
      const res = await fetch(`/api/admin/announcements?${sp.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.data.items || []);
        setPagination({ page: json.data.page, total: json.data.total, take: json.data.take });
      } else {
        alert(json.error || "Errore nel caricamento");
      }
    } finally {
      setLoading(false);
    }
  };

  // Loader immagini per il Picker (categoria EVENTS)
  const loadPicker = async (page = 1) => {
    setPickerLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pickerPagination.take));
      sp.set("category", pickerCategory);
      const res = await fetch(`/api/admin/gallery?${sp.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setPickerItems((json.data.items || []).map((it: any) => ({ id: it.id, url: it.url, alt: it.alt, isActive: !!it.isActive })));
        setPickerPagination({ page: json.data.page, total: json.data.total, take: json.data.take });
      } else {
        alert(json.error || "Errore nel caricamento galleria");
      }
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (pickerOpen) {
      setPickerSelected(null);
      loadPicker(1);
    }
  }, [pickerOpen]);
  useEffect(() => {
    if (pickerOpen) loadPicker(1);
  }, [pickerCategory]);

  const createItem = async () => {
    if (!newTitle || !newContent) return alert("Compila titolo e contenuto");
    setLoading(true);
    try {
      const payload: any = { title: newTitle, content: newContent };
      if (newEventDate) payload.eventDate = newEventDate; // as YYYY-MM-DD
      if (newImageUrl) payload.imageUrl = newImageUrl;
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Creazione fallita");
      setNewTitle("");
      setNewContent("");
      setNewEventDate("");
      setNewImageUrl("");
      setFormOpen(false);
      await loadItems(1);
      pushToast("Comunicazione creata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data: { isActive: !isActive } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
      await loadItems(pagination.page);
      pushToast("Comunicazione aggiornata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Eliminare questo comunicato?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Eliminazione fallita");
      await loadItems(pagination.page);
      pushToast("Comunicazione eliminata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.take));
  const pickerPageCount = Math.max(1, Math.ceil(pickerPagination.total / pickerPagination.take));
  const makeHref = (p: number) => {
    return "#"; // client-side pagination via AJAX
  };
  const handlePageChange = (p: number) => { loadItems(p); };

  async function applySelectedImage() {
    if (!pickerSelected) return;
    if (pickerMode === "create") {
      setNewImageUrl(pickerSelected.url);
      setPickerOpen(false);
      return;
    }
    if (pickerMode === "edit" && editingImageForId) {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingImageForId, data: { imageUrl: pickerSelected.url } }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
        pushToast("Immagine aggiornata");
        await loadItems(pagination.page);
        setPickerOpen(false);
      } catch (e: any) {
        alert(e.message || "Errore di rete");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200" style={{ opacity: showToast ? 1 : 0 }}>
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Comunicati</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-black/60 dark:text-white/60">
            Pagina {pagination.page} di {pageCount} · {pagination.total} totali
          </div>
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
            <label className="label block">Contenuto</label>
            <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} className="input w-full min-h-24" rows={3} />
          </div>
          <div>
            <label className="label block">Data evento (opzionale)</label>
            <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="input w-full" />
            <p className="mt-1 text-xs text-black/50 dark:text-white/60">Serve per evidenziare il giorno corretto per la prenotazione.</p>
          </div>
          <div>
            <label className="label block">URL immagine (opzionale)</label>
            <div className="flex gap-2">
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="input w-full" placeholder="https://..." />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPickerMode("create");
                  setEditingImageForId(null);
                  setPickerOpen(true);
                }}
              >
                Scegli dalla Galleria
              </button>
            </div>
            <p className="mt-1 text-xs text-black/50 dark:text-white/60">Puoi usare un URL della Galleria o un link esterno. Il selettore mostra la categoria EVENTS.</p>
            {newImageUrl && (
              <div className="mt-2">
                <div className="text-xs mb-1 text-black/60 dark:text-white/60">Anteprima</div>
                <img src={newImageUrl} alt="Anteprima" className="h-28 w-auto rounded border object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/hero.svg"; }} />
              </div>
            )}
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
          <div className="p-6 text-center text-black/60 dark:text-white/60">Nessun comunicato</div>
        ) : (
          items.map((item) => {
            const dateStr = item.eventDate ? new Date(item.eventDate).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : null;
            return (
              <div key={item.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {item.title}
                      {dateStr && <span className="ml-2 text-xs text-black/60 dark:text-white/60">· {dateStr}</span>}
                    </h3>
                    <p className="text-sm text-black/70 dark:text-white/70 mt-1">{item.content}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`badge ${item.isActive ? "badge--success" : ""}`}>{item.isActive ? "Attivo" : "Inattivo"}</span>
                    <button onClick={() => toggleActive(item.id, item.isActive)} disabled={loading} className="btn btn-ghost btn-sm">
                      {item.isActive ? "Disattiva" : "Attiva"}
                    </button>
                    <button onClick={() => { setPickerMode("edit"); setEditingImageForId(item.id); setPickerOpen(true); }} disabled={loading} className="btn btn-ghost btn-sm">Cambia immagine</button>
                    <button onClick={() => deleteItem(item.id)} disabled={loading} className="btn btn-ghost btn-sm text-red-600">Elimina</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination 
            page={pagination.page}
            pageCount={pageCount}
            makeHref={makeHref}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Image Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPickerOpen(false)} />
          <div className="relative z-10 w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden rounded-lg bg-white dark:bg-slate-900 shadow-xl border border-black/10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-medium">Seleziona immagine (categoria EVENTS)</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(false)}>Chiudi</button>
            </div>
            <div className="px-4 py-2 flex items-center gap-3 border-b">
              <div>
                <label className="label block text-xs">Categoria</label>
                <select className="input input-sm" value={pickerCategory} onChange={(e) => setPickerCategory(e.target.value as GalleryCategory)}>
                  {GALLERY_CATEGORY_VALUES.map((c) => (
                    <option key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm mt-4">
                <input type="checkbox" className="checkbox" checked={pickerActiveOnly} onChange={(e) => setPickerActiveOnly(e.target.checked)} />
                Solo attive
              </label>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: "70vh" }}>
              {pickerLoading && pickerItems.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`sk-${i}`} className="h-28 rounded bg-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="p-6 text-center text-black/60 dark:text-white/60">Nessuna immagine in categoria EVENTS</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(pickerActiveOnly ? pickerItems.filter((it) => it.isActive) : pickerItems).map((it) => {
                    const selected = pickerSelected?.id === it.id;
                    return (
                      <button type="button" key={it.id} onClick={() => setPickerSelected(it)} className={`relative block rounded overflow-hidden border ${selected ? "ring-2 ring-emerald-500 border-emerald-500" : "border-black/10"}`}>
                        <img src={it.url || "/hero.svg"} alt={it.alt || ""} className="h-28 w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/hero.svg"; }} />
                        {!it.isActive && <span className="absolute top-1 left-1 text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">Inattiva</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-xs text-black/60 dark:text-white/60">
                {pickerSelected ? `Selezionata: ${pickerSelected.alt || pickerSelected.url}` : "Nessuna selezionata"}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(false)}>Annulla</button>
                <button className="btn btn-glow btn-sm" disabled={!pickerSelected || (pickerMode === "edit" && !editingImageForId)} onClick={applySelectedImage}>Usa immagine</button>
              </div>
            </div>
            {pickerPageCount > 1 && (
              <div className="px-4 py-2 border-t flex justify-center">
                <Pagination
                  page={pickerPagination.page}
                  pageCount={pickerPageCount}
                  makeHref={() => "#"}
                  onPageChange={(p) => loadPicker(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}