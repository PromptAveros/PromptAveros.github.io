import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Admin Sign In", robots: { index: false, follow: false } };
export default function AdminLoginPage() {
  return <main className="container admin-shell"><section className="admin-panel"><span className="eyebrow">Private workspace</span><h1>Sign in</h1><p>Administrator credentials are verified by the backend. This page does not store or validate passwords in the browser.</p><AdminLoginForm /></section></main>;
}
