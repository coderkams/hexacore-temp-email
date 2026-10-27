import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { addInboxMessage, InboxMessage } from "@/lib/inbox-store";

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
    let savedCount = 0;

    for (const item of items) {
      if (!item) continue;

      const fromName =
        item?.from?.name ||
        item?.From?.Name ||
        item?.sender?.name ||
        item?.Sender?.Name ||
        (typeof item?.from === "string" ? item.from.split("@")[0] : "Sender");

      const fromEmail =
        item?.from?.address ||
        item?.From?.Address ||
        item?.from?.email ||
        item?.From?.address ||
        item?.sender?.address ||
        item?.Sender?.Address ||
        (typeof item?.from === "string" ? item.from : "unknown@domain.com");

      const rawTo = item?.to || item?.To;
      let toEmail = "info@hexacore.ng";
      if (Array.isArray(rawTo) && rawTo.length > 0) {
        toEmail = rawTo[0]?.address || rawTo[0]?.Address || rawTo[0]?.email || String(rawTo[0]);
      } else if (typeof rawTo === "string") {
        toEmail = rawTo;
      } else if (rawTo && typeof rawTo === "object") {
        toEmail = rawTo.address || rawTo.Address || rawTo.email || "info@hexacore.ng";
      }

      const subject = item?.subject || item?.Subject || "(No Subject)";
      const bodyHtml =
        item?.rawHtmlBody ||
        item?.RawHtmlBody ||
        item?.html ||
        item?.bodyHtml ||
        item?.extractedMarkdownMessage ||
        item?.rawTextBody ||
        item?.RawTextBody ||
        item?.text ||
        "";

      const previewText =
        item?.rawTextBody ||
        item?.RawTextBody ||
        item?.extractedMarkdownMessage ||
        bodyHtml.replace(/<[^>]*>?/gm, "").trim();

      const preview = previewText ? previewText.substring(0, 150) : "";
      const date = item?.sentAt || item?.Date || item?.date || new Date().toISOString();
      const messageId =
        item?.uuid ||
        item?.MessageId ||
        item?.headers?.["Message-ID"] ||
        `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const messageRecord: InboxMessage = {
        id: messageId,
        fromName,
        fromEmail,
        toEmail,
        subject,
        date: new Date(date).toLocaleString(),
        preview,
        bodyHtml,
        isUnread: true,
        isStarred: false,
      };

      // Always save to shared in-memory store so it shows immediately in /api/inbox
      addInboxMessage(messageRecord);

      // Persist to Supabase if table exists
      try {
        const { error } = await supabase.from("inbound_emails").insert([
          {
            id: messageRecord.id,
            from_name: messageRecord.fromName,
            from_email: messageRecord.fromEmail,
            to_email: messageRecord.toEmail,
            subject: messageRecord.subject,
            preview: messageRecord.preview,
            body_html: messageRecord.bodyHtml,
            is_unread: true,
            is_starred: false,
            created_at: date,
          },
        ]);
        if (!error) {
          savedCount++;
        }
      } catch (err) {
        console.warn("Supabase inbound email insert notice:", err);
      }
    }

    return NextResponse.json({ success: true, received: items.length, saved: savedCount });
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
