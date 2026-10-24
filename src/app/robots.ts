import type { MetadataRoute } from "next";
import { canonicalUrl, siteBasePath } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [`${siteBasePath}/admin/`, `${siteBasePath}/api/`] }],
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
