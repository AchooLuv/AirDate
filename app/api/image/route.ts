import { NextRequest } from "next/server";
import { canProxyImage, imageReferer } from "@/lib/format";
import { SOURCE_CONTACT } from "@/lib/constants";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");
  if (!source || source.length > 2_000 || !canProxyImage(source)) {
    return new Response("Invalid image source", { status: 400 });
  }

  const referer = imageReferer(source);
  try {
    const upstream = await fetch(source, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": `Mozilla/5.0 (compatible; AirDate/1.0; +${SOURCE_CONTACT})`,
        ...(referer ? { Referer: referer } : {}),
      },
      signal: AbortSignal.timeout(9_000),
      next: { revalidate: 86_400, tags: ["image"] },
    });

    if (!upstream.ok) {
      return new Response("Image upstream unavailable", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new Response("Unsupported media type", { status: 415 });
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src data:",
      },
    });
  } catch {
    return new Response("Image proxy error", { status: 502 });
  }
}
