import { NextRequest } from "next/server";

// Avoid caching at build time
export const dynamic = "force-dynamic";

function normalizeExternalUrl(u: string): string {
  try {
    // If not a valid URL, return as is
    new URL(u);
  } catch {
    return u;
  }
  // Google Drive: /file/d/{id}/view -> uc?export=download&id={id}
  if (u.includes("drive.google.com/file/d/")) {
    const m = u.match(/\/file\/d\/([^/]+)\//);
    const id = m?.[1];
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  // Google Drive: open?id={id}
  if (u.includes("drive.google.com/open")) {
    const url = new URL(u);
    const id = url.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  // Dropbox: convert to direct content domain
  if (u.includes("dropbox.com/s/")) {
    return u.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  }
  return u;
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) {
    return new Response("Missing src", { status: 400 });
  }

  const normalized = normalizeExternalUrl(src);

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    // If it's not an absolute URL, block (we only proxy http/https)
    return new Response("Invalid URL", { status: 400 });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return new Response("Unsupported protocol", { status: 400 });
  }

  try {
    const upstream = await fetch(url.toString(), {
      // Prevent Next from caching at build, but allow browser caching via headers below
      cache: "no-store",
      headers: {
        Accept: "image/*,*/*;q=0.8",
        // Provide a UA to avoid 403s from some CDNs
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      // Follow redirects (e.g., Drive/Dropbox)
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream error", { status: 502 });
    }

    // Try to pass through the content-type if present, fallback to jpeg
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    // Stream the body to the client and set safe headers only
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache for 1 day on client/CDN, adjust as needed
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    return new Response("Proxy fetch failed", { status: 500 });
  }
}