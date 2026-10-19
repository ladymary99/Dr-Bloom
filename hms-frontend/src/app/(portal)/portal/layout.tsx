"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProfileAvatar from "@/components/ProfileAvatar";

const navItems = [
  { href: "/portal", label: "Overview", icon: "⌂" },
  { href: "/portal/book", label: "Book appointment", icon: "+" },
  { href: "/portal/appointments", label: "Appointments", icon: "◷" },
  { href: "/portal/records", label: "Medical records", icon: "▤" },
  { href: "/portal/billing", label: "Billing", icon: "$" },
];

const subscribeToNothing = () => () => {};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clear, roles } = useAuthStore();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const isPatient = roles.includes("patient");

  useEffect(() => {
    if (mounted && (!token || !isPatient)) router.replace("/login");
  }, [mounted, token, isPatient, router]);

  if (!mounted || !token || !isPatient) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch {
      // Clear local auth even if the token has expired.
    }
    clear();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">D</span>
            <span className="truncate font-semibold text-slate-900">Dr-Bloom Patient Portal</span>
          </Link>
          <div className="flex flex-none items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-slate-500 sm:block">{user?.name}</span>
            <ProfileAvatar name={user?.name ?? "Profile"} className="h-9 w-9 rounded-full bg-blue-50 text-sm font-semibold text-blue-700" />
            <button type="button" onClick={logout} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Patient portal" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100"}`}>
                <span aria-hidden>{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
