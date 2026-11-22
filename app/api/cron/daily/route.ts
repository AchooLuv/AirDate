import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getDayData } from "@/lib/aggregate";
import { addDays, todayKey } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * One daily pull. It warms the per-day cache (24h) and invalidates the
 * already-rendered pages, so ordinary visitors never trigger a fetch storm.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayKey();
  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(today, index - 3),
  );
  const results = await Promise.allSettled(dates.map((date) => getDayData(date)));

  revalidatePath("/");
  for (const date of dates) {
    if (date !== today) revalidatePath(`/date/${date}`);
  }

  return NextResponse.json(
    {
      ok: results.every((result) => result.status === "fulfilled"),
      timezone: "Asia/Shanghai",
      refreshedAt: new Date().toISOString(),
      dates: dates.map((date, index) => {
        const result = results[index];
        return {
          date,
          ok: result.status === "fulfilled",
          total: result.status === "fulfilled" ? result.value.total : 0,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
