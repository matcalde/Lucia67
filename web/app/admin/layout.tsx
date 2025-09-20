import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hasSession = (await cookies()).get("rv_session")?.value;
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
       <header className="border-b sticky top-0 z-50 pointer-events-auto bg-white/90 dark:bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <nav className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-4 text-sm whitespace-nowrap overflow-x-auto">
                  <Link href="/v2" className="font-medium">Home restaurant Lucia 67</Link>
                  {hasSession ? (
                    <>
                      <Link href="/admin" className="font-medium">Dashboard</Link>
                      <Link href="/admin/bookings">Prenotazioni</Link>
                      <Link href="/admin/announcements">Comunicati</Link>
                      <Link href="/admin/gallery">Galleria</Link>
                      <Link href="/admin/reviews">Recensioni</Link>
                      <Link href="/admin/menu/sections">Menu · Sezioni</Link>
                      <Link href="/admin/menu/items">Menu · Piatti</Link>
                      <form action={async () => {
                        "use server";
                        (await cookies()).set("rv_session", "", { maxAge: 0, path: "/" });
                        // No redirect here; the page will become unauthorized and middleware will handle navigation on next request
                      }} className="ml-auto">
                        <button className="text-sm text-red-600 hover:underline">Logout</button>
                      </form>
                    </>
                  ) : (
                    <Link href="/admin/login" className="ml-auto text-sm hover:underline">Login</Link>
                  )}
                </nav>
       </header>
       <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
     </div>
  );
}