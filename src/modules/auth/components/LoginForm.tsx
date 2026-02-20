"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/modules/auth/actions/auth.actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAction(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: "rgba(220,0,60,0.12)",
            border: "1px solid rgba(255,80,100,0.3)",
            color: "#ff8a9a",
          }}
        >
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="auth-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-input w-full rounded-lg px-3 py-2.5 text-sm"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="auth-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="auth-input w-full rounded-lg px-3 py-2.5 text-sm"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="auth-button mt-1 w-full rounded-lg px-4 py-2.5 text-sm"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
      <p className="text-center text-sm" style={{ color: "rgba(0,200,160,0.6)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="auth-link">
          Sign up
        </Link>
      </p>
    </form>
  );
}
