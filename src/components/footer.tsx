import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link className="brand" href="/">
              <span className="brand-mark"><Sparkles aria-hidden="true" /></span>
              <span>PromptAvero</span>
            </Link>
            <p className="footer-blurb">A thoughtful library of image prompts to help you find a direction and make it your own.</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link href="/about/">About</Link>
            <Link href="/contact/">Contact</Link>
            <Link href="/privacy/">Privacy</Link>
            <Link href="/terms/">Terms</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PromptAvero</span>
          <span>Images and prompt examples are provided for creative inspiration.</span>
        </div>
      </div>
    </footer>
  );
}
