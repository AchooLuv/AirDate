import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "airdate",
      timezone: "Asia/Shanghai",
      time: new Date().toISOString(),
      providers: {
        douban: "public, keyless",
        tvmaze: "public, keyless",
        anilist: "public, keyless",
        bangumi: "public, keyless",
        steam: "public, keyless",
      },
      cache: {
        nextDataCache: true,
        memory: true,
        upstash: Boolean(
          process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
        ),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
