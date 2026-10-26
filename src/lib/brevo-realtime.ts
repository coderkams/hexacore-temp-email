import { getBrevoConfig } from "./brevo";
import { CampaignRecipient } from "./types";

export interface BrevoRawEvent {
  email: string;
  date: string;
  messageId: string;
  event: "delivered" | "opened" | "clicks" | "softBounces" | "hardBounces" | "requests" | "unsubscribed" | "complaint" | string;
  subject?: string;
  from?: string;
  reason?: string;
  ip?: string;
  link?: string;
}

export interface BrevoDailyReport {
  date: string;
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  spamReports: number;
  blocked: number;
  invalid: number;
  unsubscribed: number;
  deferred: number;
}

export interface RealtimeCampaignStats {
  subject: string;
  opens: number;
  clicks: number;
  deliveredCount: number;
  bouncedCount: number;
  totalRecipients: number;
  deliveryRate: number;
  recipients: CampaignRecipient[];
  lastEventAt?: string;
}

export interface BrevoRealtimePayload {
  success: boolean;
  globalStats: {
    totalOpens: number;
    totalClicks: number;
    totalDelivered: number;
    totalRequests: number;
    deliveryRate: number;
  };
  campaignsBySubject: Record<string, RealtimeCampaignStats>;
  recentEvents: BrevoRawEvent[];
  fetchedAt: string;
  error?: string;
}

/**
 * Normalizes subject string for consistent matching across Brevo and DB records.
 */
export function normalizeSubject(s?: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, "") // remove brackets like [Security Alert]
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetches real-time email events and delivery reports directly from Brevo's live SMTP API.
 */
export async function fetchBrevoRealtimeData(): Promise<BrevoRealtimePayload> {
  const config = getBrevoConfig();
  const apiKey = config.apiKey?.trim();

  if (!apiKey || apiKey === "your_brevo_api_key_here" || apiKey.startsWith("test_")) {
    return {
      success: false,
      globalStats: {
        totalOpens: 0,
        totalClicks: 0,
        totalDelivered: 0,
        totalRequests: 0,
        deliveryRate: 100,
      },
      campaignsBySubject: {},
      recentEvents: [],
      fetchedAt: new Date().toISOString(),
      error: "Valid BREVO_API_KEY is required to fetch real-time analytics.",
    };
  }

  try {
    // 1. Fetch raw events (up to 100 recent live events)
    const eventsPromise = fetch(
      "https://api.brevo.com/v3/smtp/statistics/events?limit=100&sort=desc",
      {
        headers: {
          "api-key": apiKey,
          accept: "application/json",
        },
        cache: "no-store",
      }
    ).then(async (r) => (r.ok ? ((await r.json()) as { events: BrevoRawEvent[] }) : { events: [] }));

    // 2. Fetch aggregated reports (30 days)
    const reportsPromise = fetch(
      "https://api.brevo.com/v3/smtp/statistics/reports?limit=30",
      {
        headers: {
          "api-key": apiKey,
          accept: "application/json",
        },
        cache: "no-store",
      }
    ).then(async (r) => (r.ok ? ((await r.json()) as { reports: BrevoDailyReport[] }) : { reports: [] }));

    const [eventsRes, reportsRes] = await Promise.all([eventsPromise, reportsPromise]);

    const events: BrevoRawEvent[] = eventsRes.events || [];
    const reports: BrevoDailyReport[] = reportsRes.reports || [];

    // Calculate global stats from reports (or fallback to event aggregation)
    let totalOpens = 0;
    let totalClicks = 0;
    let totalDelivered = 0;
    let totalRequests = 0;

    if (reports.length > 0) {
      for (const rep of reports) {
        totalOpens += rep.opens || 0;
        totalClicks += rep.clicks || 0;
        totalDelivered += rep.delivered || 0;
        totalRequests += rep.requests || 0;
      }
    } else {
      for (const ev of events) {
        if (ev.event === "opened") totalOpens++;
        if (ev.event === "clicks") totalClicks++;
        if (ev.event === "delivered") totalDelivered++;
        if (ev.event === "requests") totalRequests++;
      }
    }

    const deliveryRate = totalRequests > 0 ? Math.round((totalDelivered / totalRequests) * 100) : 100;

    // Group events by campaign subject
    const subjectEventsMap: Record<string, BrevoRawEvent[]> = {};

    for (const ev of events) {
      const subj = ev.subject || "Hexacore Notification";
      if (!subjectEventsMap[subj]) {
        subjectEventsMap[subj] = [];
      }
      subjectEventsMap[subj].push(ev);
    }

    // Build real-time campaign stats for each subject
    const campaignsBySubject: Record<string, RealtimeCampaignStats> = {};

    for (const [subj, evList] of Object.entries(subjectEventsMap)) {
      // Group events by recipient email
      const recipientMap: Record<
        string,
        {
          email: string;
          events: BrevoRawEvent[];
          opensCount: number;
          clicksCount: number;
          delivered: boolean;
          bounced: boolean;
          bounceReason?: string;
          latestDate: string;
          linksClicked: string[];
          ip?: string;
        }
      > = {};

      let campaignOpens = 0;
      let campaignClicks = 0;

      for (const ev of evList) {
        const emailLower = ev.email.toLowerCase();
        if (!recipientMap[emailLower]) {
          recipientMap[emailLower] = {
            email: ev.email,
            events: [],
            opensCount: 0,
            clicksCount: 0,
            delivered: false,
            bounced: false,
            latestDate: ev.date,
            linksClicked: [],
            ip: ev.ip,
          };
        }

        const rEntry = recipientMap[emailLower];
        rEntry.events.push(ev);

        if (ev.event === "opened") {
          rEntry.opensCount++;
          campaignOpens++;
        } else if (ev.event === "clicks") {
          rEntry.clicksCount++;
          campaignClicks++;
          if (ev.link && !rEntry.linksClicked.includes(ev.link)) {
            rEntry.linksClicked.push(ev.link);
          }
        } else if (ev.event === "delivered") {
          rEntry.delivered = true;
        } else if (ev.event === "softBounces" || ev.event === "hardBounces") {
          rEntry.bounced = true;
          rEntry.bounceReason = ev.reason || "Mailbox unavailable";
        }

        if (new Date(ev.date) > new Date(rEntry.latestDate)) {
          rEntry.latestDate = ev.date;
          if (ev.ip) rEntry.ip = ev.ip;
        }
      }

      // Convert recipient map into CampaignRecipient objects
      const realRecipients: CampaignRecipient[] = Object.values(recipientMap).map((r) => {
        let status: "delivered" | "sent" | "failed" | "opened" | "clicked" | "bounced" = "sent";
        if (r.bounced && !r.delivered) {
          status = "bounced";
        } else if (r.clicksCount > 0) {
          status = "clicked";
        } else if (r.opensCount > 0) {
          status = "opened";
        } else if (r.delivered) {
          status = "delivered";
        } else if (r.bounced) {
          status = "bounced";
        }

        // Clean metadata - only real recipient contact attributes
        const metadata: Record<string, string> = {};

        const nameFromEmail = r.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        return {
          email: r.email,
          name: nameFromEmail,
          status: status as any,
          deliveredAt: r.latestDate,
          opensCount: r.opensCount,
          clicksCount: r.clicksCount,
          bounceReason: r.bounceReason,
          metadata,
        };
      });

      const totalRecips = realRecipients.length;
      const deliveredCount = realRecipients.filter((r) => r.status !== "bounced" && r.status !== "failed").length;
      const bouncedCount = realRecipients.filter((r) => r.status === "bounced" || r.status === "failed").length;
      const campRate = totalRecips > 0 ? Math.round((deliveredCount / totalRecips) * 100) : 100;

      campaignsBySubject[subj] = {
        subject: subj,
        opens: campaignOpens,
        clicks: campaignClicks,
        deliveredCount,
        bouncedCount,
        totalRecipients: totalRecips,
        deliveryRate: campRate,
        recipients: realRecipients,
        lastEventAt: evList[0]?.date,
      };
    }

    return {
      success: true,
      globalStats: {
        totalOpens,
        totalClicks,
        totalDelivered,
        totalRequests,
        deliveryRate,
      },
      campaignsBySubject,
      recentEvents: events,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error fetching Brevo real-time events";
    return {
      success: false,
      globalStats: {
        totalOpens: 0,
        totalClicks: 0,
        totalDelivered: 0,
        totalRequests: 0,
        deliveryRate: 100,
      },
      campaignsBySubject: {},
      recentEvents: [],
      fetchedAt: new Date().toISOString(),
      error: errorMsg,
    };
  }
}
