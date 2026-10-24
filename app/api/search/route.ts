import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json(
      { query, results: [] },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }

  try {
    const results = await searchAll(query);
    return NextResponse.json(
      { query, results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json(
      { error: "搜索暂时不可用，请稍后再试。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
