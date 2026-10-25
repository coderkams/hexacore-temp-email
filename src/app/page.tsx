"use client";

import React, { useState, useEffect } from "react";
import { 
  templateList, 
  templates, 
  getTemplateById 
} from "@/templates";
import { TemplateType, SendEmailResult } from "@/lib/types";
import { 
  Mail, 
  Search, 
  Menu, 
  X, 
  LayoutTemplate, 
  FileText, 
  Users, 
  Sparkles, 
  Send, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Copy, 
  Check, 
  Clock, 
  ArrowUpRight, 
  BarChart3, 
  Trash2, 
  Monitor, 
  Smartphone, 
  ExternalLink,
  Code,
  KeyRound,
  ShieldCheck,
  Lock,
  UserPlus,
  FileEdit,
  Globe,
  Building2,
  User,
  Megaphone,
  Tag,
  MoreVertical,
  Settings,
  ChevronDown,
  Inbox,
  Star,
  Reply,
  RefreshCw,
  CheckCheck,
  MailOpen,
  Info
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarEdgeTrigger } from "@/components/ui/sidebar-edge-trigger";

interface CampaignRecord {
  id: string;
  subject: string;
  audience: string;
  status: "pending" | "sent" | "delivered" | "failed";
  created_at: string;
  opens: number;
  clicks: number;
  content?: string;
}

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

const INITIAL_CAMPAIGNS: CampaignRecord[] = [];

export default function EmailDashboardPage() {
  // Navigation: side menu controls active view ("compose" | "history" | "inbox")
  const [activeView, setActiveView] = useState<"compose" | "history" | "inbox">("compose");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Campaign Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("welcome");
  const [subject, setSubject] = useState<string>("Welcome to Hexacore — The Composable Open Finance Platform");
  const [audience, setAudience] = useState<string>("all");
  const [individualEmail, setIndividualEmail] = useState<string>("");
  const [individualName, setIndividualName] = useState<string>("");
  const [messageContent, setMessageContent] = useState<string>("");

  // Sending & Feedback
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<SendEmailResult | null>(null);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // History & Metrics State
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(INITIAL_CAMPAIGNS);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [modalPreviewHtml, setModalPreviewHtml] = useState<string>("");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");

  // Inbox State
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [selectedInboxMessage, setSelectedInboxMessage] = useState<InboxMessage | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "starred">("all");
  const [inboxSearch, setInboxSearch] = useState<string>("");
  const [inboundGuideModalOpen, setInboundGuideModalOpen] = useState<boolean>(false);
  const [isRefreshingInbox, setIsRefreshingInbox] = useState<boolean>(false);

  // Fetch campaigns from Supabase backend on mount
  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        }
      })
      .catch((err) => console.warn("Supabase fetch notice:", err));
  }, []);

  // Fetch inbox messages
  const fetchInbox = async () => {
    setIsRefreshingInbox(true);
    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setInboxMessages(data.messages);
        if (data.messages.length > 0 && !selectedInboxMessage) {
          setSelectedInboxMessage(data.messages[0]);
        }
      }
    } catch (err) {
      console.warn("Supabase inbox fetch notice:", err);
    } finally {
      setIsRefreshingInbox(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const unreadInboxCount = inboxMessages.filter((m) => m.isUnread).length;
  const starredInboxCount = inboxMessages.filter((m) => m.isStarred).length;

  // Toggle star
  const handleToggleStar = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInboxMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, isStarred: !msg.isStarred } : msg
      )
    );
    if (selectedInboxMessage?.id === id) {
      setSelectedInboxMessage((prev) => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
  };

  // Toggle unread
  const handleToggleUnread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInboxMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, isUnread: !msg.isUnread } : msg
      )
    );
    if (selectedInboxMessage?.id === id) {
      setSelectedInboxMessage((prev) => prev ? { ...prev, isUnread: !prev.isUnread } : null);
    }
  };

  // Delete message
  const handleDeleteInboxMessage = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInboxMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedInboxMessage?.id === id) {
      const remaining = inboxMessages.filter((m) => m.id !== id);
      setSelectedInboxMessage(remaining.length > 0 ? remaining[0] : null);
    }
    try {
      await fetch(`/api/inbox?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Delete inbox message error:", err);
    }
  };

  // Select message and mark read
  const handleSelectInboxMessage = (msg: InboxMessage) => {
    if (msg.isUnread) {
      setInboxMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isUnread: false } : m))
      );
    }
    setSelectedInboxMessage({ ...msg, isUnread: false });
  };

  // Reply to message (seamless transition to Compose)
  const handleReplyToMessage = (msg: InboxMessage) => {
    setAudience("individual");
    setIndividualEmail(msg.fromEmail);
    setIndividualName(msg.fromName);
    const replySubject = msg.subject.toLowerCase().startsWith("re:")
      ? msg.subject
      : `Re: ${msg.subject}`;
    setSubject(replySubject);
    setMessageContent(
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0d1f4a;">\n  <p>Hi ${msg.fromName},</p>\n  <p><br/></p>\n  <p>Thank you for reaching out.</p>\n  <br/>\n  <div style="border-left: 3px solid #00c8e8; padding-left: 14px; margin: 16px 0; color: #64748b; font-size: 14px;">\n    <strong>On ${msg.date}, ${msg.fromName} &lt;${msg.fromEmail}&gt; wrote:</strong>\n    <p style="margin-top: 8px;">${msg.preview || msg.bodyHtml.replace(/<[^>]*>?/gm, "").substring(0, 200)}</p>\n  </div>\n</div>`
    );
    setActiveView("compose");
  };

  // Simulate test inbound reply
  const handleSimulateInboundReply = () => {
    const testMsg: InboxMessage = {
      id: `msg-${Date.now()}`,
      fromName: "Sarah Jenkins",
      fromEmail: "s.jenkins@fintechpartners.com",
      toEmail: "info@hexacore.ng",
      subject: "Re: Welcome to Hexacore — Composable Open Finance",
      date: "Just now",
      preview: "We have configured our development API keys and are testing high-throughput transactions...",
      bodyHtml: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #0d1f4a; padding: 4px;">
          <p>Hi Hexacore team,</p>
          <p>We received your API provisioning notification and our engineering team is testing the composable banking sandbox today.</p>
          <p>Could you clarify the rate limits for the <code>/v2/transactions/batch</code> endpoint on the developer tier? Also, do you support webhook retry intervals with exponential backoff?</p>
          <br/>
          <p>Best regards,<br/><strong>Sarah Jenkins</strong><br/>VP Engineering, FinTech Partners</p>
        </div>
      `,
      isUnread: true,
      isStarred: false,
    };

    setInboxMessages((prev) => [testMsg, ...prev]);
    setSelectedInboxMessage(testMsg);
  };

  const filteredInboxMessages = inboxMessages.filter((msg) => {
    if (inboxFilter === "unread" && !msg.isUnread) return false;
    if (inboxFilter === "starred" && !msg.isStarred) return false;
    if (inboxSearch.trim()) {
      const q = inboxSearch.toLowerCase();
      return (
        msg.subject.toLowerCase().includes(q) ||
        msg.fromName.toLowerCase().includes(q) ||
        msg.fromEmail.toLowerCase().includes(q) ||
        msg.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Initialize with Hexacore welcome template
  useEffect(() => {
    const welcome = getTemplateById("welcome");
    if (welcome) {
      setSubject(welcome.subject);
      setMessageContent(welcome.generateHtml(welcome.defaultParams));
    }
  }, []);

  // When quick template is selected
  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateId(templateKey);
    setSendResult(null);

    if (templateKey === "blank") {
      setSubject("");
      setMessageContent(
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0d1f4a;">\n  <h2 style="color: #1a6fd4; margin-bottom: 16px;">Hexacore Open Finance</h2>\n  <p style="line-height: 1.6; font-size: 15px; color: #64748b;">Write your enterprise announcement or transactional message here...</p>\n</div>`
      );
      return;
    }

    const tmpl = getTemplateById(templateKey as TemplateType);
    if (tmpl) {
      setSubject(tmpl.subject);
      setMessageContent(tmpl.generateHtml(tmpl.defaultParams));
      if (templateKey === "verification" || templateKey === "password-reset" || templateKey === "api-key-created") {
        setAudience("individual");
      } else {
        setAudience("all");
      }
    }
  };

  // Audience label mapping
  const audienceLabelMap: Record<string, string> = {
    all: "All Users (Enterprises & Developers)",
    developers: "Developer Accounts",
    enterprises: "Enterprise Banking Tiers",
    subscribers: "API Changelog Subscribers",
    inactive: "Inactive Workspaces (&gt;30 days)",
    individual: "Individual Recipient",
  };

  // Handle Campaign Send
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      alert("Please enter a subject line for your email campaign.");
      return;
    }

    if (!messageContent.trim()) {
      alert("Please enter email message content.");
      return;
    }

    if (audience === "individual" && (!individualEmail.trim() || !individualEmail.includes("@"))) {
      alert("Please enter a valid individual recipient email address.");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const recipient = audience === "individual" ? individualEmail.trim() : "community@hexacore.io";
    const recipientDisplayName = audience === "individual" ? (individualName || individualEmail.split("@")[0]) : "Hexacore Developer";

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: recipient,
          toName: recipientDisplayName,
          subject: subject,
          templateId: selectedTemplateId !== "blank" ? selectedTemplateId : undefined,
          htmlContent: messageContent,
          audience: audience,
        }),
      });

      const data: SendEmailResult = await res.json();
      setSendResult(data);

      if (data.success) {
        const formattedDate = "Just now";

        const newRecord: CampaignRecord = {
          id: `camp-${Date.now()}`,
          subject: subject,
          audience: audience === "individual" ? `Individual:${individualEmail}` : audienceLabelMap[audience] || audience,
          status: data.mode === "live" ? "delivered" : "sent",
          created_at: formattedDate,
          opens: 0,
          clicks: 0,
          content: messageContent,
        };

        setCampaigns((prev) => [newRecord, ...prev]);
      }
    } catch (err: unknown) {
      setSendResult({
        success: false,
        mode: "live",
        error: err instanceof Error ? err.message : "Failed to connect to email dispatcher API",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Supabase delete notice:", err);
    }
  };

  // Copy HTML
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(messageContent);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  // Status Badge Component
  const renderStatusBadge = (status: CampaignRecord["status"]) => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          PENDING
        </span>
      );
    }
    if (status === "sent") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#1a6fd4] border border-blue-200">
          <Mail className="w-3.5 h-3.5 text-[#1a6fd4]" />
          SENT
        </span>
      );
    }
    if (status === "delivered") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-50 text-[#00c8e8] border border-cyan-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00c8e8]" />
          DELIVERED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
        FAILED
      </span>
    );
  };

  // Stats computation
  const totalCampaignsCount = campaigns.length;
  const totalOpensCount = campaigns.reduce((acc, curr) => acc + (curr.opens || 0), 0);
  const totalClicksCount = campaigns.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b] antialiased font-sans">
      
      {/* ========================================================= */}
      {/* SIDEBAR: Hexacore Logo & (SEND CAMPAIGN + HISTORY)        */}
      {/* ========================================================= */}
      <aside 
        className={`fixed md:sticky top-0 left-0 z-50 h-[100dvh] bg-white border-r border-[#e2e8f0] flex flex-col py-6 transition-all duration-300 ease-in-out shrink-0 relative ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${isSidebarCollapsed ? "w-20" : "w-64 lg:w-72"}`}
      >
        {/* Edge Collapse Trigger (shadcn component mounted on the sidebar border edge) */}
        <SidebarEdgeTrigger
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEXACORE LOGO AREA */}
        <div className={`mb-8 transition-all ${isSidebarCollapsed ? "px-0 flex flex-col items-center" : "px-6"}`}>
          <div 
            onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
            className={`flex items-center gap-3 cursor-pointer select-none overflow-hidden ${isSidebarCollapsed ? "justify-center" : ""}`}
            title="HEXACORE"
          >
            {/* Hexacore Hexagon Icon badge */}
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm border border-[#e2e8f0] shrink-0">
              <img 
                src="/hexacore-icon.png" 
                alt="Hexacore Logo" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://hexacore.ng/images/hexacore.png";
                }}
                className="w-full h-full object-contain"
              />
            </div>
            {/* Logo Text: HEXACORE */}
            {!isSidebarCollapsed && (
              <span className="font-black text-xl tracking-tight text-[#0d1f4a] whitespace-nowrap">
                HEXACORE
              </span>
            )}
          </div>
        </div>

        {/* SIDE MENU: SEND CAMPAIGN & INBOX & HISTORY */}
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
          {/* 1. SEND CAMPAIGN */}
          <button
            onClick={() => {
              setActiveView("compose");
              setIsMobileMenuOpen(false);
            }}
            title="SEND CAMPAIGN"
            className={`w-full flex items-center ${
              isSidebarCollapsed ? "justify-center px-2 py-3.5" : "gap-3 px-4 py-3.5"
            } rounded-2xl transition-all font-bold text-xs uppercase tracking-widest text-left cursor-pointer ${
              activeView === "compose"
                ? "bg-[#0d1f4a] text-white shadow-lg shadow-[#0d1f4a]/25 border border-[#1a6fd4]/30"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-[#1a6fd4]"
            }`}
          >
            <Mail 
              className={`w-5 h-5 shrink-0 ${activeView === "compose" ? "text-[#00c8e8]" : "text-slate-400"}`} 
              strokeWidth={activeView === "compose" ? 2.5 : 2} 
            />
            {!isSidebarCollapsed && <span className="truncate">SEND CAMPAIGN</span>}
          </button>

          {/* 2. INBOX */}
          <button
            onClick={() => {
              setActiveView("inbox");
              setIsMobileMenuOpen(false);
            }}
            title="INBOX"
            className={`w-full flex items-center ${
              isSidebarCollapsed ? "justify-center px-2 py-3.5" : "gap-3 px-4 py-3.5"
            } rounded-2xl transition-all font-bold text-xs uppercase tracking-widest text-left cursor-pointer ${
              activeView === "inbox"
                ? "bg-[#0d1f4a] text-white shadow-lg shadow-[#0d1f4a]/25 border border-[#1a6fd4]/30"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-[#1a6fd4]"
            }`}
          >
            <Inbox 
              className={`w-5 h-5 shrink-0 ${activeView === "inbox" ? "text-[#00c8e8]" : "text-slate-400"}`} 
              strokeWidth={activeView === "inbox" ? 2.5 : 2} 
            />
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate">INBOX</span>
                {unreadInboxCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#00c8e8] text-[#0d1f4a]">
                    {unreadInboxCount}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* 3. HISTORY & RESPONSES */}
          <button
            onClick={() => {
              setActiveView("history");
              setIsMobileMenuOpen(false);
            }}
            title="HISTORY & RESPONSES"
            className={`w-full flex items-center ${
              isSidebarCollapsed ? "justify-center px-2 py-3.5" : "gap-3 px-4 py-3.5"
            } rounded-2xl transition-all font-bold text-xs uppercase tracking-widest text-left cursor-pointer ${
              activeView === "history"
                ? "bg-[#0d1f4a] text-white shadow-lg shadow-[#0d1f4a]/25 border border-[#1a6fd4]/30"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-[#1a6fd4]"
            }`}
          >
            <History 
              className={`w-5 h-5 shrink-0 ${activeView === "history" ? "text-[#00c8e8]" : "text-slate-400"}`} 
              strokeWidth={activeView === "history" ? 2.5 : 2} 
            />
            {!isSidebarCollapsed && <span className="truncate">HISTORY & RESPONSES</span>}
          </button>
        </nav>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP NAVIGATION HEADER */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex justify-between items-center sticky top-0 z-30 shadow-xs relative">
          
          {/* Left: Mobile hamburger & Search Bar */}
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-100/90 focus:bg-white rounded-md outline-none focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] transition-all text-sm w-48 sm:w-64 border border-transparent"
              />
            </div>
          </div>

          {/* Centered Header Tagline */}
          <div className="hidden sm:flex absolute inset-0 items-center justify-center pointer-events-none px-6">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0d1f4a] tracking-tight text-center pointer-events-auto">
              The #1 composable Open Finance Platform
            </span>
          </div>
        </header>

        {/* SUBHEADER BAR (Hexacore Blue/Cyan Soft Tint) */}
        <div className="bg-[#f8fafc] px-6 lg:px-8 py-3 flex justify-between items-center border-b border-[#e2e8f0]">
          <h2 className="text-[#1a6fd4] font-semibold text-sm sm:text-base">
            {activeView === "compose" 
              ? "Emailing" 
              : activeView === "history" 
              ? "Campaign History" 
              : "Inbox & Inbound Messages"}
          </h2>
        </div>

        {/* MAIN BODY CONTAINER */}
        <main className="p-6 lg:p-8 max-w-7xl w-full mx-auto">
          
          {/* ========================================================= */}
          {/* VIEW 1: SEND CAMPAIGN                                     */}
          {/* ========================================================= */}
          {activeView === "compose" && (
            <div className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
              
              {/* Card Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight">
                    Email Campaigns
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Send promotional bulk emails and view responses.
                  </p>
                </div>
                
                {/* Secondary link to history */}
                <button
                  onClick={() => setActiveView("history")}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#1a6fd4] hover:text-[#155cb4] transition-colors"
                >
                  <History className="w-4 h-4" />
                  View History ({campaigns.length})
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 sm:p-8">
                <form onSubmit={handleSendCampaign} className="space-y-6 max-w-4xl">
                  
                  {/* FIELD 1: QUICK TEMPLATES (shadcn/ui Select with Lucide icons) */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-[#1a6fd4]" />
                      QUICK TEMPLATES
                    </label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={handleSelectTemplate}
                    >
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
                        <SelectItem value="api-key-created">
                          <div className="flex items-center gap-2.5">
                            <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>API Key Generated Notification</span>
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
                        <SelectItem value="team-invite">
                          <div className="flex items-center gap-2.5">
                            <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>Team Member Workspace Invitation</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="blank">
                          <div className="flex items-center gap-2.5">
                            <FileEdit className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Blank Email</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* FIELD 2: SUBJECT LINE */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1a6fd4]" />
                      SUBJECT LINE
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Special 50% Off Discount for Next Cohort!"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
                    />
                  </div>

                  {/* FIELD 3: TARGET AUDIENCE (shadcn/ui Select with Lucide icons) */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1a6fd4]" />
                      TARGET AUDIENCE
                    </label>
                    <Select
                      value={audience}
                      onValueChange={(val) => setAudience(val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2.5">
                            <Globe className="w-4 h-4 text-[#1a6fd4] shrink-0" />
                            <span>All Users (Enterprises &amp; Developers)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="developers">
                          <div className="flex items-center gap-2.5">
                            <Code className="w-4 h-4 text-cyan-600 shrink-0" />
                            <span>Developer Accounts</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="enterprises">
                          <div className="flex items-center gap-2.5">
                            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>Enterprise Banking Tiers</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="subscribers">
                          <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>API Changelog Subscribers</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Inactive Workspaces (&gt;30 days)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2.5">
                            <User className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Individual Recipient</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CONDITIONAL FIELD: Individual Recipient */}
                  {audience === "individual" && (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0d1f4a] mb-1.5">
                          Recipient Email
                        </label>
                        <input
                          type="email"
                          required
                          value={individualEmail}
                          onChange={(e) => setIndividualEmail(e.target.value)}
                          placeholder="e.g., alex.rivera@bankcorp.com"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-blue-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0d1f4a] mb-1.5">
                          Recipient Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={individualName}
                          onChange={(e) => setIndividualName(e.target.value)}
                          placeholder="e.g., Alex Rivera"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-blue-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* FIELD 4: EMAIL CONTENT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#1a6fd4]" />
                        EMAIL CONTENT
                      </label>
                      <span className="text-xs font-medium text-slate-400">
                        HTML allowed
                      </span>
                    </div>

                    <textarea
                      rows={10}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Write your promotional message here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] focus:outline-none transition-all placeholder:text-slate-400 font-mono text-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* ACTION BAR: PREVIEW / COPY / SEND */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalPreviewHtml(messageContent);
                          setPreviewModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 hover:border-blue-200 text-slate-700 hover:text-[#1a6fd4] text-xs font-bold transition-all shadow-xs"
                      >
                        <Eye className="w-4 h-4 text-[#1a6fd4]" />
                        Preview Email
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyHtml}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
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
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 active:scale-95 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#1a6fd4]/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Campaign...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Campaign</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* RESULT BANNER */}
                  {sendResult && (
                    <div className={`p-4 rounded-xl border text-sm transition-all animate-in fade-in flex items-center justify-between ${
                      sendResult.success 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}>
                      <div className="flex items-center gap-2.5 font-bold">
                        {sendResult.success ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Campaign Initiated Successfully!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                            <span>{sendResult.error || "Failed to Dispatch Campaign"}</span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSendResult(null)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: HISTORY & RESPONSES                               */}
          {/* ========================================================= */}
          {activeView === "history" && (
            <div className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
              
              {/* Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight">
                    Email Campaigns
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Send promotional bulk emails and view responses.
                  </p>
                </div>

                <button
                  onClick={() => setActiveView("compose")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20"
                >
                  <Mail className="w-3.5 h-3.5" />
                  New Campaign
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                
                {/* 3 QUICK STATS CARDS (Hexacore Blue / Cyan Palettes) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Card 1: Total Campaigns */}
                  <div className="p-5 rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a6fd4] shrink-0">
                      <Mail className="w-5 h-5 text-[#1a6fd4]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        TOTAL CAMPAIGNS
                      </p>
                      <p className="text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalCampaignsCount}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Total Opens */}
                  <div className="p-5 rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#00c8e8] shrink-0">
                      <ArrowUpRight className="w-5 h-5 text-[#00c8e8]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        TOTAL OPENS
                      </p>
                      <p className="text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalOpensCount}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Total Clicks */}
                  <div className="p-5 rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a6fd4] shrink-0">
                      <BarChart3 className="w-5 h-5 text-[#1a6fd4]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        TOTAL CLICKS
                      </p>
                      <p className="text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalClicksCount}
                      </p>
                    </div>
                  </div>

                </div>

                {/* TABLE OF CAMPAIGNS */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-4 px-6">CAMPAIGN</th>
                        <th className="py-4 px-4">STATUS</th>
                        <th className="py-4 px-4">AUDIENCE</th>
                        <th className="py-4 px-4 text-right">PERFORMANCE</th>
                        <th className="py-4 px-4 text-right w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                            No email campaigns found in history.
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((campaign) => (
                          <tr key={campaign.id} className="hover:bg-slate-50/70 transition-colors group">
                            
                            {/* Campaign Subject & Date */}
                            <td className="py-4 px-6">
                              <div 
                                onClick={() => {
                                  if (campaign.content) {
                                    setModalPreviewHtml(campaign.content);
                                    setPreviewModalOpen(true);
                                  }
                                }}
                                className="font-bold text-[#0d1f4a] text-sm hover:text-[#1a6fd4] cursor-pointer transition-colors line-clamp-1"
                              >
                                {campaign.subject}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {campaign.created_at}
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {renderStatusBadge(campaign.status)}
                            </td>

                            {/* Audience */}
                            <td className="py-4 px-4 text-xs font-medium text-slate-600">
                              {campaign.audience}
                            </td>

                            {/* Performance: opens / clicks */}
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end leading-tight">
                                <span className="text-xs font-bold text-slate-800">
                                  {campaign.opens} <span className="font-normal text-slate-500">opens</span>
                                </span>
                                <span className="text-xs font-bold text-slate-800 mt-0.5">
                                  {campaign.clicks} <span className="font-normal text-slate-500">clicks</span>
                                </span>
                              </div>
                            </td>

                            {/* Delete Action (Red Trash Icon) */}
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                title="Delete campaign"
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: INBOX & INBOUND MESSAGES                         */}
          {/* ========================================================= */}
          {activeView === "inbox" && (
            <div className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight">
                      Inbox
                    </h3>
                    {unreadInboxCount > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#00c8e8]/20 text-[#0d1f4a] border border-[#00c8e8]/40">
                        {unreadInboxCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    Incoming recipient replies and parsed messages via Brevo inbound webhook.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setInboundGuideModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#1a6fd4] hover:bg-blue-50/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#1a6fd4]" />
                    Inbound Webhook Setup
                  </button>

                  <button
                    onClick={handleSimulateInboundReply}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Simulate Reply
                  </button>

                  <button
                    onClick={fetchInbox}
                    disabled={isRefreshingInbox}
                    title="Refresh Inbox"
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInbox ? "animate-spin text-[#1a6fd4]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="px-6 py-3 border-b border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInboxFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inboxFilter === "all"
                        ? "bg-[#0d1f4a] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    All ({inboxMessages.length})
                  </button>

                  <button
                    onClick={() => setInboxFilter("unread")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      inboxFilter === "unread"
                        ? "bg-[#0d1f4a] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    <span>Unread</span>
                    {unreadInboxCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#00c8e8] text-[#0d1f4a] text-[10px] flex items-center justify-center font-black">
                        {unreadInboxCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInboxFilter("starred")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      inboxFilter === "starred"
                        ? "bg-[#0d1f4a] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Starred ({starredInboxCount})</span>
                  </button>
                </div>

                {/* Search within inbox */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter messages..."
                    value={inboxSearch}
                    onChange={(e) => setInboxSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] w-full sm:w-56"
                  />
                </div>
              </div>

              {/* Inbox Body: Split View or Empty State */}
              {filteredInboxMessages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a6fd4] mb-4 shadow-xs">
                    <Inbox className="w-8 h-8 text-[#1a6fd4]" />
                  </div>
                  <h4 className="text-base font-bold text-[#0d1f4a]">
                    {inboxSearch ? "No matching messages found" : "Your inbox is clear"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
                    {inboxSearch
                      ? `No emails match "${inboxSearch}". Clear the search to view all inbound messages.`
                      : "When recipients reply to your emails or Brevo receives incoming messages via your MX records, they will automatically appear here."}
                  </p>
                  {!inboxSearch && (
                    <button
                      onClick={handleSimulateInboundReply}
                      className="mt-5 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Send Test Reply to Inbox
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
                  
                  {/* Left Column: Message List (5 cols on lg) */}
                  <div className="lg:col-span-5 border-r border-slate-100 overflow-y-auto max-h-[680px] divide-y divide-slate-100">
                    {filteredInboxMessages.map((msg) => {
                      const isSelected = selectedInboxMessage?.id === msg.id;
                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleSelectInboxMessage(msg)}
                          className={`p-4 cursor-pointer transition-colors relative flex items-start gap-3 ${
                            isSelected
                              ? "bg-blue-50/70 border-l-4 border-l-[#1a6fd4]"
                              : msg.isUnread
                              ? "bg-white hover:bg-slate-50/80 font-semibold"
                              : "bg-slate-50/30 hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          {/* Unread indicator dot */}
                          {msg.isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#00c8e8] mt-1.5 shrink-0" />
                          )}

                          {/* Star toggle */}
                          <button
                            onClick={(e) => handleToggleStar(msg.id, e)}
                            className="mt-0.5 text-slate-300 hover:text-amber-500 transition-colors shrink-0"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                msg.isStarred
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>

                          {/* Message snippet details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className={`text-xs truncate ${msg.isUnread ? "font-bold text-[#0d1f4a]" : "font-medium text-slate-700"}`}>
                                {msg.fromName}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {msg.date}
                              </span>
                            </div>

                            <p className={`text-xs truncate mb-1 ${msg.isUnread ? "font-bold text-[#0d1f4a]" : "text-slate-800"}`}>
                              {msg.subject}
                            </p>

                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {msg.preview}
                            </p>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Message Reader (7 cols on lg) */}
                  <div className="lg:col-span-7 flex flex-col bg-[#fdfdfd]">
                    {selectedInboxMessage ? (
                      <div className="flex-1 flex flex-col">
                        
                        {/* Message Reader Action Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReplyToMessage(selectedInboxMessage)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1f4a] hover:bg-[#1a6fd4] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              Reply
                            </button>

                            <button
                              onClick={(e) => handleToggleStar(selectedInboxMessage.id, e)}
                              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
                              title="Star message"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  selectedInboxMessage.isStarred
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-slate-400"
                                }`}
                              />
                            </button>

                            <button
                              onClick={(e) => handleToggleUnread(selectedInboxMessage.id, e)}
                              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
                              title="Mark unread"
                            >
                              <Mail className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>

                          <button
                            onClick={(e) => handleDeleteInboxMessage(selectedInboxMessage.id, e)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Message Metadata Header */}
                        <div className="p-6 bg-white border-b border-slate-100">
                          <h2 className="text-lg font-bold text-[#0d1f4a] mb-3">
                            {selectedInboxMessage.subject}
                          </h2>

                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1a6fd4] font-bold flex items-center justify-center shrink-0">
                                {selectedInboxMessage.fromName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">
                                  {selectedInboxMessage.fromName}{" "}
                                  <span className="font-normal text-slate-500">&lt;{selectedInboxMessage.fromEmail}&gt;</span>
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  To: {selectedInboxMessage.toEmail}
                                </p>
                              </div>
                            </div>

                            <span className="text-slate-400 font-medium">
                              {selectedInboxMessage.date}
                            </span>
                          </div>
                        </div>

                        {/* Message Body Content */}
                        <div className="p-6 flex-1 overflow-y-auto bg-white">
                          <div 
                            className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: selectedInboxMessage.bodyHtml || selectedInboxMessage.preview }}
                          />
                        </div>

                        {/* Quick Reply Footer Bar */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Replying switches to Compose view with recipient pre-filled.
                          </span>
                          <button
                            onClick={() => handleReplyToMessage(selectedInboxMessage)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20 cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            Compose Reply
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <MailOpen className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs font-medium">Select an email message to view its contents</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Brevo Inbound Webhook Setup Guide                  */}
      {/* ========================================================= */}
      {inboundGuideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1a6fd4]" />
                <h3 className="font-bold text-sm text-[#0d1f4a]">Brevo Inbound Email Webhook Setup</h3>
              </div>
              <button
                onClick={() => setInboundGuideModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
              <p>
                To automatically receive recipient replies and incoming customer emails directly inside this dashboard:
              </p>

              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                <span className="font-bold text-[#0d1f4a] block uppercase text-[11px] tracking-wider">
                  Your Webhook Target Endpoint URL:
                </span>
                <code className="block p-2.5 bg-white border border-blue-200 rounded-lg font-mono text-[11px] text-[#1a6fd4] select-all break-all">
                  {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/webhooks/brevo-inbound
                </code>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-[#0d1f4a] text-sm">3 Quick Steps in Brevo &amp; Cloudflare:</h4>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    <strong>In Brevo:</strong> Go to <em>Settings &gt; Inbound Email &gt; Webhooks</em>. Click <em>Add Webhook</em> and paste the endpoint URL above.
                  </li>
                  <li>
                    <strong>In Cloudflare DNS:</strong> Add an <code>MX</code> record for your inbound subdomain (e.g., <code>reply.yourdomain.com</code>) pointing to Brevo’s inbound mail server (<code>inbound.brevo.com</code>) with Priority <code>10</code>.
                  </li>
                  <li>
                    <strong>In Compose View:</strong> Send emails with your <code>Reply-To</code> header set to your inbound domain (e.g. <code>reply@reply.yourdomain.com</code>). When recipients reply, they will appear in your Inbox!
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                <strong>Testing immediately?</strong> Click the <strong>Simulate Reply</strong> button on the Inbox toolbar to test the UI experience without waiting for DNS propagation.
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setInboundGuideModalOpen(false)}
                className="px-4 py-2 bg-[#0d1f4a] text-white text-xs font-bold rounded-lg hover:bg-[#091228] transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Full Screen Email Preview                          */}
      {/* ========================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#1a6fd4]" />
                <h3 className="font-bold text-sm text-[#0d1f4a]">Email Campaign Preview</h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Viewport switcher */}
                <div className="flex items-center p-1 bg-slate-200/70 rounded-lg mr-2">
                  <button
                    onClick={() => setPreviewViewport("desktop")}
                    className={`p-1 rounded text-xs transition-colors ${
                      previewViewport === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewViewport("mobile")}
                    className={`p-1 rounded text-xs transition-colors ${
                      previewViewport === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 flex items-center justify-center">
              <div className={`transition-all duration-300 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ${
                previewViewport === "desktop" ? "w-full max-w-[620px] h-[580px]" : "w-[375px] h-[580px] ring-8 ring-slate-800 rounded-[28px]"
              }`}>
                <iframe
                  title="Modal Email Preview"
                  srcDoc={modalPreviewHtml.includes("<html") ? modalPreviewHtml : `<div style="font-family: sans-serif; padding: 24px; color: #0d1f4a; line-height: 1.6;">${modalPreviewHtml}</div>`}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-xs text-slate-500 font-mono">Rendered cross-client compatible HTML</span>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-[#0d1f4a] text-white text-xs font-bold rounded-lg hover:bg-[#091228] transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
