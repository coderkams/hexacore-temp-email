import { NextRequest, NextResponse } from "next/server";
import { parseCsvString, generateSampleCsv } from "@/lib/csv";
import { sendBulkEmails } from "@/lib/bulk";
import { BulkEmailPayload, TemplateType } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/bulk-email
 * - If ?sample=true: Downloads a formatted sample CSV template.
 * - Otherwise: Returns API endpoint documentation and schema.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isSampleDownload = searchParams.get("sample") === "true" || searchParams.get("download") === "sample";

  if (isSampleDownload) {
    const csvData = generateSampleCsv();
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hexacore_recipients_sample.csv"',
        "Cache-Control": "no-cache",
      },
    });
  }

  return NextResponse.json({
    name: "Hexacore Bulk Email Dispatcher API",
    version: "1.0.0",
    description: "Upload CSV contact lists and dispatch personalized bulk email campaigns via Brevo API.",
    endpoints: {
      "POST /api/bulk-email": {
        description: "Upload CSV file (multipart/form-data) or send JSON payload to parse and dispatch bulk emails.",
        contentTypes: ["multipart/form-data", "application/json"],
        parameters: {
          file: "CSV file (multipart/form-data only)",
          csvContent: "Raw CSV string (application/json only)",
          recipients: "Array of { email: string, name?: string, params?: Record<string, string> }",
          subject: "Email subject line (supports {{name}} or {{custom_col}})",
          templateId: "welcome | promo | announcement | verification | password-reset | api-key-created | team-invite | blank",
          htmlContent: "Custom HTML markup (optional if templateId is used)",
          audienceLabel: "Optional name for this campaign log in Supabase",
          dryRun: "boolean - Set true to validate and parse without sending emails",
          deduplicate: "boolean - Set true to auto-skip duplicate email addresses (default: true)",
        },
      },
      "GET /api/bulk-email?sample=true": {
        description: "Download a ready-to-fill sample CSV template.",
      },
    },
    csvFormat: {
      requiredColumns: ["email (or email address / e-mail / to)"],
      optionalColumns: ["name (or full name / first name)", "any custom columns mapped to {{column_name}} in templates"],
    },
  });
}

/**
 * POST /api/bulk-email
 * Handles CSV file upload or JSON payload for bulk email dispatch.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let csvContent = "";
    let subject = "";
    let templateId: TemplateType | "blank" | undefined = undefined;
    let htmlContent: string | undefined = undefined;
    let audienceLabel: string | undefined = undefined;
    let dryRun = false;
    let deduplicate = true;
    let recipientsList: BulkEmailPayload["recipients"] = undefined;
    let originalFilename = "uploaded_recipients.csv";

    // 1. Handle multipart/form-data (File Upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (file && typeof file === "object" && "text" in file) {
        csvContent = await (file as Blob).text();
        if ("name" in file && typeof file.name === "string") {
          originalFilename = file.name;
        }
      }

      subject = (formData.get("subject") as string) || "";
      templateId = (formData.get("templateId") as TemplateType | "blank") || undefined;
      htmlContent = (formData.get("htmlContent") as string) || undefined;
      audienceLabel = (formData.get("audienceLabel") as string) || undefined;
      dryRun = formData.get("dryRun") === "true";
      if (formData.has("deduplicate")) {
        deduplicate = formData.get("deduplicate") !== "false";
      }
    } 
    // 2. Handle application/json
    else if (contentType.includes("application/json")) {
      const body = await req.json();
      csvContent = body.csvContent || "";
      recipientsList = body.recipients;
      subject = body.subject || "";
      templateId = body.templateId;
      htmlContent = body.htmlContent;
      audienceLabel = body.audienceLabel;
      dryRun = Boolean(body.dryRun || body.validateOnly);
      deduplicate = body.deduplicate !== false;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Content-Type. Please use multipart/form-data with a file or application/json.",
        },
        { status: 400 }
      );
    }

    // 3. If CSV content was provided, validate and parse
    let parsedCsv: ReturnType<typeof parseCsvString> | null = null;
    if (csvContent.trim()) {
      parsedCsv = parseCsvString(csvContent, { deduplicate });
      recipientsList = parsedCsv.recipients;
    }

    if (!recipientsList || recipientsList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid recipient email addresses found. Please ensure your CSV contains an 'email' column with valid entries.",
          invalidRows: parsedCsv?.invalidRows || [],
          totalRows: parsedCsv?.totalRows || 0,
        },
        { status: 400 }
      );
    }

    // 4. If Dry Run / Validation mode is requested, return preview data without sending
    if (dryRun) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        summary: {
          totalRows: parsedCsv ? parsedCsv.totalRows : recipientsList.length,
          validRecipients: recipientsList.length,
          invalidSkipped: parsedCsv ? parsedCsv.invalidRows.length : 0,
          duplicates: parsedCsv ? parsedCsv.duplicates.length : 0,
        },
        detectedColumns: parsedCsv?.detectedColumns,
        sampleRecipients: recipientsList.slice(0, 10),
        invalidRows: parsedCsv?.invalidRows.slice(0, 10) || [],
      });
    }

    // 5. Validation for actual email sending
    if (!subject.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "A subject line is required to dispatch bulk emails.",
        },
        { status: 400 }
      );
    }

    if (!templateId && !htmlContent?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide either a templateId or custom htmlContent for your campaign.",
        },
        { status: 400 }
      );
    }

    // 6. Execute bulk dispatch
    const defaultAudience = audienceLabel || `Bulk CSV (${recipientsList.length} recipients) - ${originalFilename}`;
    const result = await sendBulkEmails({
      recipients: recipientsList,
      subject: subject.trim(),
      templateId,
      htmlContent,
      audienceLabel: defaultAudience,
      deduplicate,
    });

    if (!result.success && result.sentCount === 0) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error processing bulk email dispatch.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
