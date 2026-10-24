import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Contact the PromptAvero team about the prompt library.", alternates: { canonical: canonicalUrl("/contact/") } };
export default function ContactPage() {
  return <main className="page-main container"><article className="prose"><span className="eyebrow">Get in touch</span><h1>Contact PromptAvero</h1><p>For corrections, licensing questions, or suggestions, contact the site administrator at the email configured for your deployment.</p><p>No contact inbox is configured in this demonstration build. Add a monitored address and update this page before production launch.</p></article></main>;
}
