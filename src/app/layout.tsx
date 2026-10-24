import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DemoNotice } from "@/components/demo-notice";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "PromptAvero — Discover the prompt. Create the vision.",
    template: "%s | PromptAvero",
  },
  description: "Discover thoughtful AI image prompts, explore creative styles, and shape your next visual idea.",
  openGraph: {
    type: "website",
    siteName: "PromptAvero",
    title: "PromptAvero — Discover the prompt. Create the vision.",
    description: "Explore creative prompts and turn your ideas into extraordinary images.",
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <DemoNotice />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
