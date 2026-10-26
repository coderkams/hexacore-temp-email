import { createClient as createBrowserClient } from "./supabase/client";

const DEFAULT_SUPABASE_URL = "https://poggfmbfvdvobsbsdiqs.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2dmbWJmdmR2b2JzYnNkaXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODkxODYsImV4cCI6MjA5OTM2NTE4Nn0.RqXCTCXc-0d_Pl0fwD-vlMBYcU9IroQGPGrV2oSTQd4";

export const supabase = createBrowserClient();
export { createBrowserClient as createClient };

export interface DbCampaign {
  id: string;
  subject: string;
  audience: string;
  status: "pending" | "sent" | "delivered" | "failed";
  opens?: number;
  clicks?: number;
  content?: string;
  recipients?: Array<{
    email: string;
    name?: string;
    status?: string;
    deliveredAt?: string;
    metadata?: Record<string, string>;
  }> | string;
  created_at?: string;
}

export interface DbSubscriber {
  id?: string;
  email: string;
  created_at?: string;
}

export interface DbContactLead {
  id?: string;
  name: string;
  work_email: string;
  company_name?: string;
  country?: string;
  message: string;
  source?: string;
  created_at?: string;
}

/**
 * Fetch all logged email campaigns from Supabase.
 */
export async function getCampaignsFromDb(): Promise<DbCampaign[] | null> {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch campaigns error (table may not exist yet):", error.message);
      return null;
    }

    const rows: DbCampaign[] = (data || []).map((row: any) => {
      let recipients = row.recipients;
      if (!recipients && row.content) {
        const match = row.content.match(/<!-- HEXACORE_RECIPIENTS: ([\s\S]*?) -->/);
        if (match) {
          try {
            recipients = JSON.parse(match[1]);
          } catch {
            // ignore
          }
        }
      }
      return {
        ...row,
        recipients,
      };
    });

    return rows;
  } catch (err) {
    console.warn("Supabase client error:", err);
    return null;
  }
}

/**
 * Save a newly dispatched email campaign to Supabase.
 */
export async function saveCampaignToDb(campaign: DbCampaign): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("campaigns")
      .insert([campaign]);

    if (error) {
      // If error code is 42703 (column does not exist), fallback to embedding in content
      if (error.code === "42703" && campaign.recipients) {
        const { recipients, ...rest } = campaign;
        const serialized = typeof recipients === "string" ? recipients : JSON.stringify(recipients);
        const embeddedContent = `<!-- HEXACORE_RECIPIENTS: ${serialized} -->\n${rest.content || ""}`;
        const retry = await supabase.from("campaigns").insert([{ ...rest, content: embeddedContent }]);
        if (!retry.error) {
          return true;
        }
      }
      console.warn("Supabase save campaign error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase insert error:", err);
    return false;
  }
}

/**
 * Fetch newsletter subscribers from Supabase.
 */
export async function getSubscribersFromDb(): Promise<DbSubscriber[]> {
  try {
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch subscribers error:", error.message);
      return [];
    }
    return (data || []) as DbSubscriber[];
  } catch (err) {
    console.warn("Supabase subscribers error:", err);
    return [];
  }
}

/**
 * Fetch contact leads from Supabase.
 */
export async function getContactLeadsFromDb(): Promise<DbContactLead[]> {
  try {
    const { data, error } = await supabase
      .from("contact_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch contact leads error:", error.message);
      return [];
    }
    return (data || []) as DbContactLead[];
  } catch (err) {
    console.warn("Supabase contact leads error:", err);
    return [];
  }
}
