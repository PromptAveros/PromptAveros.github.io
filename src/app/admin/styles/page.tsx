import type { Metadata } from "next";
import { AdminTaxonomy } from "@/components/admin-taxonomy";

export const metadata: Metadata = { title: "Manage Styles", robots: { index: false, follow: false } };

export default function AdminStylesPage() {
  return <AdminTaxonomy kind="styles" />;
}
