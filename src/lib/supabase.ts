import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://poggfmbfvdvobsbsdiqs.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbCampaign {
  id: string;
  subject: string;
  audience: string;
  status: "pending" | "sent" | "delivered" | "failed";
  opens?: number;
  clicks?: number;
  content?: string;
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
    return data as DbCampaign[];
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
