"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { GalleryCategory } from "@/lib/constants";
import { FaUtensils, FaBeer, FaMusic, FaHome, FaUserCircle, FaImage } from "react-icons/fa";

export type GalleryImage = { src: string; alt: string; category?: GalleryCategory };

type Props = {
  images: GalleryImage[];
  className?: string;
};

export default function Gallery({ images, className }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const count = images.length;
  const current = useMemo(() => images[index], [images, index]);

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  const CATEGORY_META: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }>
    = useMemo(() => ({
      FOOD: { Icon: FaUtensils, label: "Cucina", color: "text-orange-700", bg: "bg-orange-50" },
      DRINKS: { Icon: FaBeer, label: "Bevande", color: "text-amber-700", bg: "bg-amber-50" },
      AMBIENCE: { Icon: FaHome, label: "Ambiente", color: "text-purple-700", bg: "bg-purple-50" },
      EVENTS: { Icon: FaMusic, label: "Eventi", color: "text-indigo-700", bg: "bg-indigo-50" },
      PEOPLE: { Icon: FaUserCircle, label: "Clienti", color: "text-rose-700", bg: "bg-rose-50" },
      GENERIC: { Icon: FaImage, label: "Galleria", color: "text-slate-700", bg: "bg-white/80" },
      HERO: { Icon: FaImage, label: "Hero", color: "text-slate-700", bg: "bg-white/80" },
    }), []);

  return (
    <div className={className}>
      {/* Masonry */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        {images.map((img, i) => (
          <button
            key={`${img.src}-${i}`}
            type="button"
            className="mb-4 block w-full break-inside-avoid rounded-xl border glass shadow-soft group text-left"
            aria-label={`Apri immagine ${i + 1}`}
            onClick={() => openAt(i)}
          >
            <div className={`relative w-full ${i % 3 === 0 ? "aspect-[4/5]" : i % 3 === 1 ? "aspect-square" : "aspect-[16/10]"} overflow-hidden rounded-xl`}>
              {/* Category badge */}
              {img.category && img.category !== "HERO" && (
                (() => {
                  const meta = CATEGORY_META[String(img.category)];
                  if (!meta) return null;
                  const { Icon, label, color, bg } = meta;
                  return (
                    <span className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs border shadow ${bg} ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{label}</span>
                    </span>
                  );
                })()
              )}
              <img
                src={img.src || "/hero.svg"}
                alt={img.alt || "Immagine"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  if (t.dataset.fallback !== "1") {
                    t.dataset.fallback = "1";
                    t.src = "/hero.svg";
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lightbox galleria"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          {/* Content */}
          <div className="relative z-10 mx-4 sm:mx-8 max-w-6xl w-full">
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              <img
                src={current.src}
                alt={current.alt}
                className="w-full h-[60vh] sm:h-[75vh] object-contain bg-black"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  if (t.dataset.fallback !== "1") {
                    t.dataset.fallback = "1";
                    t.src = "/hero.svg";
                  }
                }}
              />
              {/* Controls */}
              <button
                type="button"
                onClick={close}
                aria-label="Chiudi"
                className="absolute top-3 right-3 rounded-full bg-black/60 text-white p-2 hover:bg-black/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <button
                type="button"
                onClick={prev}
                aria-label="Precedente"
                className="absolute inset-y-0 left-0 flex items-center px-3 text-white/90 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 drop-shadow">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Successiva"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-white/90 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 drop-shadow">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {/* Counter */}
            <div className="mt-3 text-center text-white/80 text-sm">
              {index + 1} / {count}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}