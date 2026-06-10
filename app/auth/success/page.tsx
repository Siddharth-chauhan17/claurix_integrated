"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCurrentUser } from "@/lib/api";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) return;
    toast.success("Logged in successfully with Google 🎉");
    getCurrentUser().then((u) => {
      if (u) setUser(u);
    });
    const t = setTimeout(() => router.push("/"), 1500);
    return () => clearTimeout(t);
  }, [error, router, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <p className="text-red-600">Log in failed: {error}</p>
        <Link href="/login" className="text-primary-600 hover:text-primary-700 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <p className="text-slate-700 text-lg">Logging you in...</p>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-600">Logging you in...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
