import { NextRequest, NextResponse } from "next/server";
import { isDateInWindow, normalizeDateKey, todayKey } from "@/lib/date";

/**
 * Keeps an old ISR page from being served after the rolling window moves.
 * Only today ±3 days is addressable; everything else goes back to today.
 */
export function proxy(request: NextRequest) {
  const rawDate = request.nextUrl.pathname.split("/").pop() ?? "";
  const date = normalizeDateKey(rawDate);

  if (!date || !isDateInWindow(date, todayKey())) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/date/:path*"],
};
