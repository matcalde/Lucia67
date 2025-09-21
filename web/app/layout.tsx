import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SOCIAL_LINKS } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home restaurant Lucia 67",
  description: "Home restaurant Lucia 67: cucina casalinga, eventi con musica e prenotazioni facili. Seguici su Instagram.",
  formatDetection: { telephone: false, date: false, email: false, address: false },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Home restaurant Lucia 67",
    description: "Home restaurant Lucia 67: cucina casalinga, eventi con musica e prenotazioni facili. Seguici su Instagram.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Home restaurant Lucia 67" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Top nav with CTA and Admin link */}
        <header className="sticky top-0 z-50 pointer-events-auto backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:bg-black/40 border-b">
          <nav className="mx-auto max-w-6xl px-6 h-16 flex flex-nowrap items-center gap-4 text-sm overflow-x-auto scrollbar-none edge-fade-x">
               <Link href="/v2" className="flex items-center gap-2 font-semibold tracking-wide shrink-0 whitespace-nowrap">
                 <img
                   src="/logo.png?v=3"
                   width={36}
                   height={36}
                   alt="Home restaurant Lucia 67"
                   className="h-9 w-9 rounded ring-1 ring-black/10 dark:ring-white/15"
                 />
                 <span className="whitespace-nowrap text-base sm:text-lg">Home restaurant Lucia 67</span>
               </Link>

               <Link href="/v2#galleria" className="hover:underline shrink-0 whitespace-nowrap">Galleria</Link>
               <Link href="/v2#prenota" className="hover:underline shrink-0 whitespace-nowrap">Prenota</Link>
               <Link href="/v2#news" className="hover:underline shrink-0 whitespace-nowrap">News</Link>
               <Link href="/reviews" className="hover:underline shrink-0 whitespace-nowrap">Recensioni</Link>
               <Link href="/v2" className="hover:underline shrink-0 whitespace-nowrap">Home</Link>

               <div className="ml-auto flex items-center gap-3 shrink-0">
                 <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener" aria-label="Instagram" className="opacity-80 hover:opacity-100 transition">
                   <img src="/instagram.svg" alt="Instagram" className="h-5 w-5" />
                 </a>
                 <Link href="/admin/login" className="rounded-full bg-[var(--accent)] text-white px-3 py-1.5 text-xs hover:opacity-95 whitespace-nowrap">Area Gestore</Link>
               </div>
             </nav>
        </header>

        <main>{children}</main>

        {/* Global footer with socials */}
        <footer className="mt-12 border-t">
          <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-sm">
            <div className="text-black/70 dark:text-white/70">© {new Date().getFullYear()} Home restaurant Lucia 67</div>
            <div className="flex items-center gap-3">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener" aria-label="Instagram" className="opacity-80 hover:opacity-100 transition flex items-center gap-2">
                <img src="/instagram.svg" alt="Instagram" className="h-5 w-5" />
                <span className="hidden sm:inline">Seguici su Instagram</span>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
