import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://poggfmbfvdvobsbsdiqs.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2dmbWJmdmR2b2JzYnNkaXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODkxODYsImV4cCI6MjA5OTM2NTE4Nn0.RqXCTCXc-0d_Pl0fwD-vlMBYcU9IroQGPGrV2oSTQd4";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (typeof window === "undefined") {
    return createBrowserClient(url, anonKey);
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(url, anonKey);
  }
  return clientInstance;
}
