"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { googleAuth } = useAuthStore();
  const calledRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code || calledRef.current) return;
    calledRef.current = true;

    googleAuth(code)
      .then(() => router.replace("/"))
      .catch(() => router.replace("/login"));
  }, [searchParams, googleAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
