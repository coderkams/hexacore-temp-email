import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Brevo Inbound Webhook Endpoint
 * 
 * Brevo sends parsed incoming emails here when inbound email parsing is configured:
 * Set Webhook URL in Brevo: https://your-domain.vercel.app/api/webhooks/brevo-inbound
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Brevo inbound payload can be an array in "items" or direct fields
    const items = Array.isArray(body?.items) ? body.items : [body];

    for (const item of items) {
      const fromName = item?.From?.Name || item?.from?.name || item?.Sender?.Name || "Sender";
      const fromEmail = item?.From?.Address || item?.from?.email || item?.Sender?.Address || item?.from || "unknown@domain.com";
      const toEmail = Array.isArray(item?.To) ? item.To[0]?.Address : (item?.to || "info@hexacore.ng");
      const subject = item?.Subject || item?.subject || "(No Subject)";
      const bodyHtml = item?.RawHtmlBody || item?.html || item?.bodyHtml || item?.RawTextBody || item?.text || "";
      const preview = (item?.RawTextBody || bodyHtml.replace(/<[^>]*>?/gm, "")).substring(0, 150);

      const messageRecord = {
        id: item?.MessageId || `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        from_name: fromName,
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        preview: preview,
        body_html: bodyHtml,
        is_unread: true,
        is_starred: false,
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from("inbound_emails").insert([messageRecord]);
      } catch (err) {
        console.warn("Supabase inbound email insert warning:", err);
      }
    }

    return NextResponse.json({ success: true, received: items.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error processing inbound webhook";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "Brevo Inbound Email Webhook",
    instructions: "Configure this webhook URL in your Brevo Dashboard under Settings > Inbound Email.",
  });
}
