"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Eye, 
  RefreshCw, 
  Trash2, 
  Users, 
  Layers, 
  ArrowRight, 
  FileText, 
  Check, 
  Copy, 
  LayoutTemplate,
  Info,
  Loader2,
  Tag,
  KeyRound,
  ShieldCheck,
  Lock,
  UserPlus,
  FileEdit,
  Megaphone,
  CheckCircle,
  X,
  Bell,
  MailCheck
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { parseCsvString, generateSampleCsv } from "@/lib/csv";
import { templateList, getTemplateById } from "@/templates";
import { TemplateType, BulkEmailResult, CsvParseResult, CampaignRecipient } from "@/lib/types";

interface CampaignRecord {
  id: string;
  subject: string;
  audience: string;
  status: "pending" | "sent" | "delivered" | "failed";
  created_at: string;
  opens: number;
  clicks: number;
  content?: string;
  recipients?: CampaignRecipient[];
}

interface BulkEmailStudioProps {
  onCampaignSent: (campaign: CampaignRecord) => void;
  onViewChange: (view: "compose" | "history" | "inbox" | "bulk") => void;
  onOpenPreview: (html: string) => void;
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "loading";
  title: string;
  message: string;
}

export default function BulkEmailStudio({
  onCampaignSent,
  onViewChange,
  onOpenPreview,
}: BulkEmailStudioProps) {
  // File & CSV parsing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "invalid">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campaign configuration state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("welcome");
  const [subject, setSubject] = useState<string>("Welcome to Hexacore — Your Enterprise Workspace is Ready");
  const [campaignLabel, setCampaignLabel] = useState<string>("");
  const [messageContent, setMessageContent] = useState<string>("");
  const [deduplicate, setDeduplicate] = useState<boolean>(true);

  // Dispatch & validation state
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<BulkEmailResult | null>(null);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // Floating Toast & Success Modal state
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const showToast = (type: "success" | "error" | "info" | "loading", title: string, message: string) => {
    const newToast: ToastNotification = { id: String(Date.now()), type, title, message };
    setToast(newToast);
    if (type !== "loading") {
      setTimeout(() => {
        setToast((current) => (current?.id === newToast.id ? null : current));
      }, 7000);
    }
  };

  // Initialize template content on mount with dynamic placeholders
  useEffect(() => {
    const welcome = getTemplateById("welcome");
    setMessageContent(welcome.generateHtml({ ...welcome.defaultParams, userName: "{{name}}" }));
  }, []);

  // Parse CSV text dynamically
  const parseResult: CsvParseResult = useMemo(() => {
    if (!rawCsvText.trim()) {
      return {
        recipients: [],
        invalidRows: [],
        duplicates: [],
        totalRows: 0,
        validCount: 0,
        headers: [],
        detectedColumns: { customCols: [] },
      };
    }
    return parseCsvString(rawCsvText, { deduplicate });
  }, [rawCsvText, deduplicate]);

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "blank") {
      setSubject("Notification from Hexacore");
      setMessageContent("<div style=\"font-family: sans-serif; padding: 20px; color: #1e293b;\">\n  <h2>Hello {{name}},</h2>\n  <p>Write your bulk message here...</p>\n</div>");
      return;
    }

    const tplpl = getTemplateById(templateId as TemplateType);
    setSubject(tplpl.subject.replace(/Alex Rivera|Developer/g, "{{name}}"));
    setMessageContent(tplpl.generateHtml({ ...tplpl.defaultParams, userName: "{{name}}" }));
  };

  // Handle File Selection
  const handleFileChange = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      setRawCsvText(text);
      if (!campaignLabel) {
        setCampaignLabel(`Bulk CSV Campaign — ${file.name.replace(/\.[^/.]+$/, "")}`);
      }
      showToast("info", "CSV File Loaded", `Loaded "${file.name}" with ${file.size} bytes.`);
    };
    reader.readAsText(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Load Sample Demo Data (Includes adamskams03@gmail.com)
  const handleLoadSampleCsv = () => {
    const sample = generateSampleCsv();
    setRawCsvText(sample);
    setSelectedFile(null);
    setCampaignLabel("Demo Cohort — Enterprise Sandbox Developers");
    showToast("success", "Demo Contacts Loaded", "Populated sample enterprise contacts.");
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sample = generateSampleCsv();
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hexacore_recipients_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("info", "Download Started", "Saved hexacore_recipients_sample.csv with sample contacts.");
  };

  // Clear current CSV
  const handleClearCsv = () => {
    setRawCsvText("");
    setSelectedFile(null);
    setCampaignLabel("");
    setSendResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Insert variable into subject or message
  const insertVariable = (variableName: string, target: "subject" | "message") => {
    const tag = `{{${variableName}}}`;
    if (target === "subject") {
      setSubject((prev) => `${prev} ${tag}`);
    } else {
      setMessageContent((prev) => `${prev} ${tag}`);
    }
  };

  // Copy HTML
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(messageContent);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
    showToast("info", "HTML Copied", "Email template HTML copied to clipboard.");
  };

  // Preview Personalized Email using first recipient
  const handlePreviewPersonalized = () => {
    if (parseResult.recipients.length === 0) {
      onOpenPreview(messageContent);
      return;
    }

    const firstRecipient = parseResult.recipients[0];
    let personalizedHtml = messageContent;
    const params = {
      name: firstRecipient.name || firstRecipient.email.split("@")[0],
      userName: firstRecipient.name || firstRecipient.email.split("@")[0],
      email: firstRecipient.email,
      ...(firstRecipient.params || {}),
    };

    Object.entries(params).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*(?:params\\.)?${key}\\s*\\}\\}`, "gi");
      personalizedHtml = personalizedHtml.replace(regex, val);
    });

    onOpenPreview(personalizedHtml);
  };

  // Dry run / validate with API
  const handleValidateCampaign = async () => {
    if (parseResult.recipients.length === 0) {
      showToast("error", "Validation Error", "Please upload or provide valid CSV recipients first.");
      return;
    }

    setIsValidating(true);
    showToast("loading", "Validating CSV...", "Checking syntax and parameters against the dispatcher...");

    try {
      const res = await fetch("/api/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: rawCsvText,
          subject,
          templateId: selectedTemplateId !== "blank" ? selectedTemplateId : undefined,
          htmlContent: messageContent,
          dryRun: true,
          deduplicate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          "success",
          "Validation Passed!",
          `${data.summary?.validRecipients || parseResult.validCount} valid recipient records verified for batch delivery.`
        );
      } else {
        showToast("error", "Validation Warning", data.error || "Failed to validate CSV structure.");
      }
    } catch (err: unknown) {
      showToast("error", "Network Error", err instanceof Error ? err.message : "Failed to contact validator.");
    } finally {
      setIsValidating(false);
    }
  };

  // Dispatch Bulk Campaign
  const handleDispatchBulkCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseResult.recipients.length === 0) {
      showToast("error", "Missing Recipients", "Please upload a CSV with at least one valid email address.");
      return;
    }

    if (!subject.trim()) {
      showToast("error", "Missing Subject", "Please enter a subject line for your bulk email campaign.");
      return;
    }

    if (!messageContent.trim()) {
      showToast("error", "Missing Message", "Please enter email message content.");
      return;
    }

    setIsSending(true);
    setSendResult(null);
    showToast(
      "loading",
      "Initiating Bulk Campaign...",
      `Compiling & dispatching batch to ${parseResult.validCount} recipients via Brevo...`
    );

    const audienceTitle = campaignLabel.trim() || `Bulk CSV (${parseResult.validCount} recipients)`;

    try {
      let res: Response;

      // If user uploaded a physical file, send via multipart/form-data
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("subject", subject.trim());
        if (selectedTemplateId !== "blank") {
          formData.append("templateId", selectedTemplateId);
        }
        formData.append("htmlContent", messageContent);
        formData.append("audienceLabel", audienceTitle);
        formData.append("deduplicate", String(deduplicate));

        res = await fetch("/api/bulk-email", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send JSON payload
        res = await fetch("/api/bulk-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvContent: rawCsvText,
            subject: subject.trim(),
            templateId: selectedTemplateId !== "blank" ? selectedTemplateId : undefined,
            htmlContent: messageContent,
            audienceLabel: audienceTitle,
            deduplicate,
          }),
        });
      }

      const data: BulkEmailResult = await res.json();
      setSendResult(data);

      if (data.success) {
        showToast(
          "success",
          "Campaign Initiated Successfully! 🚀",
          `Delivered bulk emails to ${data.sentCount} recipient(s) across ${data.batchCount} batch(es).`
        );
        setShowSuccessModal(true);
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Log to parent campaigns list
        const recipientItems: CampaignRecipient[] = (data.recipients && data.recipients.length > 0)
          ? data.recipients
          : parseResult.recipients.map((r) => ({
              email: r.email,
              name: r.name || r.email.split("@")[0],
              status: (data.mode === "live" ? "delivered" : "sent") as "delivered" | "sent",
              deliveredAt: new Date().toISOString(),
              metadata: r.params || {},
            }));

        const newRecord: CampaignRecord = {
          id: data.campaignId || `camp-bulk-${Date.now()}`,
          subject: subject.trim(),
          audience: audienceTitle,
          status: data.mode === "live" ? "delivered" : "sent",
          created_at: "Just now",
          opens: 0,
          clicks: 0,
          content: messageContent,
          recipients: recipientItems,
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `hexacore_campaign_recipients_${newRecord.id}`,
              JSON.stringify(recipientItems)
            );
          } catch {
            // ignore
          }
        }

        onCampaignSent(newRecord);
      } else {
        showToast(
          "error",
          "Bulk Dispatch Failed",
          data.errors?.join("; ") || "Failed to dispatch email batch."
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect to bulk email dispatcher API.";
      showToast("error", "Dispatch Error", errorMsg);
      setSendResult({
        success: false,
        mode: "live",
        totalRecipients: parseResult.validCount,
        sentCount: 0,
        failedCount: parseResult.validCount,
        batchCount: 0,
        invalidSkipped: 0,
        results: [],
        errors: [errorMsg],
      });
    } finally {
      setIsSending(false);
    }
  };

  // Preview list filtering
  const previewRows = useMemo(() => {
    if (previewFilter === "valid") {
      return parseResult.recipients.map((r, i) => ({
        index: i + 1,
        email: r.email,
        name: r.name || "-",
        extra: r.params || {},
        isValid: true,
        reason: "Valid & verified",
      }));
    }
    if (previewFilter === "invalid") {
      return parseResult.invalidRows.map((inv) => ({
        index: inv.rowNumber,
        email: inv.data?.email || inv.data?.Email || "-",
        name: inv.data?.name || inv.data?.Name || "-",
        extra: inv.data,
        isValid: false,
        reason: inv.reason,
      }));
    }
    // All (combine valid + invalid up to 15 items)
    const validMapped = parseResult.recipients.slice(0, 8).map((r, i) => ({
      index: i + 1,
      email: r.email,
      name: r.name || "-",
      extra: r.params || {},
      isValid: true,
      reason: "Ready for batch send",
    }));
    const invalidMapped = parseResult.invalidRows.slice(0, 5).map((inv) => ({
      index: inv.rowNumber,
      email: inv.data?.email || inv.data?.Email || "-",
      name: inv.data?.name || inv.data?.Name || "-",
      extra: inv.data,
      isValid: false,
      reason: inv.reason,
    }));
    return [...validMapped, ...invalidMapped];
  }, [parseResult, previewFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      
      {/* FLOATING SUCCESS / ACTION TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3.5 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/30"
                : toast.type === "error"
                ? "bg-rose-950/95 text-white border-rose-500/40 shadow-rose-950/30"
                : toast.type === "loading"
                ? "bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/30"
                : "bg-slate-900/95 text-white border-slate-700/40"
            }`}
          >
            {toast.type === "success" && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === "loading" && (
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm leading-tight text-white flex items-center gap-2">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>

              {toast.type === "success" && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewChange("history")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>View Campaign History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DISPATCH SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && sendResult && sendResult.success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <MailCheck className="w-9 h-9" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 text-center tracking-tight">
              Campaign Initiated Successfully!
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm text-center mt-1.5">
              Your bulk emails have been compiled and submitted to the Brevo delivery engine.
            </p>

            {/* Campaign Summary Box */}
            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Subject</span>
                <span className="font-bold text-slate-800 truncate max-w-xs">{subject}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Recipients Delivered</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  {sendResult.sentCount} of {sendResult.totalRecipients} emails
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Delivery Provider</span>
                <span className="font-bold text-slate-700">Brevo Transactional SMTP</span>
              </div>
              {sendResult.campaignId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Supabase Log ID</span>
                  <span className="font-mono text-[11px] text-[#1a6fd4] font-semibold">{sendResult.campaignId}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onViewChange("history");
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0d1f4a] hover:bg-[#1a6fd4] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View in History &amp; Logs</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0d1f4a] to-[#1a6fd4] flex items-center justify-center text-white shadow-md shadow-[#1a6fd4]/20">
              <Users className="w-5 h-5 text-[#00c8e8]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight flex items-center gap-2.5">
                Bulk Email Dispatcher
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Upload CSV contact lists, personalize template tags (<code className="text-[#1a6fd4] font-semibold">&#123;&#123;name&#125;&#125;</code>, <code className="text-[#1a6fd4] font-semibold">&#123;&#123;company&#125;&#125;</code>), and dispatch batch campaigns at scale.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download CSV format template"
          >
            <Download className="w-4 h-4 text-[#1a6fd4]" />
            <span>Sample CSV</span>
          </button>

          {/* <button
            type="button"
            onClick={handleLoadSampleCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-[#1a6fd4] text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Quick fill with sample enterprise contacts"
          >
            <Sparkles className="w-4 h-4 text-[#00c8e8]" />
            <span>Load Demo Contacts</span>
          </button> */}
        </div>
      </div>

      {/* DISPATCH RESULT BANNER */}
      {sendResult && (
        <div
          className={`p-6 rounded-2xl border shadow-sm transition-all animate-in slide-in-from-top-4 duration-300 ${
            sendResult.success
              ? sendResult.mode === "simulation"
                ? "bg-amber-50/90 border-amber-200 text-amber-900"
                : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {sendResult.success ? (
                sendResult.mode === "simulation" ? (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                )
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  {sendResult.success
                    ? sendResult.mode === "simulation"
                      ? "Bulk Email Batch Compiled (Simulation Mode)"
                      : "Bulk Email Dispatched Successfully!"
                    : "Bulk Email Dispatch Failed"}
                </h3>
                <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
                  {sendResult.success
                    ? sendResult.mode === "simulation"
                      ? "Simulation Mode: All recipient rows and template tags were parsed & compiled successfully. To deliver real transactional emails through your domain, configure BREVO_API_KEY in .env.local."
                      : `Successfully delivered bulk messages to ${sendResult.sentCount} recipients across ${sendResult.batchCount} batch request(s).`
                    : sendResult.errors?.join("; ") || "An error occurred while communicating with the email delivery service."}
                </p>

                {/* Batch Metrics */}
                <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-current/15">
                    Total: {sendResult.totalRecipients}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-current/15">
                    Sent: {sendResult.sentCount}
                  </span>
                  {sendResult.failedCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                      Failed: {sendResult.failedCount}
                    </span>
                  )}
                  {sendResult.campaignId && (
                    <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-current/15 font-mono">
                      ID: {sendResult.campaignId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onViewChange("history")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span>View in History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSendResult(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: CSV DATA SOURCE & INSPECTION */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#0d1f4a] text-white flex items-center justify-center font-bold text-xs">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0d1f4a]">Upload or Paste Recipient CSV</h2>
              <p className="text-xs text-slate-500">Provide recipient emails, names, and optional custom columns.</p>
            </div>
          </div>

          {/* Toggle between Upload / Manual Paste */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "upload" ? "bg-white text-[#1a6fd4] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "manual" ? "bg-white text-[#1a6fd4] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Direct CSV Text
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* UPLOAD VIEW */}
          {activeTab === "upload" ? (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-[#1a6fd4] bg-blue-50/70 scale-[1.01]"
                    : selectedFile
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-300 hover:border-[#1a6fd4] hover:bg-slate-50/80"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1a6fd4] mb-3 shadow-inner">
                  {selectedFile ? (
                    <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-[#1a6fd4]" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-2">
                      <span className="truncate max-w-sm">{selectedFile.name}</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      File loaded &amp; parsed into {parseResult.validCount} valid recipient records
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">Click or drag a new file to replace</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Drop your recipient CSV file here, or <span className="text-[#1a6fd4] underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports comma-delimited .csv files with headers (e.g. <code className="text-slate-700">email,name,company</code>)
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClearCsv}
                    className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear File
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL CSV TEXT */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Paste Raw CSV Content
                </label>
                {rawCsvText && (
                  <button
                    type="button"
                    onClick={handleClearCsv}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={rawCsvText}
                onChange={(e) => setRawCsvText(e.target.value)}
                placeholder="email,name,company&#10;sarah.chen@techcorp.io,Sarah Chen,TechCorp&#10;marcus@fintech.net,Marcus Vance,FinTech Ltd"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none"
              />
            </div>
          )}

          {/* PARSE METRICS SUMMARY */}
          {parseResult.totalRows > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Rows</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">
                    {parseResult.totalRows}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Valid Emails
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1 block">
                    {parseResult.validCount}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    Invalid / Skipped
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-rose-800 mt-1 block">
                    {parseResult.invalidRows.length}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a6fd4] block flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00c8e8]" />
                    Detected Variables
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#0d1f4a] mt-1 block">
                    {parseResult.detectedColumns.customCols.length + 1}
                  </span>
                </div>
              </div>

              {/* Deduplication Switch */}
              <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    className="rounded text-[#1a6fd4] focus:ring-[#1a6fd4]"
                  />
                  <span>Automatically deduplicate repeated email addresses ({parseResult.duplicates.length} duplicate(s) found)</span>
                </label>

                {parseResult.detectedColumns.emailCol && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Email Column: <strong>{parseResult.detectedColumns.emailCol}</strong>
                  </span>
                )}
              </div>

              {/* RECIPIENTS PREVIEW TABLE */}
              <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recipients Data Preview ({parseResult.validCount} ready)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("all")}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        previewFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      All ({previewRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("valid")}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        previewFilter === "valid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Valid Only
                    </button>
                    {parseResult.invalidRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter("invalid")}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          previewFilter === "invalid" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Invalid Only ({parseResult.invalidRows.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">Email Address</th>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Custom Attributes</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? "hover:bg-slate-50/60" : "bg-rose-50/40"}>
                          <td className="px-4 py-2 text-slate-400 font-mono">{row.index}</td>
                          <td className="px-4 py-2 font-medium text-slate-800 font-mono text-[11px]">
                            {row.email}
                          </td>
                          <td className="px-4 py-2 text-slate-700">{row.name}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(row.extra || {})
                                .filter(([k]) => !["email", "name"].includes(k.toLowerCase()))
                                .slice(0, 3)
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                                  >
                                    {k}: {String(v)}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate max-w-xs">{row.reason}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: CAMPAIGN CONFIGURATION & PERSONALIZATION */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#0d1f4a] text-white flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0d1f4a]">Template &amp; Dynamic Variables</h2>
              <p className="text-xs text-slate-500">
                Choose a template or write custom HTML. Placeholders are dynamically personalized per recipient.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleDispatchBulkCampaign} className="p-6 space-y-6">
          
          {/* QUICK TEMPLATES SELECT */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-[#1a6fd4]" />
              CHOOSE EMAIL TEMPLATE
            </label>
            <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an email template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#1a6fd4] shrink-0" />
                    <span>Welcome to Hexacore — Composable Open Finance</span>
                  </div>
                </SelectItem>
                <SelectItem value="promo">
                  <div className="flex items-center gap-2.5">
                    <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Special 50% Off Platform Developer Credits</span>
                  </div>
                </SelectItem>
                <SelectItem value="announcement">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Hexacore Platform Release &amp; API Upgrades</span>
                  </div>
                </SelectItem>
                <SelectItem value="verification">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Account Email Verification (OTP)</span>
                  </div>
                </SelectItem>
                <SelectItem value="password-reset">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Password Reset Security Notice</span>
                  </div>
                </SelectItem>
                <SelectItem value="api-key-created">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>API Key Generated Notification</span>
                  </div>
                </SelectItem>
                <SelectItem value="team-invite">
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Team Member Workspace Invitation</span>
                  </div>
                </SelectItem>
                <SelectItem value="blank">
                  <div className="flex items-center gap-2.5">
                    <FileEdit className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Blank Custom Template</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DYNAMIC VARIABLES PILL BAR */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Available Personalization Tags (Click to insert):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => insertVariable("name", "subject")}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#1a6fd4] text-xs font-mono text-slate-700 hover:text-[#1a6fd4] transition-all shadow-2xs cursor-pointer"
                title="Insert {{name}} into Subject"
              >
                + &#123;&#123;name&#125;&#125; (Subject)
              </button>
              <button
                type="button"
                onClick={() => insertVariable("name", "message")}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#1a6fd4] text-xs font-mono text-slate-700 hover:text-[#1a6fd4] transition-all shadow-2xs cursor-pointer"
                title="Insert {{name}} into Body"
              >
                + &#123;&#123;name&#125;&#125; (Body)
              </button>
              <button
                type="button"
                onClick={() => insertVariable("email", "message")}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#1a6fd4] text-xs font-mono text-slate-700 hover:text-[#1a6fd4] transition-all shadow-2xs cursor-pointer"
              >
                + &#123;&#123;email&#125;&#125;
              </button>
              {parseResult.detectedColumns.customCols.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertVariable(col, "message")}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:border-[#1a6fd4] text-xs font-mono text-[#1a6fd4] transition-all shadow-2xs cursor-pointer"
                >
                  + &#123;&#123;{col}&#125;&#125;
                </button>
              ))}
            </div>
          </div>

          {/* SUBJECT LINE */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1a6fd4]" />
              CAMPAIGN SUBJECT LINE
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Exclusive Update for {{name}} at {{company}}"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none font-medium text-sm"
            />
          </div>

          {/* CAMPAIGN AUDIENCE LABEL */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#1a6fd4]" />
              CAMPAIGN AUDIENCE LABEL (FOR LOGS &amp; ANALYTICS)
            </label>
            <input
              type="text"
              value={campaignLabel}
              onChange={(e) => setCampaignLabel(e.target.value)}
              placeholder={`Bulk CSV (${parseResult.validCount} recipients)`}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none font-medium text-sm"
            />
          </div>

          {/* EMAIL CONTENT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1a6fd4]" />
                EMAIL MARKUP (HTML ALLOWED)
              </label>
              <span className="text-xs font-medium text-slate-400">
                Placeholders: &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, or any column
              </span>
            </div>
            <textarea
              rows={10}
              required
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Write your email content or paste HTML here..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none font-mono text-xs leading-relaxed"
            />
          </div>

          {/* DISPATCH ACTION BAR */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePreviewPersonalized}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 hover:border-blue-200 text-slate-700 hover:text-[#1a6fd4] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#1a6fd4]" />
                Preview Personalized Sample
              </button>

              <button
                type="button"
                onClick={handleCopyHtml}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isValidating || parseResult.validCount === 0}
                onClick={handleValidateCampaign}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1a6fd4]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#1a6fd4]" />
                )}
                <span>Dry Run / Verify</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {sendResult && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
                  {sendResult.success ? (
                    <span className="text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Dispatched {sendResult.sentCount} emails!
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Failed to dispatch
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSending || parseResult.validCount === 0}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 active:scale-95 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#1a6fd4]/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching {parseResult.validCount} Bulk Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Campaign ({parseResult.validCount} Contacts)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
