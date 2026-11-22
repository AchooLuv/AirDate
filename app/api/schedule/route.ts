import { NextRequest, NextResponse } from "next/server";
import { getDayData } from "@/lib/aggregate";
import {
  isDateInWindow,
  normalizeDateKey,
  todayKey,
} from "@/lib/date";
import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("date");
  const date = normalizeDateKey(requested) ?? todayKey();
  const today = todayKey();
  const category = request.nextUrl.searchParams.get("category");

  if (!isDateInWindow(date, today)) {
    return NextResponse.json(
      { error: "只能查看今天前后 3 天的日历。" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const data = await getDayData(date);
    const filtered =
      category && CATEGORIES.includes(category as Category)
        ? {
            ...data,
            items: data.items.filter((item) => item.category === category),
          }
        : data;

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[api/schedule]", error);
    return NextResponse.json(
      { error: "暂时无法获取这一天的日历，请稍后重试。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
