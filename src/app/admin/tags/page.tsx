import type { Metadata } from "next";
import { AdminTaxonomy } from "@/components/admin-taxonomy";

export const metadata: Metadata = { title: "Manage Tags", robots: { index: false, follow: false } };

export default function AdminTagsPage() {
  return <AdminTaxonomy kind="tags" />;
}
