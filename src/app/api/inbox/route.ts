import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBrevoConfig } from "@/lib/brevo";
import {
  inMemoryInbox,
  addInboxMessage,
  removeInboxMessage,
  isInboxMessageDeleted,
  getInboxMessageById,
  InboxMessage,
} from "@/lib/inbox-store";

export const dynamic = "force-dynamic";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function cleanLeadSubject(subject: string): string {
  return subject
    .replace(/\s*\(\/[^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanLeadBodyHtml(html: string): string {
  return html.replace(/<p[^>]*>\s*Submitted from\s*\/[^<]*<\/p>/gi, "");
}

function extractLeadDetailsFromHtml(bodyHtml: string, fallbackSubject: string, fallbackFrom: string) {
  const extractField = (label: string): string => {
    const regex = new RegExp(
      `<strong>\\s*${label}\\s*<\\/strong>\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i"
    );
    const match = bodyHtml.match(regex);
    return match ? stripHtmlTags(match[1]) : "";
  };

  const institutionName = extractField("Institution Name") || extractField("Company");
  const institutionType = extractField("Institution Type");
  const contactName = extractField("Contact Name") || extractField("Name");
  const workEmailField = extractField("Work Email") || extractField("Email");
  const country = extractField("Country");

  const mailtoMatch = bodyHtml.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const fromEmail = mailtoMatch?.[1] || workEmailField || fallbackFrom || "info@hexacore.ng";

  let fromName = "Hexacore Inquiry";
  if (contactName && institutionName) {
    fromName = `${contactName} (${institutionName})`;
  } else if (contactName) {
    fromName = contactName;
  } else if (institutionName) {
    fromName = institutionName;
  } else if (fallbackSubject.includes("—")) {
    fromName = fallbackSubject.split("—").pop()?.trim() || "Hexacore Inquiry";
  } else if (fromEmail) {
    fromName = fromEmail.split("@")[0];
  }

  let inquiryText = "";
  const inquiryMatch = bodyHtml.match(
    /What they want to launch or improve:\s*<\/h3>\s*<div[^>]*>([\s\S]*?)<\/div>/i
  );
  if (inquiryMatch) {
    inquiryText = stripHtmlTags(inquiryMatch[1]);
  }

  let preview = "";
  if (inquiryText) {
    const metaParts = [institutionName, institutionType, country].filter(Boolean);
    const prefix = metaParts.length > 0 ? `${metaParts.join(" • ")} — ` : "";
    preview = `${prefix}${inquiryText}`.substring(0, 160);
  } else {
    preview = stripHtmlTags(bodyHtml).substring(0, 160);
  }

  return {
    fromName,
    fromEmail,
    preview,
  };
}

async function syncBrevoInboxEmails(): Promise<void> {
  const config = getBrevoConfig();
  const apiKey = config.apiKey?.trim();
  if (!apiKey || apiKey === "your_brevo_api_key_here" || apiKey.startsWith("test_")) {
    return;
  }

  const inboxEmail = config.senderEmail || "info@hexacore.ng";

  try {
    const listRes = await fetch(
      `https://api.brevo.com/v3/smtp/emails?email=${encodeURIComponent(inboxEmail)}&limit=25&sort=desc`,
      {
        headers: {
          "api-key": apiKey,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!listRes.ok) return;
    const listData = (await listRes.json()) as {
      transactionalEmails?: Array<{
        email: string;
        subject: string;
        messageId: string;
        uuid: string;
        date: string;
        from: string;
      }>;
    };

    const items = listData.transactionalEmails || [];

    // Only fetch full body details for new UUIDs not already cached
    await Promise.all(
      items.map(async (item) => {
        const msgId = item.uuid || item.messageId;
        if (!msgId || isInboxMessageDeleted(msgId)) return;

        const existing = getInboxMessageById(msgId);
        if (existing && existing.bodyHtml) {
          existing.subject = cleanLeadSubject(existing.subject);
          existing.bodyHtml = cleanLeadBodyHtml(existing.bodyHtml);
          return;
        }

        let bodyHtml = "";
        try {
          const detailRes = await fetch(
            `https://api.brevo.com/v3/smtp/emails/${encodeURIComponent(item.uuid)}`,
            {
              headers: {
                "api-key": apiKey,
                accept: "application/json",
              },
              cache: "no-store",
            }
          );
          if (detailRes.ok) {
            const detailData = (await detailRes.json()) as { body?: string };
            bodyHtml = cleanLeadBodyHtml(detailData.body || "");
          }
        } catch {
          // ignore individual fetch error
        }

        const cleanSubject = cleanLeadSubject(item.subject || "(No Subject)");

        const { fromName, fromEmail, preview } = extractLeadDetailsFromHtml(
          bodyHtml,
          cleanSubject,
          item.from || inboxEmail
        );

        const formattedDate = item.date
          ? new Date(item.date).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Recently";

        addInboxMessage({
          id: msgId,
          fromName,
          fromEmail,
          toEmail: item.email || inboxEmail,
          subject: cleanSubject,
          date: formattedDate,
          rawDate: item.date,
          preview,
          bodyHtml:
            bodyHtml ||
            `<div style="font-family: sans-serif; padding: 16px;">${cleanSubject}</div>`,
          isUnread: existing ? existing.isUnread : true,
          isStarred: existing ? existing.isStarred : false,
        });
      })
    );
  } catch (err) {
    console.warn("Brevo inbox sync notice:", err);
  }
}

export async function GET() {
  try {
    // 1. Sync live incoming form submissions & emails sent to info@hexacore.ng via Brevo
    await syncBrevoInboxEmails();

    // 2. Also check Supabase inbound_emails with a fast timeout so offline DB doesn't stall
    try {
      const dbPromise = supabase
        .from("inbound_emails")
        .select("*")
        .order("created_at", { ascending: false });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("DB timeout") }), 1200)
      );

      const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

      if (!error && data && data.length > 0) {
        for (const d of data as any[]) {
          if (!isInboxMessageDeleted(d.id)) {
            addInboxMessage({
              id: d.id,
              fromName: d.from_name || (d.from_email ? d.from_email.split("@")[0] : "Sender"),
              fromEmail: d.from_email,
              toEmail: d.to_email || "info@hexacore.ng",
              subject: d.subject || "(No Subject)",
              date: d.created_at ? new Date(d.created_at).toLocaleString() : "Recently",
              rawDate: d.created_at,
              preview:
                d.preview ||
                (d.body_html ? d.body_html.replace(/<[^>]*>?/gm, "").substring(0, 120) : ""),
              bodyHtml: d.body_html || "",
              isUnread: d.is_unread ?? true,
              isStarred: d.is_starred ?? false,
            });
          }
        }
      }
    } catch {
      // Fallback to in-memory + Brevo live store
    }

    return NextResponse.json({
      success: true,
      messages: inMemoryInbox,
      fromDb: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch inbox messages";
    return NextResponse.json({
      success: true,
      messages: inMemoryInbox,
      fromDb: false,
      error: message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<InboxMessage>;
    const newMessage: InboxMessage = {
      id: body.id || `msg-${Date.now()}`,
      fromName: body.fromName || "Sender",
      fromEmail: body.fromEmail || "sender@example.com",
      toEmail: body.toEmail || "info@hexacore.ng",
      subject: body.subject || "(No Subject)",
      date: body.date || "Just now",
      preview: body.preview || "",
      bodyHtml: body.bodyHtml || "",
      isUnread: body.isUnread ?? true,
      isStarred: body.isStarred ?? false,
    };

    // Store in shared in-memory store
    addInboxMessage(newMessage);

    // Attempt to persist to Supabase if table exists
    try {
      await supabase.from("inbound_emails").insert([
        {
          id: newMessage.id,
          from_name: newMessage.fromName,
          from_email: newMessage.fromEmail,
          to_email: newMessage.toEmail,
          subject: newMessage.subject,
          preview: newMessage.preview,
          body_html: newMessage.bodyHtml,
          is_unread: newMessage.isUnread,
          is_starred: newMessage.isStarred,
        },
      ]);
    } catch {
      // Supabase table may not exist yet, fallback to in-memory
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save message";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: string; isUnread?: boolean; isStarred?: boolean };
    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    const existing = getInboxMessageById(body.id);
    if (existing) {
      addInboxMessage({
        ...existing,
        ...(typeof body.isUnread === "boolean" ? { isUnread: body.isUnread } : {}),
        ...(typeof body.isStarred === "boolean" ? { isStarred: body.isStarred } : {}),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update message";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    removeInboxMessage(id);

    try {
      await supabase.from("inbound_emails").delete().eq("id", id);
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete message";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
