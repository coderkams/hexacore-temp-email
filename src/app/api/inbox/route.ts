import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface InboxMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  date: string;
  preview: string;
  bodyHtml: string;
  isUnread: boolean;
  isStarred?: boolean;
}

// In-memory fallback cache in case Supabase inbound table is not provisioned yet
let inMemoryInbox: InboxMessage[] = [];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("inbound_emails")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const messages: InboxMessage[] = data.map((d) => ({
        id: d.id,
        fromName: d.from_name || d.from_email.split("@")[0],
        fromEmail: d.from_email,
        toEmail: d.to_email || "info@hexacore.ng",
        subject: d.subject || "(No Subject)",
        date: d.created_at ? new Date(d.created_at).toLocaleString() : "Recently",
        preview: d.preview || (d.body_html ? d.body_html.replace(/<[^>]*>?/gm, "").substring(0, 120) : ""),
        bodyHtml: d.body_html || "",
        isUnread: d.is_unread ?? true,
        isStarred: d.is_starred ?? false,
      }));
      return NextResponse.json({ success: true, messages, fromDb: true });
    }

    return NextResponse.json({ success: true, messages: inMemoryInbox, fromDb: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch inbox messages";
    return NextResponse.json({ success: true, messages: inMemoryInbox, fromDb: false, error: message });
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

    inMemoryInbox = [newMessage, ...inMemoryInbox];

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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    inMemoryInbox = inMemoryInbox.filter((m) => m.id !== id);

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
