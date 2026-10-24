import type { Metadata } from "next";
import Link from "next/link";
import { prompts } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

const styles = Array.from(new Set(prompts.flatMap((prompt) => prompt.styles)));
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const metadata: Metadata = { title: "Image Prompt Styles", description: "Browse image prompt inspiration by visual style, from cinematic and minimalist to watercolor and 3D.", alternates: { canonical: canonicalUrl("/styles/") } };

export default function StylesPage() {
  return <main className="page-main container"><header className="page-heading"><span className="eyebrow">Visual language</span><h1>Browse by style</h1><p>Find prompts that match the mood, medium, or visual treatment you have in mind.</p></header><div className="style-list">{styles.map((style) => <Link className="style-chip" key={style} href={`/styles/${slugify(style)}/`}>{style}</Link>)}</div></main>;
}
