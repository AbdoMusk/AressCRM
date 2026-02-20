"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupAction } from "@/modules/auth/actions/auth.actions";

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signupAction(email, password, fullName);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            background: "rgba(0,200,140,0.12)",
            border: "1px solid rgba(0,255,180,0.25)",
            color: "#00ffbb",
          }}
        >
          Check your email to confirm your account.
        </div>
        <Link href="/login" className="auth-link text-sm">
          Back to Sign In
        </Link>
      </div>
    );
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
        <label htmlFor="fullName" className="auth-label">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="auth-input w-full rounded-lg px-3 py-2.5 text-sm"
          placeholder="John Doe"
        />
      </div>
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
          minLength={6}
          className="auth-input w-full rounded-lg px-3 py-2.5 text-sm"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="auth-button mt-1 w-full rounded-lg px-4 py-2.5 text-sm"
      >
        {loading ? "Creating account…" : "Sign Up"}
      </button>
      <p className="text-center text-sm" style={{ color: "rgba(0,200,160,0.6)" }}>
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </form>
  );
}
