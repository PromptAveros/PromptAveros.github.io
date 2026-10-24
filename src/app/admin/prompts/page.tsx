import type { Metadata } from "next";
import { AdminPrompts } from "@/components/admin-prompts";

export const metadata: Metadata = { title: "Manage Prompts", robots: { index: false, follow: false } };
export default function AdminPromptsPage() { return <AdminPrompts />; }
