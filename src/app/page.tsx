"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  templateList, 
  templates, 
  getTemplateById 
} from "@/templates";
import { TemplateType, SendEmailResult, CampaignRecipient } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { normalizeSubject } from "@/lib/brevo-realtime";
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
  ArrowLeft,
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
  FileSpreadsheet,
  UploadCloud,
  LogOut,
  MailCheck,
  MousePointerClick,
  AlertTriangle,
  Activity
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
import BulkEmailStudio from "@/components/bulk/BulkEmailStudio";

export interface CampaignRecord {
  id: string;
  subject: string;
  audience: string;
  status: "pending" | "sent" | "delivered" | "failed" | "opened" | "clicked" | "bounced";
  created_at: string;
  opens: number;
  clicks: number;
  content?: string;
  recipients?: CampaignRecipient[];
}

/**
 * Pure authentic recipient resolver (ZERO mock/demo data).
 */
function resolveCampaignRecipients(c: CampaignRecord, realtimeRecipients?: CampaignRecipient[]): CampaignRecipient[] {
  // 1. Direct array if already present from Brevo live telemetry or campaign dispatch
  if (Array.isArray(c.recipients) && c.recipients.length > 0) {
    return c.recipients;
  }

  // 2. Real-time recipients passed directly
  if (Array.isArray(realtimeRecipients) && realtimeRecipients.length > 0) {
    return realtimeRecipients;
  }

  // 3. Check localStorage cache for freshly dispatched campaigns
  if (typeof window !== "undefined" && c.id) {
    try {
      const cached = localStorage.getItem(`hexacore_campaign_recipients_${c.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Check for embedded metadata in content
  if (c.content) {
    const match = c.content.match(/<!-- HEXACORE_RECIPIENTS: ([\s\S]*?) -->/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  // 5. Individual email extraction from audience field
  const aud = (c.audience || "").toLowerCase();
  if (aud.includes("@")) {
    const emailMatch = c.audience.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      return [
        {
          email: emailMatch[0],
          name: emailMatch[0].split("@")[0].replace(/[._-]/g, " "),
          status: (c.status as any) || "delivered",
          deliveredAt: c.created_at,
          metadata: { Channel: "Verified User", Method: "Direct Dispatch" },
        },
      ];
    }
  }

  // 6. Check if email content contains a specific recipient email address
  if (c.content) {
    const emails = c.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    const cleanEmail = emails?.find(
      (e) => !e.includes("hexacore.ng") && !e.includes("example.com") && !e.includes("w3.org")
    );
    if (cleanEmail) {
      return [
        {
          email: cleanEmail,
          name: cleanEmail.split("@")[0].replace(/[._-]/g, " "),
          status: (c.status as any) || "delivered",
          deliveredAt: c.created_at,
          metadata: { Channel: "Dispatched Recipient" },
        },
      ];
    }
  }

  // Pure authentic data: return empty array if no real recipients are known yet.
  return [];
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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; company?: string } | null>(null);

  // Auth Guard: Listen to Supabase Auth state and sync currentUser
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Immediately hydrate from localStorage cache or session cookie
      const stored = typeof window !== "undefined" ? localStorage.getItem("hexacore_user") : null;
      let cachedUser: any = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.isLoggedIn || parsed.email)) {
            cachedUser = parsed;
            if (isMounted) {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            }
          }
        } catch {
          // ignore
        }
      }

      if (!cachedUser && typeof document !== "undefined" && document.cookie.includes("hexacore_session")) {
        cachedUser = {
          name: "Hexacore Demo Admin",
          email: "demo@hexacore.com",
          company: "Hexacore Labs",
          isLoggedIn: true,
        };
        if (isMounted) {
          setCurrentUser(cachedUser);
          setIsAuthenticated(true);
        }
      }

      try {
        // Fast timeout for Supabase getUser check
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: { user: null }, error: new Error("Auth timeout") }), 1200)
        );

        const { data, error } = await Promise.race([getUserPromise, timeoutPromise]);
        const user = data?.user;

        if (error || !user) {
          if (cachedUser) {
            // Already hydrated from local cache or session cookie
            return;
          }

          if (isMounted) {
            setIsAuthenticated(false);
            router.replace("/signin");
          }
          return;
        }

        const metadata = user.user_metadata || {};
        const fullName =
          metadata.full_name ||
          (metadata.first_name ? `${metadata.first_name} ${metadata.last_name || ""}`.trim() : null) ||
          user.email?.split("@")[0] ||
          "Hexacore User";

        const company = metadata.company || "Hexacore Community";

        const userObj = {
          name: fullName,
          email: user.email || "",
          company,
        };

        if (isMounted) {
          setCurrentUser(userObj);
          setIsAuthenticated(true);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("hexacore_user", JSON.stringify({ ...userObj, isLoggedIn: true }));
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace("/signin");
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      const isDemoSession =
        (typeof document !== "undefined" && document.cookie.includes("hexacore_session")) ||
        (typeof window !== "undefined" && Boolean(localStorage.getItem("hexacore_user")));

      if (event === "SIGNED_OUT") {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("hexacore_user");
          }
          if (typeof document !== "undefined") {
            document.cookie = "hexacore_session=; path=/; max-age=0";
          }
          router.replace("/signin");
        }
      } else if (!session) {
        if (!isDemoSession && isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          router.replace("/signin");
        }
      } else if (session?.user) {
        const user = session.user;
        const metadata = user.user_metadata || {};
        const fullName =
          metadata.full_name ||
          (metadata.first_name ? `${metadata.first_name} ${metadata.last_name || ""}`.trim() : null) ||
          user.email?.split("@")[0] ||
          "Hexacore User";

        const company = metadata.company || "Hexacore Community";

        const userObj = {
          name: fullName,
          email: user.email || "",
          company,
        };

        if (isMounted) {
          setCurrentUser(userObj);
          setIsAuthenticated(true);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("hexacore_user", JSON.stringify({ ...userObj, isLoggedIn: true }));
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out notice:", err);
    }
    document.cookie = "hexacore_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (typeof window !== "undefined") {
      localStorage.removeItem("hexacore_user");
    }
    router.push("/signin");
  };

  // Navigation: side menu controls active view ("compose" | "bulk" | "history" | "inbox")
  const [activeView, setActiveView] = useState<"compose" | "bulk" | "history" | "inbox">("compose");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Lock body scroll on mobile when side drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

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

  // Campaign Details & Recipients Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRecord | null>(null);
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState<boolean>(false);
  const [campaignModalTab, setCampaignModalTab] = useState<"recipients" | "preview">("recipients");
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedAllEmails, setCopiedAllEmails] = useState<boolean>(false);

  // Real-Time Telemetry State (Brevo Live Sync)
  const [realtimeData, setRealtimeData] = useState<any | null>(null);
  const [isSyncingRealtime, setIsSyncingRealtime] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Sync real-time events and performance telemetry from Brevo API
  const syncRealtimeData = async () => {
    setIsSyncingRealtime(true);
    try {
      const res = await fetch("/api/campaigns/realtime");
      const data = await res.json();
      if (data.success) {
        setRealtimeData(data);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        // Enrich existing campaigns with Brevo live statistics and real recipients
        setCampaigns((prev) =>
          prev.map((camp) => {
            const exact = data.campaignsBySubject[camp.subject];
            const match =
              exact ||
              Object.values(data.campaignsBySubject).find(
                (s: any) =>
                  normalizeSubject(s.subject) === normalizeSubject(camp.subject) ||
                  camp.subject.toLowerCase().includes(normalizeSubject(s.subject)) ||
                  s.subject.toLowerCase().includes(normalizeSubject(camp.subject))
              );

            if (match) {
              const m = match as any;
              return {
                ...camp,
                opens: m.opens,
                clicks: m.clicks,
                recipients: m.recipients && m.recipients.length > 0 ? m.recipients : camp.recipients,
                status: m.clicks > 0 ? "clicked" : m.opens > 0 ? "opened" : m.deliveredCount > 0 ? "delivered" : camp.status,
              };
            }
            return camp;
          })
        );
      }
    } catch (err) {
      console.warn("Real-time sync error:", err);
    } finally {
      setIsSyncingRealtime(false);
    }
  };

  const handleOpenCampaignDetails = (campaign: CampaignRecord) => {
    // Check if live Brevo telemetry has matching recipient events for this campaign
    let resolvedRecipients = campaign.recipients;
    let liveOpens = campaign.opens;
    let liveClicks = campaign.clicks;

    if (realtimeData?.campaignsBySubject) {
      const match: any =
        realtimeData.campaignsBySubject[campaign.subject] ||
        Object.values(realtimeData.campaignsBySubject).find(
          (s: any) =>
            normalizeSubject(s.subject) === normalizeSubject(campaign.subject) ||
            campaign.subject.toLowerCase().includes(normalizeSubject(s.subject)) ||
            s.subject.toLowerCase().includes(normalizeSubject(campaign.subject))
        );

      if (match) {
        if (match.recipients && match.recipients.length > 0) {
          resolvedRecipients = match.recipients;
        }
        liveOpens = match.opens;
        liveClicks = match.clicks;
      }
    }

    if (!resolvedRecipients || resolvedRecipients.length === 0) {
      resolvedRecipients = resolveCampaignRecipients(campaign);
    }

    setSelectedCampaign({
      ...campaign,
      opens: liveOpens,
      clicks: liveClicks,
      recipients: resolvedRecipients,
    });
    setCampaignModalTab("recipients");
    setRecipientSearchQuery("");
    setCampaignDetailsOpen(true);
  };

  // Inbox State
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [selectedInboxMessage, setSelectedInboxMessage] = useState<InboxMessage | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "starred">("all");
  const [inboxSearch, setInboxSearch] = useState<string>("");
  const [isRefreshingInbox, setIsRefreshingInbox] = useState<boolean>(false);

  // Fetch campaigns from Supabase backend on mount, then synchronize Brevo telemetry
  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.campaigns)) {
          const resolved = data.campaigns.map((c: any) => ({
            ...c,
            recipients: resolveCampaignRecipients(c),
          }));
          setCampaigns(resolved);
        }
      })
      .catch((err) => console.warn("Supabase fetch notice:", err))
      .finally(() => {
        syncRealtimeData();
      });
  }, []);

  // Sync real-time data whenever switching to history view
  useEffect(() => {
    if (activeView === "history") {
      syncRealtimeData();
    }
  }, [activeView]);

  // Fetch inbox messages
  const fetchInbox = async (silent = false) => {
    if (!silent) setIsRefreshingInbox(true);
    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setInboxMessages(data.messages);
        if (data.messages.length > 0) {
          setSelectedInboxMessage((prev) => {
            if (!prev) return data.messages[0];
            const found = data.messages.find((m: any) => m.id === prev.id);
            return found || data.messages[0];
          });
        }
      }
    } catch (err) {
      console.warn("Supabase inbox fetch notice:", err);
    } finally {
      if (!silent) setIsRefreshingInbox(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchInbox();
  }, []);

  // Auto-refresh when viewing the inbox (polls every 8 seconds)
  useEffect(() => {
    if (activeView === "inbox") {
      fetchInbox(true);
      const timer = setInterval(() => {
        fetchInbox(true);
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [activeView]);

  // Real-time Supabase push updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime-inbound-inbox")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbound_emails",
        },
        () => {
          fetchInbox(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
  const handleSimulateInboundReply = async () => {
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

    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testMsg),
      });
    } catch (err) {
      console.warn("Failed to persist simulated reply:", err);
    }
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
        const recipientList: CampaignRecipient[] = [
          {
            email: recipient,
            name: recipientDisplayName,
            status: (data.mode === "live" ? "delivered" : "sent") as "delivered" | "sent",
            deliveredAt: formattedDate,
            metadata: { Audience: audienceLabelMap[audience] || audience },
          },
        ];

        const newRecord: CampaignRecord = {
          id: `camp-${Date.now()}`,
          subject: subject,
          audience: audience === "individual" ? `Individual:${individualEmail}` : audienceLabelMap[audience] || audience,
          status: data.mode === "live" ? "delivered" : "sent",
          created_at: formattedDate,
          opens: 0,
          clicks: 0,
          content: messageContent,
          recipients: recipientList,
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `hexacore_campaign_recipients_${newRecord.id}`,
              JSON.stringify(recipientList)
            );
          } catch {
            // ignore
          }
        }

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
  const renderStatusBadge = (status: CampaignRecord["status"] | string) => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          PENDING
        </span>
      );
    }
    if (status === "clicked") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
          <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
          CLICKED
        </span>
      );
    }
    if (status === "opened") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-50 text-[#00c8e8] border border-cyan-200 shadow-2xs">
          <Eye className="w-3.5 h-3.5 text-[#00c8e8]" />
          OPENED
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          DELIVERED
        </span>
      );
    }
    if (status === "bounced") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          BOUNCED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
        FAILED
      </span>
    );
  };

  // Real-time Brevo Stats computation
  const totalCampaignsCount = campaigns.length;
  const totalOpensCount = realtimeData?.globalStats?.totalOpens ?? campaigns.reduce((acc, curr) => acc + (curr.opens || 0), 0);
  const totalClicksCount = realtimeData?.globalStats?.totalClicks ?? campaigns.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1a6fd4] animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Loading Hexacore Email Studio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b] antialiased font-sans">
      
      {/* ========================================================= */}
      {/* SIDEBAR: Hexacore Logo & (SEND CAMPAIGN + HISTORY)        */}
      {/* ========================================================= */}
      <aside 
        className={`fixed md:sticky top-0 left-0 z-50 h-[100dvh] bg-white border-r border-[#e2e8f0] flex flex-col py-6 transition-all duration-300 ease-in-out shrink-0 md:relative ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${isSidebarCollapsed ? "w-20" : "w-64 lg:w-72 max-w-[85vw]"}`}
      >
        {/* Edge Collapse Trigger (shadcn component mounted on the sidebar border edge) */}
        <SidebarEdgeTrigger
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          title="Close Navigation"
          aria-label="Close Navigation"
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

          {/* 1b. BULK DISPATCH (CSV) */}
          <button
            onClick={() => {
              setActiveView("bulk");
              setIsMobileMenuOpen(false);
            }}
            title="BULK EMAIL (CSV)"
            className={`w-full flex items-center ${
              isSidebarCollapsed ? "justify-center px-2 py-3.5" : "gap-3 px-4 py-3.5"
            } rounded-2xl transition-all font-bold text-xs uppercase tracking-widest text-left cursor-pointer ${
              activeView === "bulk"
                ? "bg-[#0d1f4a] text-white shadow-lg shadow-[#0d1f4a]/25 border border-[#1a6fd4]/30"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-[#1a6fd4]"
            }`}
          >
            <FileSpreadsheet 
              className={`w-5 h-5 shrink-0 ${activeView === "bulk" ? "text-[#00c8e8]" : "text-slate-400"}`} 
              strokeWidth={activeView === "bulk" ? 2.5 : 2} 
            />
            {!isSidebarCollapsed && <span className="truncate">BULK EMAIL</span>}
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
        <header className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3.5 flex justify-between items-center sticky top-0 z-30 shadow-xs relative">
          
          {/* Left: Mobile hamburger & Search Bar */}
          <div className="flex items-center gap-2 sm:gap-4 relative z-10">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 sm:pl-9 pr-2.5 sm:pr-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-100/90 focus:bg-white rounded-lg sm:rounded-md outline-none focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] transition-all text-xs sm:text-sm w-32 xs:w-48 sm:w-64 focus:w-40 xs:focus:w-56 sm:focus:w-64 border border-transparent"
              />
            </div>
          </div>

          {/* Centered Header Tagline */}
          <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none px-6">
            <span className="text-base xl:text-lg font-bold text-[#0d1f4a] tracking-tight text-center pointer-events-auto">
              The #1 composable Open Finance Platform
            </span>
          </div>

          {/* Right: User Profile & Sign Out Action */}
          <div className="flex items-center gap-2 sm:gap-3 relative z-10 shrink-0">
            {currentUser && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-lg bg-[#0d1f4a] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser.name?.[0] || "U"}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#0d1f4a] leading-none truncate max-w-[130px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none truncate max-w-[130px] mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <div 
                  className="sm:hidden w-7 h-7 rounded-lg bg-[#0d1f4a] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0" 
                  title={`${currentUser.name} (${currentUser.email})`}
                >
                  {currentUser.name?.[0] || "U"}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 active:scale-95 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[36px]"
              title="Sign Out of Email Studio"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* SUBHEADER BAR (Hexacore Blue/Cyan Soft Tint) */}
        <div className="bg-[#f8fafc] px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex justify-between items-center border-b border-[#e2e8f0]">
          <h2 className="text-[#1a6fd4] font-semibold text-xs sm:text-base">
            {activeView === "compose" 
              ? "Emailing" 
              : activeView === "bulk"
              ? "Bulk Emailing & CSV Dispatch"
              : activeView === "history" 
              ? "Campaign History" 
              : "Inbox & Inbound Messages"}
          </h2>
        </div>

        {/* MAIN BODY CONTAINER */}
        <main className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          
          {/* ========================================================= */}
          {/* VIEW 1: SEND CAMPAIGN                                     */}
          {/* ========================================================= */}
          {activeView === "compose" && (
            <div className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
              
              {/* Card Header */}
              <div className="p-4 sm:p-7 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight">
                    Email Campaigns
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Send promotional bulk emails and view responses.
                  </p>
                </div>
                
                {/* Secondary link to history */}
                <button
                  onClick={() => setActiveView("history")}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-[#1a6fd4] hover:text-[#155cb4] transition-colors"
                >
                  <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">View History</span> ({campaigns.length})
                </button>
              </div>

              {/* Form Content */}
              <div className="p-4 sm:p-8">
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
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Upload CSV List (Bulk Email)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CONDITIONAL FIELD: CSV Bulk Helper */}
                  {audience === "csv" && (
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-950">Bulk Email Mode Selected</p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Upload CSV files, map dynamic variables, and send high-speed batches in the Bulk Studio.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveView("bulk")}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                      >
                        <span>Open Bulk Studio</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

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
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setModalPreviewHtml(messageContent);
                          setPreviewModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 hover:border-blue-200 text-slate-700 hover:text-[#1a6fd4] text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#1a6fd4]" />
                        <span>Preview Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyHtml}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
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
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 active:scale-95 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#1a6fd4]/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-center"
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
          {/* VIEW 1b: BULK DISPATCH (CSV)                              */}
          {/* ========================================================= */}
          {activeView === "bulk" && (
            <BulkEmailStudio
              onCampaignSent={(newCamp) => {
                setCampaigns((prev) => [newCamp, ...prev]);
              }}
              onViewChange={(v) => setActiveView(v)}
              onOpenPreview={(html) => {
                setModalPreviewHtml(html);
                setPreviewModalOpen(true);
              }}
            />
          )}

          {/* ========================================================= */}
          {/* VIEW 2: HISTORY & RESPONSES                               */}
          {/* ========================================================= */}
          {activeView === "history" && (
            <div className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
              
              {/* Header */}
              <div className="p-4 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0d1f4a] tracking-tight">
                    Email Campaigns
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Send promotional bulk emails and view responses.
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={syncRealtimeData}
                    disabled={isSyncingRealtime}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                    title="Refresh latest email statistics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#1a6fd4] ${isSyncingRealtime ? "animate-spin" : ""}`} />
                    <span>{isSyncingRealtime ? "Refreshing..." : "Refresh"}</span>
                    {lastSyncedAt && <span className="text-[10px] text-slate-400 font-normal hidden lg:inline">({lastSyncedAt})</span>}
                  </button>

                  <button
                    onClick={() => setActiveView("compose")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20 cursor-pointer text-center"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>New Campaign</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                
                {/* 3 QUICK STATS CARDS (Hexacore Blue / Cyan Palettes) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  
                  {/* Card 1: Total Campaigns */}
                  <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a6fd4] shrink-0">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#1a6fd4]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                        CAMPAIGNS
                      </p>
                      <p className="text-base xs:text-xl sm:text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalCampaignsCount}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Total Opens */}
                  <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#00c8e8] shrink-0">
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#00c8e8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                        OPENS
                      </p>
                      <p className="text-base xs:text-xl sm:text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalOpensCount}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Total Clicks */}
                  <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-[#f8fafc] flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a6fd4] shrink-0">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#1a6fd4]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                        CLICKS
                      </p>
                      <p className="text-base xs:text-xl sm:text-2xl font-black text-[#0d1f4a] mt-0.5">
                        {totalClicksCount}
                      </p>
                    </div>
                  </div>

                </div>

                {/* MOBILE VIEW: Campaign Cards (md:hidden) */}
                <div className="md:hidden space-y-3">
                  {campaigns.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-slate-200">
                      No email campaigns found in history.
                    </div>
                  ) : (
                    campaigns.map((campaign) => {
                      const resolvedRecipients = resolveCampaignRecipients(campaign);
                      const recipientCount = resolvedRecipients.length;

                      return (
                        <div
                          key={`mobile-${campaign.id}`}
                          onClick={() => handleOpenCampaignDetails(campaign)}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#1a6fd4]/40 active:bg-slate-50/80 transition-all shadow-2xs space-y-3 cursor-pointer"
                        >
                          {/* Top Row: Subject & Delete Button */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-[#0d1f4a] text-sm leading-snug line-clamp-2">
                              {campaign.subject}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(campaign.id);
                              }}
                              title="Delete campaign"
                              aria-label="Delete campaign"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 rounded-lg transition-all cursor-pointer shrink-0 -mt-1 -mr-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Subline: Status + Date */}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                            {renderStatusBadge(campaign.status)}
                            <span className="text-slate-400 font-medium">
                              {campaign.created_at}
                            </span>
                            <span>•</span>
                            <span className="font-medium truncate max-w-[130px] xs:max-w-[200px]">
                              {campaign.audience}
                            </span>
                          </div>

                          {/* Mini Stat Summary Box */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 text-center">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Recipients</p>
                              <p className="text-xs font-black text-slate-800 mt-0.5">{recipientCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Opens</p>
                              <p className="text-xs font-black text-[#00c8e8] mt-0.5">{campaign.opens || 0}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Clicks</p>
                              <p className="text-xs font-black text-[#1a6fd4] mt-0.5">{campaign.clicks || 0}</p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenCampaignDetails(campaign)}
                            className="w-full py-2.5 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#1a6fd4] font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200/80 transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>View Campaign Details ({recipientCount})</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* DESKTOP VIEW: TABLE OF CAMPAIGNS (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
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
                        campaigns.map((campaign) => {
                          const resolvedRecipients = resolveCampaignRecipients(campaign);
                          const recipientCount = resolvedRecipients.length;

                          return (
                          <tr 
                            key={campaign.id} 
                            onClick={() => handleOpenCampaignDetails(campaign)}
                            className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                          >
                            
                            {/* Campaign Subject & Date */}
                            <td className="py-4 px-6">
                              <div className="font-bold text-[#0d1f4a] text-sm group-hover:text-[#1a6fd4] transition-colors line-clamp-1 flex items-center gap-2">
                                <span>{campaign.subject}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                <span>{campaign.created_at}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-[#1a6fd4] bg-blue-50/80 px-2 py-0.5 rounded-md text-[11px] border border-blue-100">
                                  <Users className="w-3 h-3" />
                                  <span>{recipientCount} recipient{recipientCount === 1 ? "" : "s"}</span>
                                </span>
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

                            {/* Actions: View Details + Delete */}
                            <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCampaignDetails(campaign)}
                                  title="View campaign recipients and details"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-[#1a6fd4] text-slate-600 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                >
                                  <Users className="w-3.5 h-3.5 text-[#1a6fd4]" />
                                  <span className="hidden sm:inline">Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCampaign(campaign.id)}
                                  title="Delete campaign"
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );})
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
              <div className="p-4 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Incoming recipient replies
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Inbound</span>
                  </div>

                  {/* Simulate Reply button commented out
                  <button
                    onClick={handleSimulateInboundReply}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Simulate Reply</span>
                  </button>
                  */}

                  <button
                    onClick={() => fetchInbox(false)}
                    disabled={isRefreshingInbox}
                    title="Refresh Inbox"
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInbox ? "animate-spin text-[#1a6fd4]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setInboxFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      inboxFilter === "all"
                        ? "bg-[#0d1f4a] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    All ({inboxMessages.length})
                  </button>

                  <button
                    onClick={() => setInboxFilter("unread")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
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
                <div className="relative w-full sm:w-auto">
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
                  {/* Send Test Reply to Inbox commented out
                  {!inboxSearch && (
                    <button
                      onClick={handleSimulateInboundReply}
                      className="mt-5 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Send Test Reply to Inbox
                    </button>
                  )}
                  */}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
                  
                  {/* Left Column: Message List (5 cols on lg, hidden on mobile if message selected) */}
                  <div className={`${selectedInboxMessage ? "hidden lg:block" : "block"} lg:col-span-5 border-r border-slate-100 overflow-y-auto max-h-[680px] divide-y divide-slate-100`}>
                    {filteredInboxMessages.map((msg) => {
                      const isSelected = selectedInboxMessage?.id === msg.id;
                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleSelectInboxMessage(msg)}
                          className={`p-3.5 sm:p-4 cursor-pointer transition-colors relative flex items-start gap-3 ${
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

                  {/* Right Column: Message Reader (7 cols on lg, shown on mobile only if message selected) */}
                  <div className={`${selectedInboxMessage ? "flex" : "hidden lg:flex"} lg:col-span-7 flex-col bg-[#fdfdfd]`}>
                    {selectedInboxMessage ? (
                      <div className="flex-1 flex flex-col">
                        
                        {/* Message Reader Action Header */}
                        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {/* Mobile Back Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedInboxMessage(null)}
                              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#1a6fd4] text-xs font-bold transition-all cursor-pointer mr-1"
                              title="Back to inbox messages"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Inbox</span>
                            </button>

                            <button
                              onClick={() => handleReplyToMessage(selectedInboxMessage)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1f4a] hover:bg-[#1a6fd4] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              <span>Reply</span>
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
                        <div className="p-4 sm:p-6 bg-white border-b border-slate-100">
                          <h2 className="text-base sm:text-lg font-bold text-[#0d1f4a] mb-2 sm:mb-3">
                            {selectedInboxMessage.subject}
                          </h2>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1a6fd4] font-bold flex items-center justify-center shrink-0">
                                {selectedInboxMessage.fromName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">
                                  {selectedInboxMessage.fromName}{" "}
                                  <span className="font-normal text-slate-500 font-mono text-[11px]">&lt;{selectedInboxMessage.fromEmail}&gt;</span>
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  To: {selectedInboxMessage.toEmail}
                                </p>
                              </div>
                            </div>

                            <span className="text-slate-400 font-medium text-[11px] sm:text-xs">
                              {selectedInboxMessage.date}
                            </span>
                          </div>
                        </div>

                        {/* Message Body Content */}
                        <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto overflow-x-auto bg-white">
                          <div 
                            className="prose prose-sm max-w-none text-slate-800 leading-relaxed text-xs sm:text-sm break-words [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: selectedInboxMessage.bodyHtml || selectedInboxMessage.preview }}
                          />
                        </div>

                        {/* Quick Reply Footer Bar */}
                        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <span className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
                            Replying switches to Compose view with recipient pre-filled.
                          </span>
                          <button
                            onClick={() => handleReplyToMessage(selectedInboxMessage)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00c8e8] to-[#1a6fd4] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1a6fd4]/20 cursor-pointer text-center"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Compose Reply</span>
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
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb Navigation)          */}
      {/* ========================================================= */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => setActiveView("compose")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            activeView === "compose"
              ? "text-[#1a6fd4] font-bold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeView === "compose" ? "bg-blue-50 text-[#1a6fd4]" : ""}`}>
            <Mail className="w-5 h-5" strokeWidth={activeView === "compose" ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Compose</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("bulk")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            activeView === "bulk"
              ? "text-[#1a6fd4] font-bold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeView === "bulk" ? "bg-blue-50 text-[#1a6fd4]" : ""}`}>
            <FileSpreadsheet className="w-5 h-5" strokeWidth={activeView === "bulk" ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Bulk CSV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("inbox")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] relative ${
            activeView === "inbox"
              ? "text-[#1a6fd4] font-bold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors relative ${activeView === "inbox" ? "bg-blue-50 text-[#1a6fd4]" : ""}`}>
            <Inbox className="w-5 h-5" strokeWidth={activeView === "inbox" ? 2.5 : 2} />
            {unreadInboxCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-[#00c8e8] text-[#0d1f4a] leading-none shadow-xs">
                {unreadInboxCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Inbox</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("history")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            activeView === "history"
              ? "text-[#1a6fd4] font-bold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeView === "history" ? "bg-blue-50 text-[#1a6fd4]" : ""}`}>
            <History className="w-5 h-5" strokeWidth={activeView === "history" ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">History</span>
        </button>
      </nav>



      {/* ========================================================= */}
      {/* MODAL: Full Screen Email Preview                          */}
      {/* ========================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-[#1a6fd4] shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-[#0d1f4a] truncate">
                  <span className="xs:hidden">Preview</span>
                  <span className="hidden xs:inline">Email Campaign Preview</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Viewport switcher */}
                <div className="flex items-center p-1 bg-slate-200/70 rounded-lg mr-1 sm:mr-2">
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
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2.5 sm:p-6 overflow-y-auto bg-slate-100 flex items-center justify-center">
              <div className={`transition-all duration-300 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ${
                previewViewport === "desktop" ? "w-full max-w-[620px] h-[360px] xs:h-[460px] sm:h-[580px]" : "w-full max-w-[375px] h-[360px] xs:h-[460px] sm:h-[580px] ring-2 sm:ring-8 ring-slate-800 rounded-xl sm:rounded-[28px]"
              }`}>
                <iframe
                  title="Modal Email Preview"
                  srcDoc={modalPreviewHtml.includes("<html") ? modalPreviewHtml : `<div style="font-family: sans-serif; padding: 24px; color: #0d1f4a; line-height: 1.6;">${modalPreviewHtml}</div>`}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-[11px] sm:text-xs text-slate-500 font-mono">Cross-client HTML</span>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 sm:py-2 bg-[#0d1f4a] text-white text-xs font-bold rounded-lg hover:bg-[#091228] transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Campaign Details & Recipients View                 */}
      {/* ========================================================= */}
      {campaignDetailsOpen && selectedCampaign && (() => {
        const recipientsList = resolveCampaignRecipients(selectedCampaign);
        const filteredRecipients = recipientsList.filter((r) => {
          if (!recipientSearchQuery.trim()) return true;
          const q = recipientSearchQuery.toLowerCase();
          return (
            r.email.toLowerCase().includes(q) ||
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.metadata && Object.values(r.metadata).some((v) => String(v).toLowerCase().includes(q)))
          );
        });

        const handleCopyAllEmails = () => {
          const allEmails = recipientsList.map((r) => r.email).join(", ");
          navigator.clipboard.writeText(allEmails);
          setCopiedAllEmails(true);
          setTimeout(() => setCopiedAllEmails(false), 2000);
        };

        const handleCopySingleEmail = (email: string) => {
          navigator.clipboard.writeText(email);
          setCopiedEmail(email);
          setTimeout(() => setCopiedEmail(null), 2000);
        };

        // Clean HTML without internal metadata comment
        const cleanPreviewHtml = selectedCampaign.content
          ? selectedCampaign.content.replace(/<!-- HEXACORE_RECIPIENTS: [\s\S]*? -->\n?/, "")
          : "<div style='padding:24px; font-family:sans-serif;'>No email HTML content saved for this campaign.</div>";

        const renderRecipientStatusBadge = (rec: CampaignRecipient) => {
          if (rec.status === "clicked") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                <MousePointerClick className="w-3 h-3 text-indigo-600" />
                <span>Clicked {rec.clicksCount ? `(${rec.clicksCount}x)` : ""}</span>
              </span>
            );
          }
          if (rec.status === "opened") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-[#00c8e8] border border-cyan-200 shadow-2xs">
                <Eye className="w-3 h-3 text-[#00c8e8]" />
                <span>Opened {rec.opensCount ? `(${rec.opensCount}x)` : ""}</span>
              </span>
            );
          }
          if (rec.status === "bounced") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Bounced</span>
              </span>
            );
          }
          if (rec.status === "delivered") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Delivered</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1a6fd4] border border-blue-200">
              <Send className="w-3 h-3 text-[#1a6fd4]" />
              <span>Sent</span>
            </span>
          );
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
              
              {/* MODAL HEADER */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-blue-100/70 text-[#1a6fd4]">
                      <MailCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Campaign Details</span>
                    </span>
                    {renderStatusBadge(selectedCampaign.status)}
                    <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                      {selectedCampaign.created_at}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-xl text-[#0d1f4a] tracking-tight leading-snug break-words">
                    {selectedCampaign.subject}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-700">Audience:</span>
                    <span className="truncate">{selectedCampaign.audience}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCampaignDetailsOpen(false)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
                  title="Close Details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4 SUMMARY STAT CARDS */}
              {(() => {
                const deliveredCount = recipientsList.filter((r) => r.status !== "bounced" && r.status !== "failed").length;
                const calculatedDeliveryRate = recipientsList.length > 0 ? Math.round((deliveredCount / recipientsList.length) * 100) : 100;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-6 bg-white border-b border-slate-100 shrink-0">
                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-50/60 border border-blue-100/80">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5 text-[#1a6fd4]" />
                        <span>Recipients</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-black text-[#0d1f4a] mt-0.5 sm:mt-1">
                        {recipientsList.length}
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivery</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-black text-emerald-900 mt-0.5 sm:mt-1">
                        {calculatedDeliveryRate}%
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-cyan-50/60 border border-cyan-100/80">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Eye className="w-3.5 h-3.5 text-[#00c8e8]" />
                        <span>Opens</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-black text-[#0d1f4a] mt-0.5 sm:mt-1">
                        {selectedCampaign.opens || 0}
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Clicks</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-black text-[#0d1f4a] mt-0.5 sm:mt-1">
                        {selectedCampaign.clicks || 0}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* TABS NAVIGATION */}
              <div className="px-3 sm:px-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 -mb-px">
                  <button
                    type="button"
                    onClick={() => setCampaignModalTab("recipients")}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      campaignModalTab === "recipients"
                        ? "border-[#1a6fd4] text-[#1a6fd4] bg-white rounded-t-xl shadow-2xs"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span><span className="sm:hidden">Recipients</span><span className="hidden sm:inline">Users Sent To</span> ({recipientsList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCampaignModalTab("preview")}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      campaignModalTab === "preview"
                        ? "border-[#1a6fd4] text-[#1a6fd4] bg-white rounded-t-xl shadow-2xs"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span><span className="sm:hidden">Preview</span><span className="hidden sm:inline">Email Content Preview</span></span>
                  </button>
                </div>

                {campaignModalTab === "preview" && (
                  <div className="flex items-center p-0.5 sm:p-1 bg-slate-200/70 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={`p-1 rounded text-xs transition-colors ${
                        previewViewport === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      title="Desktop view"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={`p-1 rounded text-xs transition-colors ${
                        previewViewport === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* TAB CONTENT */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/40">
                {campaignModalTab === "recipients" ? (
                  <div className="space-y-3 sm:space-y-4">
                    
                    {/* SEARCH & COPY TOOLBAR */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search recipients by name, email, or metadata..."
                          value={recipientSearchQuery}
                          onChange={(e) => setRecipientSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyAllEmails}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        {copiedAllEmails ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied All Emails!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy All ({recipientsList.length}) Emails</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* MOBILE RECIPIENTS CARDS (sm:hidden) */}
                    <div className="sm:hidden space-y-2.5">
                      {filteredRecipients.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                          {recipientSearchQuery.trim() ? (
                            <span>No recipients match &quot;{recipientSearchQuery}&quot;.</span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-4">
                              <Activity className="w-7 h-7 text-slate-300 animate-pulse" />
                              <p className="font-semibold text-slate-700 text-xs">No recipient events recorded yet</p>
                              <p className="text-[11px] text-slate-400 max-w-xs">
                                Delivery, open, and click events will appear here in real time as recipients interact with this campaign.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        filteredRecipients.map((rec, idx) => {
                          const initials = rec.name
                            ? rec.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                            : rec.email.substring(0, 2).toUpperCase();

                          return (
                            <div
                              key={`mobile-rec-${rec.email}-${idx}`}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                            >
                              {/* Row 1: Avatar, Name, Email, Copy & Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0d1f4a] to-[#1a6fd4] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 text-xs truncate">
                                      {rec.name || "Recipient User"}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-slate-500 font-mono text-[11px] truncate flex-1 min-w-0">
                                        {rec.email}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopySingleEmail(rec.email)}
                                        title="Copy email address"
                                        className="text-slate-400 hover:text-[#1a6fd4] transition-colors p-0.5 cursor-pointer shrink-0"
                                      >
                                        {copiedEmail === rec.email ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {renderRecipientStatusBadge(rec)}
                                </div>
                              </div>

                              {/* Row 2: Timestamp */}
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-100 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{rec.deliveredAt || selectedCampaign.created_at || "Just now"}</span>
                              </div>

                              {/* Row 3: Metadata attributes (if any) */}
                              {rec.metadata && Object.keys(rec.metadata).length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  {Object.entries(rec.metadata).map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200/60"
                                    >
                                      <strong className="mr-1 text-slate-500">{k}:</strong> {String(v)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* DESKTOP RECIPIENTS TABLE (hidden sm:block) */}
                    <div className="hidden sm:block border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="py-3 px-4">RECIPIENT USER</th>
                              <th className="py-3 px-4">STATUS</th>
                              <th className="py-3 px-4">TIMESTAMP</th>
                              <th className="py-3 px-4">ATTRIBUTES / METADATA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRecipients.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400">
                                  {recipientSearchQuery.trim() ? (
                                    <span>No recipients match your search &quot;{recipientSearchQuery}&quot;.</span>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                                      <Activity className="w-7 h-7 text-slate-300 animate-pulse" />
                                      <p className="font-semibold text-slate-700 text-sm">No recipient events recorded yet</p>
                                      <p className="text-xs text-slate-400 max-w-sm">
                                        Delivery, open, and click events will appear here in real time as recipients interact with this campaign.
                                      </p>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ) : (
                              filteredRecipients.map((rec, idx) => {
                                const initials = rec.name
                                  ? rec.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                                  : rec.email.substring(0, 2).toUpperCase();

                                return (
                                  <tr key={`${rec.email}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                    {/* User Name & Email */}
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0d1f4a] to-[#1a6fd4] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                          {initials}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900 leading-tight">
                                            {rec.name || "Recipient User"}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-slate-500 font-mono text-[11px]">
                                              {rec.email}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopySingleEmail(rec.email)}
                                              title="Copy email address"
                                              className="text-slate-400 hover:text-[#1a6fd4] transition-colors p-0.5 cursor-pointer"
                                            >
                                              {copiedEmail === rec.email ? (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      {renderRecipientStatusBadge(rec)}
                                    </td>

                                    {/* Timestamp */}
                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                                      {rec.deliveredAt || selectedCampaign.created_at || "Just now"}
                                    </td>

                                    {/* Metadata / Tags */}
                                    <td className="py-3.5 px-4">
                                      {rec.metadata && Object.keys(rec.metadata).length > 0 ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {Object.entries(rec.metadata).map(([k, v]) => (
                                            <span
                                              key={k}
                                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200/60"
                                            >
                                              <strong className="mr-1 text-slate-500">{k}:</strong> {String(v)}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-xs font-mono">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: EMAIL PREVIEW */
                  <div className="flex flex-col items-center justify-center p-1 sm:p-2">
                    <div
                      className={`transition-all duration-300 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden ${
                        previewViewport === "desktop"
                          ? "w-full max-w-[660px] h-[360px] xs:h-[460px] sm:h-[580px]"
                          : "w-full max-w-[375px] h-[360px] xs:h-[460px] sm:h-[580px] ring-4 sm:ring-8 ring-slate-800 rounded-2xl sm:rounded-[32px]"
                      }`}
                    >
                      <iframe
                        title="Modal Campaign Details Email Preview"
                        srcDoc={cleanPreviewHtml.includes("<html") ? cleanPreviewHtml : `<div style="font-family: sans-serif; padding: 24px; color: #0d1f4a; line-height: 1.6;">${cleanPreviewHtml}</div>`}
                        className="w-full h-full border-none bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white shrink-0 gap-3">
                <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                  Showing {filteredRecipients.length} of {recipientsList.length} recipient user{recipientsList.length === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignDetailsOpen(false);
                      setSubject(`Follow-up: ${selectedCampaign.subject}`);
                      if (selectedCampaign.content) {
                        setMessageContent(cleanPreviewHtml);
                      }
                      setActiveView("compose");
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer text-center"
                  >
                    Resend / Follow-Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignDetailsOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#0d1f4a] hover:bg-[#152a62] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0d1f4a]/20 cursor-pointer text-center"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
