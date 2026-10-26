import { BulkEmailPayload, BulkEmailResult, BulkBatchResult, BulkRecipient, TemplateType } from "./types";
import { parseCsvString } from "./csv";
import { getBrevoConfig } from "./brevo";
import { getTemplateById } from "@/templates";
import { saveCampaignToDb } from "./supabase";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const MAX_BREVO_BATCH_SIZE = 80; // Brevo limit is ~99 per batch request

/**
 * Replaces {{variable}} or {{params.variable}} placeholders with values from params map
 */
export function interpolateVariables(templateText: string, params: Record<string, string>): string {
  if (!templateText) return "";
  return templateText.replace(/\{\{\s*(?:params\.)?([a-zA-Z0-9_-]+)\s*\}\}/gi, (match, key) => {
    const direct = params[key];
    if (direct !== undefined && direct !== null) return direct;

    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(params).find((k) => k.toLowerCase() === lowerKey);
    if (foundKey && params[foundKey] !== undefined) {
      return params[foundKey];
    }
    return match;
  });
}

/**
 * Normalizes user HTML to Brevo format where parameters are referenced as {{ params.key }}
 */
function prepareHtmlForBrevo(html: string): string {
  // Convert any {{name}} or {{ name }} to {{ params.name }} if not already prefixed
  return html.replace(/\{\{\s*(?!params\.)([a-zA-Z0-9_-]+)\s*\}\}/g, "{{ params.$1 }}");
}

/**
 * Compiles recipient list and dispatches bulk email campaigns.
 */
export async function sendBulkEmails(payload: BulkEmailPayload): Promise<BulkEmailResult> {
  const config = getBrevoConfig();
  const apiKey = config.apiKey?.trim();
  const isDemoOrMissing = !apiKey || apiKey === "your_brevo_api_key_here" || apiKey.startsWith("test_");

  let recipients: BulkRecipient[] = [];
  let invalidSkipped = 0;

  // 1. Extract recipients from CSV string or payload array
  if (payload.csvContent) {
    const parsed = parseCsvString(payload.csvContent, { deduplicate: payload.deduplicate ?? true });
    recipients = parsed.recipients;
    invalidSkipped = parsed.invalidRows.length;
  } else if (payload.recipients && Array.isArray(payload.recipients)) {
    // Validate provided array
    payload.recipients.forEach((r) => {
      if (r && r.email && r.email.includes("@")) {
        recipients.push(r);
      } else {
        invalidSkipped++;
      }
    });
  }

  if (recipients.length === 0) {
    return {
      success: false,
      mode: isDemoOrMissing ? "simulation" : "live",
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      batchCount: 0,
      invalidSkipped,
      results: [],
      errors: ["No valid recipient email addresses found to process."],
    };
  }

  // 2. Prepare base subject and HTML content
  let baseSubject = payload.subject?.trim() || "Important Update from Hexacore";
  let baseHtml = payload.htmlContent?.trim() || "";

  if (!baseHtml && payload.templateId && payload.templateId !== "blank") {
    const template = getTemplateById(payload.templateId as TemplateType);
    // Use Brevo param placeholder for dynamic fields in template
    const templateParams = {
      ...template.defaultParams,
      ...(payload.params || {}),
      userName: "{{ params.userName }}",
    };
    baseHtml = template.generateHtml(templateParams);
    if (!payload.subject) {
      baseSubject = template.subject;
    }
  } else if (!baseHtml) {
    baseHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b;">
      <h2 style="color: #0d1f4a; margin-top: 0;">{{ params.subject }}</h2>
      <p>Hello <strong>{{ params.userName }}</strong>,</p>
      <div style="margin: 16px 0;">${payload.subject || "Notification"}</div>
    </div>`;
  }

  // Ensure Brevo template syntax is present
  const preparedHtml = prepareHtmlForBrevo(baseHtml);

  // If dryRun is requested, return early with compilation preview
  if (payload.dryRun) {
    return {
      success: true,
      mode: isDemoOrMissing ? "simulation" : "live",
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      batchCount: Math.ceil(recipients.length / (payload.batchSize || MAX_BREVO_BATCH_SIZE)),
      invalidSkipped,
      previewOnly: true,
      results: [],
    };
  }

  // 3. Partition recipients into batches
  const batchSize = Math.min(payload.batchSize || MAX_BREVO_BATCH_SIZE, MAX_BREVO_BATCH_SIZE);
  const batches: BulkRecipient[][] = [];
  for (let i = 0; i < recipients.length; i += batchSize) {
    batches.push(recipients.slice(i, i + batchSize));
  }

  const campaignId = `camp-bulk-${Date.now()}`;
  const batchResults: BulkBatchResult[] = [];
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;

  // 4. Dispatch batches
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const currentBatch = batches[batchIdx];

    if (isDemoOrMissing) {
      // Simulation mode
      const simMessageId = `sim_batch_${batchIdx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      batchResults.push({
        batchIndex: batchIdx + 1,
        recipientCount: currentBatch.length,
        success: true,
        messageId: simMessageId,
      });
      sentCount += currentBatch.length;
      continue;
    }

    // Live Brevo Dispatch via messageVersions
    try {
      const messageVersions = currentBatch.map((recipient) => {
        const displayName = recipient.name?.trim() || recipient.email.split("@")[0];
        const mergedParams: Record<string, string> = {
          name: displayName,
          userName: displayName,
          email: recipient.email,
          subject: baseSubject,
          ...(payload.params || {}),
          ...(recipient.params || {}),
        };

        const personalizedSubject = interpolateVariables(baseSubject, mergedParams);

        return {
          to: [
            {
              email: recipient.email,
              name: displayName,
            },
          ],
          params: mergedParams,
          subject: personalizedSubject,
        };
      });

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
          subject: baseSubject,
          htmlContent: preparedHtml,
          messageVersions: messageVersions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `Brevo batch ${batchIdx + 1} failed (HTTP ${response.status})`;
        errors.push(errorMsg);
        batchResults.push({
          batchIndex: batchIdx + 1,
          recipientCount: currentBatch.length,
          success: false,
          error: errorMsg,
        });
        failedCount += currentBatch.length;
      } else {
        const returnedId = Array.isArray(data?.messageIds) ? data.messageIds.join(", ") : (data?.messageId || `batch-${batchIdx + 1}`);
        batchResults.push({
          batchIndex: batchIdx + 1,
          recipientCount: currentBatch.length,
          success: true,
          messageId: returnedId,
        });
        sentCount += currentBatch.length;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Unknown error on batch ${batchIdx + 1}`;
      errors.push(msg);
      batchResults.push({
        batchIndex: batchIdx + 1,
        recipientCount: currentBatch.length,
        success: false,
        error: msg,
      });
      failedCount += currentBatch.length;
    }
  }

  // 5. Persist Campaign into Supabase database
  const audienceText = payload.audienceLabel || `Bulk CSV (${recipients.length} recipients)`;
  const recipientList = recipients.map((r) => ({
    email: r.email,
    name: r.name || r.email.split("@")[0],
    status: isDemoOrMissing ? ("delivered" as const) : ("sent" as const),
    deliveredAt: new Date().toISOString(),
    metadata: r.params || {},
  }));

  try {
    await saveCampaignToDb({
      id: campaignId,
      subject: baseSubject,
      audience: audienceText,
      status: failedCount === 0 ? (isDemoOrMissing ? "delivered" : "sent") : (sentCount > 0 ? "sent" : "failed"),
      opens: 0,
      clicks: 0,
      content: preparedHtml.substring(0, 1000),
      recipients: recipientList,
      created_at: new Date().toISOString(),
    });
  } catch (dbErr) {
    console.warn("Supabase bulk campaign log notice:", dbErr);
  }

  const overallSuccess = sentCount > 0;

  return {
    success: overallSuccess,
    mode: isDemoOrMissing ? "simulation" : "live",
    totalRecipients: recipients.length,
    sentCount,
    failedCount,
    batchCount: batches.length,
    invalidSkipped,
    campaignId,
    results: batchResults,
    recipients: recipientList,
    errors: errors.length > 0 ? errors : undefined,
  };
}
