import type { Metadata } from "next";
import { AdminPromptForm } from "@/components/admin-prompt-form";

export const metadata: Metadata = { title: "Add Prompt", robots: { index: false, follow: false } };
export default function AdminPromptNewPage() { return <AdminPromptForm />; }
