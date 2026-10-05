"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const roles = useAuthStore((s) => s.roles);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    router.replace(roles.includes("patient") ? "/portal" : "/dashboard");
  }, [token, roles, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Loading…
    </div>
  );
}