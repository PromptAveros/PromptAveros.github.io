import type { Metadata } from "next";
import { AdminTaxonomy } from "@/components/admin-taxonomy";

export const metadata: Metadata = { title: "Manage Categories", robots: { index: false, follow: false } };

export default function AdminCategoriesPage() {
  return <AdminTaxonomy kind="categories" />;
}
