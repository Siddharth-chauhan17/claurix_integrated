"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { DividerWithOr } from "@/components/auth/DividerWithOr";
import { InputWithIcon } from "@/components/auth/InputWithIcon";
import { EnvelopeIcon, LockIcon } from "@/components/auth/icons";
import { Button } from "@/components/ui/Button";
import { getAuthUrl, getGoogleOAuthUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleClick = () => {
    window.location.href = getGoogleOAuthUrl();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(getAuthUrl("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.detail?.toString?.() ??
          (Array.isArray(data.detail)
            ? data.detail.map((d: { msg?: string }) => d.msg).join(", ")
            : data.detail) ??
          "Login failed";
        setError(typeof msg === "string" ? msg : "Login failed");
        return;
      }
      if (data.user) {
        setUser(data.user);
        router.push("/workstation");
        return;
      }
      setError("Invalid response from server");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace("/workstation");
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <AuthLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
          Loading...
        </div>
      </AuthLayout>
    );
  }
  if (user) return null;

  return (
    <AuthLayout>
      <AuthCard>
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome Back
        </h1>
        <p className="mt-2 text-center text-slate-600">
          Log in to your account
        </p>

        <div className="mt-8 space-y-5">
          <GoogleButton type="button" onClick={handleGoogleClick}>
            Log in with Google
          </GoogleButton>

          <DividerWithOr />

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <InputWithIcon
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={<EnvelopeIcon className="h-5 w-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <InputWithIcon
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<LockIcon className="h-5 w-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <div className="mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
