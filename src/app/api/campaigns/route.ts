import { NextRequest, NextResponse } from "next/server";
import { getCampaignsFromDb, saveCampaignToDb, supabase, DbCampaign } from "@/lib/supabase";

export async function GET() {
  try {
    const campaigns = await getCampaignsFromDb();
    return NextResponse.json({
      success: true,
      campaigns: campaigns || [],
      fromDb: campaigns !== null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch campaigns";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DbCampaign;

    if (!body.id || !body.subject) {
      return NextResponse.json(
        { success: false, error: "Campaign ID and subject are required." },
        { status: 400 }
      );
    }

    const saved = await saveCampaignToDb(body);

    return NextResponse.json({
      success: true,
      savedToDb: saved,
      campaign: body,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save campaign";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required for deletion." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("campaigns").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete campaign";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
