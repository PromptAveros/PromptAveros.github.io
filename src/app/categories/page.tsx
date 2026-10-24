import type { Metadata } from "next";
import Link from "next/link";
import { categories, prompts } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";
import { PreviewImage } from "@/components/preview-image";

export const metadata: Metadata = {
  title: "Prompt Categories",
  description: "Browse image prompts by subject, including portraits, cinematic photography, fantasy art, and more.",
  alternates: { canonical: canonicalUrl("/categories/") },
};

export default function CategoriesPage() {
  return <main className="page-main container">
    <header className="page-heading"><span className="eyebrow">Find a direction</span><h1>Categories</h1><p>Explore prompt ideas by the subjects and scenes you want to create.</p></header>
    <div className="category-grid">{categories.map((category) => {
      const prompt = prompts.find((item) => item.category === category)!;
      return <Link className="category-card" key={category} href={`/categories/${prompt.categorySlug}/`}><PreviewImage src={prompt.imageUrl} alt="" width={650} height={430} /><strong>{category}</strong></Link>;
    })}</div>
  </main>;
}
