"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/admin-client";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const csrfToken = await login(String(form.get("email")), String(form.get("password")));
      sessionStorage.setItem("promptavero-csrf", csrfToken);
      router.push("/admin/prompts/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }
  return <form className="form-stack" onSubmit={submit}>
    <div className="form-field"><label htmlFor="email">Administrator email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
    <div className="form-field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
  </form>;
}
