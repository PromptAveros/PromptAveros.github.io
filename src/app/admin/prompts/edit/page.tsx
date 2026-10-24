import type { Metadata } from "next";
import { AdminPromptForm } from "@/components/admin-prompt-form";

export const metadata: Metadata = { title: "Edit Prompt", robots: { index: false, follow: false } };
export default function AdminPromptEditPage() { return <AdminPromptForm editing />; }
