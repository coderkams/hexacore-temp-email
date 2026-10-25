import { NextResponse } from "next/server";
import { getBrevoConfig } from "@/lib/brevo";

export async function GET() {
  const config = getBrevoConfig();
  const apiKey = config.apiKey?.trim();
  const isConfigured = Boolean(
    apiKey && 
    apiKey !== "your_brevo_api_key_here" && 
    !apiKey.startsWith("test_")
  );

  return NextResponse.json({
    isConfigured,
    senderEmail: config.senderEmail,
    senderName: config.senderName,
    keyPrefix: isConfigured ? apiKey!.slice(0, 8) + "..." : null,
  });
}
