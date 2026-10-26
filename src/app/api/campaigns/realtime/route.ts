import { NextResponse } from "next/server";
import { fetchBrevoRealtimeData } from "@/lib/brevo-realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchBrevoRealtimeData();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch real-time campaign data";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
