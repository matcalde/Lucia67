import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hasSession = (await cookies()).get("rv_session")?.value;
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
       <header className="border-b sticky top-0 z-50 pointer-events-auto bg-white/90 dark:bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
-        <nav className="mx-auto max-w-6xl px-6 h-14 flex flex-nowrap items-center gap-4 text-sm overflow-x-auto">
+        <div className="relative">
+          <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white/80 to-transparent dark:from-black/40" />
+          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white/80 to-transparent dark:from-black/40" />
+          <nav className="mx-auto max-w-6xl px-6 h-14 flex flex-nowrap items-center gap-4 text-sm overflow-x-auto scrollbar-none">
                   <Link href="/v2" className="font-medium shrink-0">Home restaurant Lucia 67</Link>
                   {hasSession ? (
                     <>
                       <Link href="/admin" className="font-medium shrink-0">Dashboard</Link>
                       <Link href="/admin/bookings" className="shrink-0">Prenotazioni</Link>
                       <Link href="/admin/announcements" className="shrink-0">Comunicati</Link>
                       <Link href="/admin/gallery" className="shrink-0">Galleria</Link>
                       <Link href="/admin/reviews" className="shrink-0">Recensioni</Link>
                       <Link href="/admin/menu/sections" className="shrink-0">Menu · Sezioni</Link>
                       <Link href="/admin/menu/items" className="shrink-0">Menu · Piatti</Link>
                       <form action={async () => {
                         "use server";
                         (await cookies()).set("rv_session", "", { maxAge: 0, path: "/" });
                         // No redirect here; the page will become unauthorized and middleware will handle navigation on next request
-                      }} className="ml-auto shrink-0">
+                      }} className="ml-auto shrink-0">
                         <button className="text-sm text-red-600 hover:underline">Logout</button>
                       </form>
                     </>
                   ) : (
                     <Link href="/admin/login" className="ml-auto text-sm hover:underline shrink-0">Login</Link>
                   )}
-                </nav>
+          </nav>
+        </div>
       </header>
       <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
     </div>
  );
}