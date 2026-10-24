"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Moon, Search, Sparkles, Sun, X } from "lucide-react";

const links = [
  ["Explore", "/prompts/"],
  ["Categories", "/categories/"],
  ["Styles", "/styles/"],
  ["Trending", "/trending/"],
];

export function Header() {
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("promptavero-theme");
    const next = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    requestAnimationFrame(() => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
    });
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("promptavero-theme", next);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="PromptAvero home">
          <span className="brand-mark"><Sparkles aria-hidden="true" /></span>
          <span>PromptAvero</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="header-search" href="/search/"><Search aria-hidden="true" /> Search</Link>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
        <Link href="/latest/" onClick={() => setMenuOpen(false)}>Latest</Link>
      </nav>}
    </header>
  );
}
