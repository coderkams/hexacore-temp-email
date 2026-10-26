"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthCardProps {
  initialMode?: "signin" | "signup";
}

export default function AuthCard({ initialMode = "signin" }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Form Fields
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  // Synchronize internal mode whenever initialMode changes (e.g. page navigation)
  useEffect(() => {
    setMode(initialMode);
    setErrorMessage("");
    setSuccessMessage("");
  }, [initialMode]);

  // Check URL search params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const emailParam = searchParams.get("email");
        if (emailParam) {
          setEmail(emailParam);
        }
        if (searchParams.get("registered") === "true") {
          setSuccessMessage("Account created successfully! Please enter your password to sign in.");
        }
        if (searchParams.get("error") === "auth_callback_failed") {
          setErrorMessage("Authentication link expired or invalid. Please try signing in again.");
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    // 1. FORGOT PASSWORD MODE
    if (mode === "forgot") {
      setIsLoading(true);
      try {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setSuccessMessage("Password reset email sent! Please check your inbox for instructions.");
      } catch {
        setErrorMessage("Unable to send reset email. Please try again later.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. SIGN IN OR SIGN UP REQUIRES PASSWORD
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "signup" && !firstName.trim()) {
      setErrorMessage("Please enter your first name.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signup") {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const companyName = company.trim() || "Hexacore Community";

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              company: companyName,
            },
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          },
        });

        if (error) {
          let msg = error.message;
          if (msg.toLowerCase().includes("user already registered") || msg.toLowerCase().includes("already registered")) {
            msg = "An account with this email already exists. Please sign in instead.";
          }
          setErrorMessage(msg);
          setIsLoading(false);
          return;
        }

        // Check if an immediate session was established
        if (data?.session) {
          const user = data.user;
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "hexacore_user",
              JSON.stringify({
                id: user?.id,
                name: fullName || "Hexacore User",
                email: cleanEmail,
                company: companyName,
                isLoggedIn: true,
              })
            );
          }

          setSuccessMessage("Account created successfully! Redirecting to Email Studio...");
          setTimeout(() => {
            router.refresh();
            router.push("/");
          }, 800);
          return;
        }

        // Email confirmation is required
        setSuccessMessage(
          "Account created! Please check your inbox to confirm your email address, then sign in."
        );
        setPassword("");

        setTimeout(() => {
          setMode("signin");
          router.push(`/signin?registered=true&email=${encodeURIComponent(cleanEmail)}`);
        }, 2200);
        return;
      }

      // MODE IS SIGN IN
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes("invalid login credentials")) {
          msg = "Invalid email or password. Please verify your credentials and try again.";
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          msg = "Your email address has not been confirmed yet. Please check your inbox for the activation link.";
        }
        setErrorMessage(msg);
        setIsLoading(false);
        return;
      }

      const user = data?.user;
      if (user) {
        const metadata = user.user_metadata || {};
        const fullName =
          metadata.full_name ||
          (metadata.first_name ? `${metadata.first_name} ${metadata.last_name || ""}`.trim() : null) ||
          user.email?.split("@")[0] ||
          "Hexacore User";

        const companyName = metadata.company || "Hexacore Community";

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "hexacore_user",
            JSON.stringify({
              id: user.id,
              name: fullName,
              email: user.email || cleanEmail,
              company: companyName,
              isLoggedIn: true,
            })
          );
        }
      }

      setSuccessMessage(`Welcome back! Redirecting to Email Studio...`);

      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 700);
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#f8fafc] relative overflow-hidden">
      {/* Technical Blueprint Grid Pattern matching screenshots */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      />

      {/* Radial soft glow behind card */}
      <div className="absolute w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -top-24 -left-24" />
      <div className="absolute w-[500px] h-[500px] bg-cyan-100/30 rounded-full blur-3xl pointer-events-none -bottom-24 -right-24" />

      {/* MAIN AUTH CARD */}
      <div className="w-full max-w-[440px] bg-white rounded-[32px] p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <Image
                src="/hexacore-icon.png"
                alt="Hexacore"
                width={52}
                height={52}
                priority
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icon.png";
                }}
              />
            </div>
          </Link>
        </div>

        {/* HEADINGS */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-[28px] font-black text-[#0d1f4a] tracking-tight">
            {mode === "signin" 
              ? "Welcome Back" 
              : mode === "signup" 
              ? "Create an Account" 
              : "Reset Password"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
            {mode === "signin" 
              ? "Sign in to manage and dispatch Hexacore email campaigns" 
              : mode === "signup" 
              ? "Sign up to start dispatching personalized email campaigns"
              : "Enter your registered email and we'll send you a password reset link"}
          </p>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SIGN UP ONLY: FIRST NAME & LAST NAME (2 COLUMNS) */}
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* SIGN UP ONLY: COMPANY (OPTIONAL) */}
          {/*
          {mode === "signup" && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-700 block">
                Company (Optional)
              </label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none text-sm transition-all"
              />
            </div>
          )}
          */}

          {/* EMAIL ADDRESS */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none text-sm transition-all"
              />
            </div>
          </div>

          {/* PASSWORD (SIGN IN & SIGN UP MODES ONLY) */}
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-xs font-semibold text-[#1a6fd4] hover:text-[#0d1f4a] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a6fd4]/20 focus:border-[#1a6fd4] outline-none text-sm transition-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON (Dark Navy with Arrow) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#0d1f4a] hover:bg-[#152a62] active:scale-[0.99] text-white font-bold text-sm transition-all shadow-lg shadow-[#0d1f4a]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {mode === "signin"
                      ? "Signing In..."
                      : mode === "signup"
                      ? "Creating Account..."
                      : "Sending Link..."}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {mode === "signin"
                      ? "Sign In"
                      : mode === "signup"
                      ? "Create Account"
                      : "Send Reset Link"}
                  </span>
                  {mode === "forgot" ? (
                    <KeyRound className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </>
              )}
            </button>
          </div>
        </form>

        {/* FORGOT PASSWORD RETURN TO SIGN IN */}
        {mode === "forgot" && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a6fd4] hover:text-[#0d1f4a] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {/* DIVIDER & SWITCH MODE */}
        {mode !== "forgot" && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <Link
                href={mode === "signin" ? "/signup" : "/signin"}
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
                className="font-bold text-[#1a6fd4] hover:text-[#0d1f4a] hover:underline transition-colors cursor-pointer"
              >
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </Link>
            </p>

            {/* Enterprise setup? Contact Sales */}
            {/*
            <p className="text-[11px] text-slate-400">
              Enterprise setup?{" "}
              <a 
                href="mailto:sales@hexacore.ng" 
                className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
              >
                Contact Sales
              </a>
            </p>
            */}
          </div>
        )}

      </div>
    </div>
  );
}
