import demoPromptData from "@/data/prompts.demo.json";
import generatedPromptData from "@/data/prompts.generated.json";
import contentState from "@/data/content-source.json";

export type Prompt = {
  id: string;
  title: string;
  slug: string;
  description: string;
  promptText: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  categorySlug: string;
  styles: string[];
  featured: boolean;
  isDemo?: boolean;
  publishedAt: string;
  aspectRatio: string;
  tips: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
  robotsIndex?: boolean;
};

export const prompts = (contentState.source === "database" ? generatedPromptData : demoPromptData) as Prompt[];
export type PromptSummary = Omit<Prompt, "promptText" | "tips" | "seoTitle" | "metaDescription" | "robotsIndex">;
export function toPromptSummary(prompt: Prompt): PromptSummary {
  return {
    id: prompt.id,
    title: prompt.title,
    slug: prompt.slug,
    description: prompt.description,
    imageUrl: prompt.imageUrl,
    imageAlt: prompt.imageAlt,
    category: prompt.category,
    categorySlug: prompt.categorySlug,
    styles: prompt.styles,
    featured: prompt.featured,
    isDemo: prompt.isDemo,
    publishedAt: prompt.publishedAt,
    aspectRatio: prompt.aspectRatio,
  };
}
export const categories = Array.from(new Set(prompts.map((prompt) => prompt.category)));
export const styles = Array.from(new Set(prompts.flatMap((prompt) => prompt.styles)));
export const isDemoContent = contentState.source !== "database";

export function getPrompt(slug: string) {
  return prompts.find((prompt) => prompt.slug === slug);
}
