"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/app/components/Pagination";
import { PAGINATION, GALLERY_CATEGORY_VALUES, GALLERY_CATEGORY_LABELS } from "@/lib/constants";
import type { GalleryCategory } from "@/lib/constants";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1920; // max width/height in px for compression

type Img = { id: string; url: string; alt: string; title?: string; description?: string; order: number; isActive: boolean; category?: GalleryCategory };

export default function AdminGalleryPage() {
  const [images, setImages] = useState<Img[]>([]);
  const [form, setForm] = useState({ url: "", alt: "", title: "", description: "", order: 0, category: "GENERIC" as (typeof GALLERY_CATEGORY_VALUES)[number] });
  const [filterCategory, setFilterCategory] = useState<"ALL" | GalleryCategory>("ALL");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  // Env/config status (from API)
  const [config, setConfig] = useState<{ supabaseConfigured: boolean; environment: { isProduction: boolean; nodeEnv: string; vercel: boolean } } | null>(null);

  const fileInfo = useMemo(() => {
    if (!file) return null;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} • ${sizeMB} MB`;
  }, [file]);

  const pushToast = (msg: string) => {
    setToast(msg);
    setShowToast(true);
    setTimeout(() => { setShowToast(false); setTimeout(() => setToast(null), 200); }, 2200);
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pagination.take));
      if (filterCategory !== "ALL") sp.set("category", filterCategory);
      // ask API to include config status for Admin banners/UI hints
      sp.set("config", "1");

      const res = await fetch(`/api/admin/gallery?${sp.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setImages(json.data.items || []);
        setPagination({ page: json.data.page, total: json.data.total, take: json.data.take });
        if (json.data.config) setConfig(json.data.config);
      } else {
        alert(json.error || "Errore nel caricamento");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filterCategory]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const toggle = async (id: string, isActive: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data: { isActive: !isActive } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Aggiornamento fallito");
      await load(pagination.page);
      pushToast("Immagine aggiornata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare l’immagine?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Eliminazione fallita");
      await load(pagination.page);
      pushToast("Immagine eliminata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  async function createViaUrl() {
    if (!form.url || !form.alt) return alert("Inserisci URL e ALT");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url, alt: form.alt, title: form.title || undefined, description: form.description || undefined, order: form.order || 0, isActive: true, category: form.category || "GENERIC" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Creazione fallita");
      setForm({ url: "", alt: "", title: "", description: "", order: 0, category: "GENERIC" });
      await load(1);
      pushToast("Immagine aggiunta");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  async function compressImageFile(inputFile: File): Promise<File> {
    // Try to compress to WebP keeping max dimension and ~0.85 quality
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lettura file fallita"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(inputFile);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Immagine non valida"));
      image.src = dataUrl;
    });

    const { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return inputFile;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
    );

    if (!blob) return inputFile;

    // If compressed larger than original, keep original
    if (blob.size >= inputFile.size) return inputFile;

    return new File([blob], inputFile.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  }

  async function createViaFile() {
    if (!file || !form.alt) return alert("Seleziona un file e inserisci ALT");

    // Compress client-side
    let toUpload = file;
    try {
      toUpload = await compressImageFile(file);
    } catch (e) {
      // ignore compression failure, fallback to original file
      toUpload = file;
    }

    // Enforce 5MB max size
    if (toUpload.size > MAX_FILE_SIZE) {
      return alert("File troppo grande (max 5MB). Riduci l'immagine e riprova.");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", toUpload);
      fd.append("alt", form.alt);
      if (form.title) fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);
      fd.append("order", String(form.order || 0));
      fd.append("isActive", "true");
      fd.append("category", form.category || "GENERIC");

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload fallito");
      setFile(null);
      await load(1);
      pushToast("Immagine caricata");
    } catch (e: any) {
      alert(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg transition-opacity duration-200" style={{ opacity: showToast ? 1 : 0 }}>
          {toast}
        </div>
      )}

      <h1 className="text-xl font-semibold">Galleria</h1>
 
      <div className="flex items-end gap-3">
        <div>
          <label className="label block">Filtro categoria</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as ("ALL" | GalleryCategory))} className="input">
            <option value="ALL">Tutte</option>
            {GALLERY_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="pb-1">
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterCategory("ALL"); load(1); }} disabled={loading}>Reset</button>
        </div>
      </div>
 
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div>
          <label className="label block">URL immagine</label>
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input w-full" placeholder="/window.svg o https://..." />
          <p className="text-xs text-black/60 mt-1">Suggerimento: carica le immagini nella cartella /public e usa il percorso relativo (es. /file.svg).</p>
        </div>
        <div>
          <label className="label block">ALT</label>
          <input value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} className="input w-full" />
        </div>
        <div>
          <label className="label block">Titolo</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input w-full" />
        </div>
        <div>
          <label className="label block">Descrizione</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full" />
        </div>
        <div>
          <label className="label block">Ordine</label>
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="input w-full" />
        </div>
        <div>
          <label className="label block">Categoria</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GalleryCategory })} className="input w-full">
            {GALLERY_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={createViaUrl} disabled={loading} className="btn btn-glow btn-sm">Aggiungi da URL</button>
          <button onClick={async () => { await createViaUrl(); }} style={{ display: 'none' }} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div>
          <label className="label block">Carica file</label>
          {config?.environment?.isProduction && !config?.supabaseConfigured && (
            <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              In produzione l'upload locale è disabilitato su Vercel. Configura Supabase per abilitare il caricamento file, oppure usa "Aggiungi da URL".
            </div>
          )}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input w-full" />
          <p className="text-xs text-black/60 mt-1">
            {config?.environment?.isProduction
              ? "In produzione: i file vengono caricati su Supabase Storage."
              : "In sviluppo: il file verrà salvato in /public/uploads."}
          </p>
          {file && (
            <div className="mt-3 flex items-center gap-3">
              {previewUrl && <img src={previewUrl} alt="preview" className="w-24 h-24 object-cover rounded border" />}
              <div className="text-xs text-black/70 dark:text-white/70">
                <div>{fileInfo}</div>
                <div>Limite: 5MB. Se necessario, l'immagine verrà compressa prima dell'upload.</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-end">
          <button onClick={createViaFile} disabled={loading || !file || (config?.environment?.isProduction && !config?.supabaseConfigured)} className="btn btn-glow btn-sm">Carica</button>
        </div>
      </div>

      <div className="grid gap-4">
        {loading && images.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`s-${i}`} className="card p-4 flex gap-4 items-center animate-pulse">
              <div className="w-24 h-24 rounded bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-64 bg-slate-200 rounded" />
              </div>
              <div className="w-40 h-8 bg-slate-200 rounded" />
            </div>
          ))
        ) : images.length === 0 ? (
          <div className="p-6 text-center text-black/60 dark:text-white/60">Nessuna immagine</div>
        ) : (
          images.map((img) => (
            <div key={img.id} className="card p-4 flex gap-4 items-center">
              <img src={img.url} alt={img.alt} className="w-24 h-24 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <span>{img.title || img.alt}</span>
                  {img.category && <span className="badge">{GALLERY_CATEGORY_LABELS[img.category as GalleryCategory]}</span>}
                </div>
                {img.description && <div className="text-sm text-black/70 dark:text-white/70">{img.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${img.isActive ? "badge--success" : ""}`}>{img.isActive ? "Attiva" : "Inattiva"}</span>
                <button onClick={() => toggle(img.id, img.isActive)} className="btn btn-ghost btn-sm" disabled={loading}>{img.isActive ? "Disattiva" : "Attiva"}</button>
                <button onClick={() => remove(img.id)} className="btn btn-ghost btn-sm text-red-600" disabled={loading}>Elimina</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination page={pagination.page} total={pagination.total} take={pagination.take} onPageChange={(p) => load(p)} />
    </div>
  );
}