"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";



const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", perm: "" },
  { href: "/patients", label: "Patients", icon: "👥", perm: "view patients" },
  { href: "/appointments", label: "Appointments", icon: "📅", perm: "manage appointments" },
  { href: "/departments", label: "Departments", icon: "🏥", perm: "manage departments" },
  { href: "/admin/users", label: "Users & Access", icon: "🛡️", perm: "manage users" },        // ⬅️
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "📋", perm: "view audit logs" },     // ⬅️
   { href: "/payments", label: "Payments", icon: "💳", perm: "manage payments" }, 
];
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles, token, clear, hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);


  // Wait for zustand persist to hydrate, then guard the route
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !token) router.replace("/login");
  }, [mounted, token, router]);

  if (!mounted || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch {
      /* token may already be dead — clear locally anyway */
    }
    clear();
    router.replace("/login");
  }

  const visibleNav = navItems.filter((n) => !n.perm || hasPermission(n.perm));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            D
          </div>
          <span className="font-semibold text-slate-900">Dr-Bloom HMS</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
              <div className="text-xs capitalize text-slate-500">{roles.join(", ")}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-lg text-slate-400 transition hover:text-slate-700"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}