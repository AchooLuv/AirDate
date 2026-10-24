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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayKey();
  const dates = [today, addDays(today, 1), addDays(today, 2), addDays(today, 3)];

  const results = await Promise.allSettled(dates.map((date) => getDayData(date)));
  const warmed = results.map((result, index) => ({
    date: dates[index],
    ok: result.status === "fulfilled",
    total: result.status === "fulfilled" ? result.value.total : 0,
    sources:
      result.status === "fulfilled"
        ? result.value.sources.map((source) => ({
            name: source.name,
            status: source.status,
            count: source.count,
          }))
        : [],
  }));

  return NextResponse.json(
    {
      ok: warmed.every((item) => item.ok),
      timezone: "Asia/Shanghai",
      warmedAt: new Date().toISOString(),
      dates: warmed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
