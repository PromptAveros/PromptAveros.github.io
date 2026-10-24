"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBox({ hero = false }: { hero?: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`/search/?q=${encodeURIComponent(query.trim())}`);
  }
  return <form className={hero ? "hero-search" : "search-field"} onSubmit={submit} role="search">
    <label>
      <Search aria-hidden="true" />
      <span className="sr-only">Search prompts</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “cinematic portrait” or “soft light”…" />
    </label>
    <button type="submit">Search</button>
  </form>;
}
