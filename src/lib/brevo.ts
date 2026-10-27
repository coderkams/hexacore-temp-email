import { SendEmailPayload, SendEmailResult } from "./types";
import { getTemplateById } from "@/templates";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface BrevoConfig {
  apiKey?: string;
  senderEmail: string;
  senderName: string;
}

export function getBrevoConfig(): BrevoConfig {
  return {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL || "info@hexacore.ng",
    senderName: process.env.BREVO_SENDER_NAME || "Hexacore",
  };
}

export async function sendEmailWithBrevo(payload: SendEmailPayload): Promise<SendEmailResult> {
  const config = getBrevoConfig();
  
  let htmlContent = payload.htmlContent?.trim() || "";
  let emailSubject = payload.subject || "Important Notification";

  if (!htmlContent && payload.templateId) {
    const template = getTemplateById(payload.templateId);
    const mergedParams = { ...template.defaultParams, ...(payload.params || {}) };
    htmlContent = template.generateHtml(mergedParams);
    emailSubject = payload.subject || template.subject;
  } else if (!htmlContent) {
    htmlContent = `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">${payload.subject || "Notification"}</div>`;
  }

  // Check if API key is configured
  const apiKey = config.apiKey?.trim();
  const isDemoOrMissing = !apiKey || apiKey === "your_brevo_api_key_here" || apiKey.startsWith("test_");

  if (isDemoOrMissing) {
    // Helpful simulation mode so users can test immediately before pasting their Brevo key
    return {
      success: true,
      mode: "simulation",
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      details: {
        info: "Simulation Mode: Email was compiled and verified successfully. To deliver real emails to inboxes, add your BREVO_API_KEY in .env.local",
        recipient: payload.toEmail,
        sender: `${config.senderName} <${config.senderEmail}>`,
        subject: emailSubject,
        htmlLength: htmlContent.length,
      },
    };
  }

  // Live Brevo Transactional Email API Call
  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: config.senderName,
          email: config.senderEmail,
        },
        replyTo: {
          name: config.senderName,
          email: process.env.BREVO_REPLY_TO || "support@reply.hexacore.ng",
        },
        to: [
          {
            email: payload.toEmail,
            name: payload.toName || payload.toEmail.split("@")[0],
          },
        ],
        subject: emailSubject,
        htmlContent: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Brevo API returned status ${response.status}`;
      return {
        success: false,
        mode: "live",
        error: errorMessage,
        details: data,
      };
    }

    return {
      success: true,
      mode: "live",
      messageId: data.messageId,
      details: data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error while sending through Brevo";
    return {
      success: false,
      mode: "live",
      error: errorMsg,
    };
  }
}
