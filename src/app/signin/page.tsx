import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Sign In — Hexacore Email Studio",
  description: "Sign in to manage and dispatch Hexacore bulk email campaigns.",
};

export default function SignInPage() {
  return <AuthCard initialMode="signin" />;
}
