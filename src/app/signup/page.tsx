import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Create an Account — Hexacore Email Studio",
  description: "Sign up to start dispatching personalized email campaigns with Hexacore.",
};

export default function SignUpPage() {
  return <AuthCard initialMode="signup" />;
}
