import HeroImage from "@/app/components/HeroImage";
import Gallery from "@/app/components/Gallery";
import { getDisabledDates, getDateStatuses, getAnnouncements } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { FaStar, FaRegStar, FaStarHalfAlt, FaCalendarAlt, FaUserCircle, FaUtensils, FaMusic, FaHeart, FaImage } from "react-icons/fa";
import ClientBooking from "./ClientBooking";
import { CONTACT_INFO, LOCATION_INFO } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomeV2() {
  const [disabledDates, dateStatuses, announcements] = await Promise.all([
    getDisabledDates(),
    getDateStatuses(),
    getAnnouncements(),
  ]);

  const resolveImageUrl = (u?: string | null) => {
    if (!u) return null;
    try {
      const _ = new URL(u);
    } catch {
      return u; // non-URL, lascio così
    }
    // Google Drive: formato /file/d/{id}/view -> uc?export=download&id={id}
    if (u.includes("drive.google.com/file/d/")) {
      const m = u.match(/\/file\/d\/([^/]+)\//);
      const id = m?.[1];
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    // Google Drive: formato open?id={id}
    if (u.includes("drive.google.com/open")) {
      const url = new URL(u);
      const id = url.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    // Dropbox: link condiviso -> direct content
    if (u.includes("dropbox.com/s/")) {
      return u.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    }
    return u;
  };
  // Rating aggregato per hero (media e numero recensioni approvate)
  const ratingAgg = await prisma.review.aggregate({
    where: { approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const avgRating = ratingAgg._avg.rating || 0;
  const totalReviews = ratingAgg._count._all || 0;

  // Immagini
  const dbImages = await prisma.galleryImage.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }], take: 24 });
  const heroImg = await prisma.galleryImage.findFirst({ where: { isActive: true, category: "HERO" as any }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
  const heroSrc = heroImg?.url && heroImg.url !== "/uploads/hero.jpg" ? heroImg.url : "/hero.svg";
  const eventsPromoImg = await prisma.galleryImage.findFirst({ where: { isActive: true, category: "EVENTS" as any }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
  const eventsPromoSrc = eventsPromoImg?.url && eventsPromoImg.url !== "/uploads/hero.jpg" ? eventsPromoImg.url : heroSrc;
  const galleryImages = dbImages.map((img) => {
    const safeUrl = !img.url || img.url === "/uploads/hero.jpg" ? "/hero.svg" : img.url;
    return { src: safeUrl, alt: img.alt, category: img.category as any };
  });

  // Recensioni recenti (visibili in sezione dedicata)
  const latestReviews = await prisma.review.findMany({ where: { approved: true }, orderBy: [{ createdAt: "desc" }], take: 3 });

  // Menù del Giorno e Menù completo: carico tutte le sezioni attive con i loro piatti attivi
  const sections = await prisma.menuSection.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  // Rimosso: gestione speciale "Menù del Giorno"
  // const dailySection = (sections as any[]).find((s: any) => (s.title || s.name || "").toLowerCase().includes("giorno"));
  // const dailyItems = dailySection ? ((dailySection as any).items ?? []) : [];

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <div className="flex text-[#B7622C]" aria-label={`Valutazione ${rating} su 5`}>
        {Array.from({ length: full }).map((_, i) => (
          <FaStar key={`f-${i}`} />
        ))}
        {half && <FaStarHalfAlt />}
        {Array.from({ length: empty }).map((_, i) => (
          <FaRegStar key={`e-${i}`} />
        ))}
      </div>
    );
  }

  const avgStr = avgRating.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Eventi speciali futuri (per integrazione nel form di prenotazione)
  const specialEvents = (announcements as any[])
    .filter((a) => a.eventDate && new Date(a.eventDate) >= new Date(new Date().toDateString()))
    .map((a) => ({ id: a.id, title: a.title, eventDate: a.eventDate }));

  return (
    <div className="min-h-screen">
      {/* HERO rimosso: sostituito dalla sezione successiva con immagine di sfondo */}
      <section className="relative">
        <div className="absolute inset-0">
          {/* Hero background image full-bleed */}
          <div className="h-[55vh] sm:h-[65vh] w-full bg-center bg-cover" style={{ backgroundImage: `url(${heroSrc})` }} />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 h-[55vh] sm:h-[65vh] flex items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white drop-shadow">
              Benvenuti al <span className="text-[#F2A65A]">Home restaurant Lucia 67</span>
            </h1>
            <p className="mt-3 text-white/90 max-w-prose drop-shadow">
              Cucina autentica, ingredienti genuini e musica dal vivo.
            </p>
            <div className="mt-3 flex items-center gap-2 text-white/90">
              {renderStars(avgRating)}
              <span className="text-sm">{avgStr}/5</span>
              <span className="text-sm opacity-80">· {totalReviews} recensioni</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#prenota"
                className="btn btn-glow-invert"
              >
                Prenota Ora
              </a>
              <a
                href="#news"
                className="btn btn-glow-invert"
              >
                News & Eventi
              </a>
              <a
                href="/reviews#lascia"
                className="btn btn-glow-invert"
              >
                Lascia una recensione
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Riquadri info e card Menù (su bianco) */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4 text-[#0F1B2A] flex items-start gap-3">
              <FaUtensils className="text-[#B7622C] mt-1" />
              <div>
                <div className="font-medium">Cucina Autentica</div>
                <div className="text-sm text-[#5C6672]">Ingredienti freschi e genuini</div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 text-[#0F1B2A] flex items-start gap-3">
              <FaMusic className="text-[#7C3AED] mt-1" />
              <div>
                <div className="font-medium">Musica dal Vivo</div>
                <div className="text-sm text-[#5C6672]">Atmosfera intima e coinvolgente</div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 text-[#0F1B2A] flex items-start gap-3">
              <FaHeart className="text-[#DC2626] mt-1" />
              <div>
                <div className="font-medium">Atmosfera Familiare</div>
                <div className="text-sm text-[#5C6672]">Accoglienza come a casa</div>
              </div>
            </div>
          </div>
          {/* Card Menù centrata sotto i 3 riquadri */}
          <div className="mt-4 max-w-2xl mx-auto">
            <div className="rounded-2xl border bg-white p-4 text-[#0F1B2A] hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 mt-1 text-[#0F1B2A]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div className="flex-1">
                  <div className="font-medium">Menù</div>
                  <div className="text-sm text-[#5C6672]">Scopri i nostri piatti</div>
                </div>
                <a href="#menu" className="btn btn-glow shrink-0">Vedi tutto</a>
              </div>
              <p className="mt-3 text-sm text-[#5C6672]">Scopri il nostro menù completo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Musica ed eventi speciali (solo futuri) */}
      {announcements.some((a: any) => a.eventDate && new Date(a.eventDate) >= new Date(new Date().toDateString())) && (
        <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 badge badge--brand"><FaMusic className="text-[#B7622C]" /> <span>Eventi speciali</span></div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">Musica ed eventi speciali</h2>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.filter((a: any) => a.eventDate && new Date(a.eventDate) >= new Date(new Date().toDateString())).map((a: any) => {
              const date = new Date(a.eventDate);
              const dateStr = date.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
              const imgSrc = (a as any).imageUrl
                ? `/api/image-proxy?src=${encodeURIComponent(resolveImageUrl((a as any).imageUrl) as string)}`
                : "/hero.svg";
              return (
                <article key={a.id} className="rounded-2xl bg-white border p-5 shadow-soft">
                  {(a as any).imageUrl && (
                    <img src={imgSrc} alt={(a as any).title} className="w-full h-40 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-center gap-2 text-xs text-[#B7622C]">
                    <FaCalendarAlt /> <span>{dateStr}</span>
                  </div>
                  <h3 className="mt-2 font-medium text-[#0F1B2A]">{a.title}</h3>
                  <p className="text-sm text-[#5C6672] line-clamp-3">{a.content}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Sezione promo eventi speciali con immagine evocativa */}
      <section className="relative isolate">
        <div className="mx-auto max-w-7xl px-6 py-12 grid gap-6 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">Serate speciali & musica dal vivo</h2>
            <p className="mt-2 text-[#5C6672]">Scegli una serata a tema direttamente in fase di prenotazione. Puoi indicare la tua preferenza nel campo \"Evento/Musica\".</p>
            <div className="mt-4 flex gap-3">
              <a href="#prenota" className="btn btn-glow">Prenota ora</a>
              <a href="#news" className="btn btn-glow">Scopri gli eventi</a>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden border shadow-soft">
            <img src={eventsPromoSrc} alt="Serate speciali con musica dal vivo" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* GALLERIA */}
      <section id="galleria" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 badge badge--brand"><FaImage className="text-[#B7622C]" /> <span>Galleria</span></div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">Galleria</h2>
        </div>
        {galleryImages.length === 0 ? (
          <div className="mt-6 text-center text-sm text-[#5C6672]">Nessuna immagine disponibile.</div>
        ) : (
          <div className="mt-8">
            <Gallery images={galleryImages} />
          </div>
        )}
      </section>

      {/* MENÙ DEL GIORNO - rimosso */}{false && (
      <section id="menu-del-giorno" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        {/* Sezione rimossa */}
      </section>
      )}

      {/* MENÙ COMPLETO PER SEZIONI */}
      <section id="menu" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 badge badge--brand"><FaUtensils className="text-[#B7622C]" /> <span>Il Menù</span></div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">Il Menù</h2>
          <p className="mt-2 text-[#5C6672] text-sm max-w-2xl mx-auto">Scopri le nostre proposte: Antipasti, Primi, Secondi, Contorni e molto altro.</p>
        </div>
        {sections.filter((s: any) => ((s.items?.length ?? 0) > 0) && !((s.title || s.name || "").toLowerCase().includes("giorno"))).length === 0 ? (
          <div className="mt-6 text-center text-sm text-[#5C6672]">Non ci sono piatti disponibili al momento. <a className="underline" href="/admin/menu/items" target="_blank" rel="noreferrer">Aggiungi dal pannello Admin</a>.</div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {(sections as any[])
              .filter((s: any) => ((s.items?.length ?? 0) > 0) && !((s.title || s.name || "").toLowerCase().includes("giorno")))
              .map((section: any) => (
                <div key={section.id} className="rounded-2xl border glass p-6 shadow-soft w-full max-w-xl">
                   <h3 className="font-medium text-xl text-[#0F1B2A]">{section.title || section.name}</h3>
                   {section.description && <p className="mt-1 text-sm text-[#5C6672]">{section.description}</p>}
                   <ul className="mt-4 space-y-3">
                     {(section.items as any[]).map((it: any) => (
                       <li key={it.id} className="flex items-start justify-between gap-3">
                         <div>
                           <div className="font-medium text-[#0F1B2A]">{it.name}</div>
                           {it.note && <div className="text-sm text-[#5C6672] mt-0.5">{it.note}</div>}
                         </div>
                         {it.price && <div className="text-[#0F1B2A] font-semibold whitespace-nowrap ml-3">{it.price}</div>}
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
           </div>
        )}
      </section>

      {/* NEWS & EVENTI */}
      <section id="news" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 badge badge--brand"><FaCalendarAlt className="text-[#B7622C]" /> <span>News & Eventi</span></div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">News & Eventi</h2>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...announcements]
            .sort((a: any, b: any) => {
              const ra = (a as any).eventDate ?? (a as any).createdAt;
              const rb = (b as any).eventDate ?? (b as any).createdAt;
              return new Date(rb as any).getTime() - new Date(ra as any).getTime();
            })
            .map((a) => {
              const raw = (a as any).eventDate ?? (a as any).createdAt;
              const date = new Date(raw as any);
              const dateStr = date.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
              const imgSrc = (a as any).imageUrl
                ? `/api/image-proxy?src=${encodeURIComponent(resolveImageUrl((a as any).imageUrl) as string)}`
                : "/hero.svg";
              return (
                <article key={(a as any).id} className="rounded-2xl bg-white border p-5 shadow-soft transform-gpu transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 hover:shadow-md">
                  {(a as any).imageUrl && (
                    <img src={imgSrc} alt={(a as any).title} className="w-full h-40 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-center gap-2 text-xs text-[#B7622C]">
                    <FaCalendarAlt /> <span>{dateStr}</span>
                  </div>
                  <h3 className="mt-2 font-medium text-[#0F1B2A]">{(a as any).title}</h3>
                  <p className="text-sm text-[#5C6672] line-clamp-3">{(a as any).content}</p>
                </article>
              );
            })
          }
        </div>
      </section>

      {/* RECENSIONI */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 badge badge--brand"><FaStar className="text-[#B7622C]" /> <span>Recensioni</span></div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#0F1B2A]">Recensioni</h2>
        </div>
        {latestReviews.length === 0 ? (
          <div className="mt-8 text-center text-sm text-[#5C6672]">Non ci sono ancora recensioni.</div>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {latestReviews.map((r) => {
              const date = new Date(r.createdAt);
              const month = date.toLocaleDateString("it-IT", { month: "long" });
              const year = date.getFullYear();
              return (
                <div key={r.id} className="rounded-2xl bg-white border p-6 shadow-soft transform-gpu transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 hover:shadow-md">
                  {renderStars(r.rating)}
                  <div className="mt-2 text-sm text-[#0F1B2A] italic flex items-start gap-2">
                    <FaUserCircle className="text-[#B7622C] shrink-0 mt-0.5" />
                    <span>{r.comment || ""}</span>
                  </div>
                  <div className="mt-4 font-medium text-[#0F1B2A]">{r.name}</div>
                  <div className="text-xs text-[#5C6672]">{month.charAt(0).toUpperCase() + month.slice(1)} {year}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA PRENOTAZIONE */}
      <section id="prenota" className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Prenota</h2>
        <div className="rounded-2xl border glass p-6 shadow-soft">
          <ClientBooking disabledDates={disabledDates} dateStatuses={dateStatuses} specialEvents={specialEvents} />
        </div>
      </section>

      {/* CONTATTI & ORARI */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border glass p-6 shadow-soft transform-gpu transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 hover:shadow-md lg:col-span-2">
             <h3 className="font-medium">Dove siamo</h3>
             <iframe
                src={LOCATION_INFO.mapsUrl}
                title="Mappa - Dove siamo"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                 className="w-full h-64 rounded-xl border"
                allowFullScreen
              />
              <p className="mt-2 text-sm text-black/70 dark:text-white/70">{LOCATION_INFO.address}</p>
              <div className="mt-1">
                <a
                  href={LOCATION_INFO.mapsUrl.replace("&output=embed", "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Apri su Google Maps
                </a>
              </div>
             </div>
          <div className="rounded-2xl border glass p-6 shadow-soft transform-gpu transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 hover:shadow-md">
             <h3 className="font-medium">Contatti & orari</h3>
             <ul className="mt-3 space-y-2 text-sm text-black/70 dark:text-white/70">
               <li>Lun–Gio: 19:30–23:00</li>
               <li>Ven–Sab: 19:30–00:00</li>
               <li>Dom: chiuso</li>
               <li className="pt-2">
                 <a href={`tel:${CONTACT_INFO.phone}`} className="hover:underline">{CONTACT_INFO.phone}</a>
                 {" "}·{" "}
                 <a href={`mailto:${CONTACT_INFO.email}`} className="hover:underline">{CONTACT_INFO.email}</a>
               </li>
             </ul>
           </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F1B2A] text-white/90">
        <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 lg:grid-cols-3">
          <div>
            <div className="font-semibold">Home restaurant Lucia 67</div>
            <div className="text-xs text-white/70">Cucina Autentica & Musica dal Vivo</div>
          </div>
          <div>
            <div className="font-semibold">Link utili</div>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><a href="#prenota" className="hover:text-white">Prenotazioni</a></li>
              <li><a href="#" className="hover:text-white">Contatti</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">Dove trovarci</div>
            <p className="text-sm text-white/70 mt-2">{LOCATION_INFO.address}</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} Home restaurant Lucia 67 — Tutti i diritti riservati</div>
      </footer>
    </div>
  );
}