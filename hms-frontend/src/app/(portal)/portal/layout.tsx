"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProfileAvatar from "@/components/ProfileAvatar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationBell from "@/components/NotificationBell";
import Icon, { type IconName } from "@/components/icons";

type NavItem = { href: string; label: string; icon: IconName };

const navItems: NavItem[] = [
  { href: "/portal", label: "Overview", icon: "dashboard" },
  { href: "/portal/book", label: "Book appointment", icon: "appointments" },
  { href: "/portal/appointments", label: "Appointments", icon: "queue" },
  { href: "/portal/records", label: "Medical records", icon: "patients" },
  { href: "/portal/billing", label: "Billing", icon: "payments" },
];

const subscribeToNothing = () => () => {};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clear, roles } = useAuthStore();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const isPatient = roles.includes("patient");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (mounted && (!token || !isPatient)) router.replace("/login");
  }, [mounted, token, isPatient, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  if (!mounted || !token || !isPatient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-tint)] border-t-[var(--primary)]" />
      </div>
    );
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

  const iconBtnCls =
    "flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--muted)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--primary-tint)]/30 hover:text-[var(--primary)]";
  const menuItemCls =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--primary-tint)]/25";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      {/* ===== Top header — same style as staff dashboard ===== */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--app-bg)]/85 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4">
          {/* Left: app mark + name */}
          <Link href="/portal" className="group flex flex-none items-center gap-2.5">
            <div className="font-heading flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md shadow-[var(--primary)]/25 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
              D
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="font-heading text-sm font-semibold text-[var(--ink)]">Dr&apos;Bloom</div>
              <div className="text-xs capitalize text-[var(--muted)]">Patient Portal</div>
            </div>
          </Link>

          {/* Center: dark pill command bar */}
          <div className="mx-auto hidden max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[var(--primary)] p-1.5 shadow-lg shadow-[var(--primary)]/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-[var(--primary)]/30 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const active = item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`btn-roll flex-none rounded-full px-4 py-1.5 text-xs whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 ${
                    active
                      ? "bg-white font-semibold text-[var(--primary)]"
                      : "font-medium text-[var(--primary-tint)] hover:bg-white hover:font-semibold hover:text-[var(--primary)]"
                  }`}
                >
                  <span className="roll">
                    <span className="r1">{item.label}</span>
                    <span className="r2" aria-hidden>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* mobile spacer */}
          <div className="mx-auto md:hidden" />

          {/* Right: bell + avatar + ⋯ menu */}
          <div className="ml-auto flex flex-none items-center gap-1.5">
            <NotificationBell />

            {/* ⋯ menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                title="More options"
                aria-label="More options"
                className={`${iconBtnCls} ${menuOpen ? "bg-[var(--primary-tint)]/40 text-[var(--primary)]" : ""}`}
              >
                <Icon name="dots" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="animate-fade-up absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-xl shadow-[var(--primary)]/15">
                    <div className="border-b border-[var(--border)] px-3 pb-2 pt-1.5">
                      <div className="truncate font-heading text-sm font-semibold text-[var(--ink)]">{user?.name}</div>
                      <div className="text-xs capitalize text-[var(--muted)]">Patient</div>
                    </div>
                    <div className="pt-1">
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button onClick={logout} className={`${menuItemCls} text-red-600 hover:bg-red-50`}>
                        <Icon name="logout" size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <Link
              href="/portal"
              title="My Portal"
              className="ml-1 rounded-full ring-2 ring-[var(--primary-tint)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <ProfileAvatar name={user?.name ?? "Profile"} className="h-10 w-10 rounded-full bg-[var(--primary)] font-heading text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/30" />
            </Link>
          </div>
        </div>

        {/* ===== Mobile icon nav ===== */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {navItems.map((item) => {
            const active = item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`nav-item flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-all duration-300 ${
                  active
                    ? "scale-105 bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30"
                    : "text-[var(--muted)] hover:-translate-y-0.5 hover:bg-[var(--primary-tint)]/35 hover:text-[var(--primary)]"
                }`}
              >
                <Icon name={item.icon} size={24} />
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="animate-fade-up flex-1 p-5">
        <AnnouncementBanner endpoint="/portal/announcements" />
        {children}
      </main>
    </div>
  );
}