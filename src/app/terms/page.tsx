import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms for using the PromptAvero prompt discovery library.", alternates: { canonical: canonicalUrl("/terms/") } };
export default function TermsPage() {
  return <main className="page-main container"><article className="prose"><span className="eyebrow">Using PromptAvero</span><h1>Terms of use</h1><p>Prompts are provided as creative inspiration. Review the relevant image generator terms, rights, and safety policies before using a prompt or any generated result.</p><h2>Content and availability</h2><p>Content and external image previews may change or become unavailable. Example results are not guaranteed and are not represented as tested outputs.</p><h2>Before launch</h2><p>Replace this starter text with terms reviewed for your business, jurisdiction, content licenses, and actual deployment.</p></article></main>;
}
