import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://poggfmbfvdvobsbsdiqs.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2dmbWJmdmR2b2JzYnNkaXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODkxODYsImV4cCI6MjA5OTM2NTE4Nn0.RqXCTCXc-0d_Pl0fwD-vlMBYcU9IroQGPGrV2oSTQd4";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

    let response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("cookie") || "";
          return cookieHeader
            .split("; ")
            .filter(Boolean)
            .map((cookie) => {
              const [name, ...rest] = cookie.split("=");
              return { name, value: rest.join("=") };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Redirect to sign in page if code verification failed
  return NextResponse.redirect(new URL("/signin?error=auth_callback_failed", origin));
}
