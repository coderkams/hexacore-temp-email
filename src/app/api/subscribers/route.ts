import { NextResponse } from "next/server";
import { getSubscribersFromDb } from "@/lib/supabase";

export async function GET() {
  try {
    const subscribers = await getSubscribersFromDb();
    return NextResponse.json({
      success: true,
      count: subscribers.length,
      subscribers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch subscribers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
