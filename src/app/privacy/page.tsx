import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: "How PromptAvero handles information and site activity.", alternates: { canonical: canonicalUrl("/privacy/") } };
export default function PrivacyPage() {
  return <main className="page-main container"><article className="prose"><span className="eyebrow">Last updated October 2026</span><h1>Privacy policy</h1><p>This starter policy describes the features included in this project and must be reviewed against the services you actually configure before launch.</p><h2>Information collected</h2><p>The public browsing experience does not require an account. The administration API processes the administrator&apos;s email and authentication session to protect content management. Your hosting, database, and API providers may record operational logs.</p><h2>Cookies and security</h2><p>The admin API uses a secure, HTTP-only session cookie when configured. It is used only for administrator authentication. Do not deploy analytics, contact forms, or other tracking without updating this policy.</p><h2>Retention and requests</h2><p>Set data retention and administrator contact procedures based on your deployment and applicable law. This template is not legal advice.</p></article></main>;
}
