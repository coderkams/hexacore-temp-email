import { NextRequest, NextResponse } from "next/server";
import { sendEmailWithBrevo } from "@/lib/brevo";
import { SendEmailPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendEmailPayload;

    if (!body.toEmail || !body.toEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid recipient email address." },
        { status: 400 }
      );
    }

    if (!body.templateId && !body.htmlContent) {
      return NextResponse.json(
        { success: false, error: "Please provide either templateId or htmlContent." },
        { status: 400 }
      );
    }

    const result = await sendEmailWithBrevo(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 502 });
    }

    // Persist campaign log into Supabase backend
    try {
      const { saveCampaignToDb } = await import("@/lib/supabase");
      await saveCampaignToDb({
        id: `camp-${Date.now()}`,
        subject: body.subject || "Hexacore Notification",
        audience: body.audience || body.toEmail,
        status: result.mode === "live" ? "sent" : "delivered",
        opens: 0,
        clicks: 0,
        content: body.htmlContent || "",
        created_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn("Supabase auto-log notice:", dbErr);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
