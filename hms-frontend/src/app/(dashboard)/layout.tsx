"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Icon, { type IconName } from "@/components/icons";
import ProfileAvatar from "@/components/ProfileAvatar";

type NavItem = { href: string; label: string; icon: IconName; perm?: string; role?: string; notRole?: string };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", perm: "" },
  { href: "/patients", label: "Patients", icon: "patients", perm: "view patients" },
  { href: "/appointments", label: "Appointments", icon: "appointments", perm: "manage appointments" },
  { href: "/doctor/queue", label: "My Queue", icon: "queue", perm: "conduct visits", notRole: "admin" },
  { href: "/my-department", label: "My Department", icon: "departments", role: "doctor" },
  { href: "/beds", label: "Wards & Beds", icon: "beds", perm: "" },
  { href: "/lab", label: "Laboratory", icon: "lab", perm: "manage lab" },
  { href: "/pharmacy", label: "Pharmacy", icon: "pharmacy", perm: "manage pharmacy" },
  { href: "/departments", label: "Departments", icon: "departments", perm: "manage departments" },
  { href: "/payments", label: "Payments", icon: "payments", perm: "manage payments" },
];

const adminItems: NavItem[] = [
  { href: "/reports", label: "Reports", icon: "reports", perm: "manage payments" },
  { href: "/announcements", label: "Announcements", icon: "announcements", role: "admin" },
  { href: "/admin/contacts", label: "Contacts", icon: "mail", role: "admin" },
  { href: "/admin/users", label: "Users & Access", icon: "users", perm: "manage users" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "audit", perm: "view audit logs" },
];

const subscribeToNothing = () => () => {};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles, token, clear, hasPermission } = useAuthStore();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminPos, setAdminPos] = useState<{ top: number; left: number } | null>(null);
  const adminBtnRef = useRef<HTMLButtonElement>(null);
  const adminCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mounted && !token) router.replace("/login");
  }, [mounted, token, router]);

  useEffect(() => {
    if (mounted && token && roles.includes("patient")) router.replace("/portal");
  }, [mounted, token, roles, router]);

  useEffect(() => {
    // Close the portal when navigation changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminMenuOpen(false);
  }, [pathname]);

  useEffect(() => () => {
    if (adminCloseTimer.current) clearTimeout(adminCloseTimer.current);
  }, []);

  if (!mounted || !token || roles.includes("patient")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-tint)] border-t-[var(--primary)]" />
      </div>
    );
  }

  async function logout() {
    try { await api.post("/logout"); } catch { /* clear anyway */ }
    clear();
    router.replace("/login");
  }

  const openAdminMenu = () => {
    if (adminCloseTimer.current) {
      clearTimeout(adminCloseTimer.current);
      adminCloseTimer.current = null;
    }
    if (!adminMenuOpen && adminBtnRef.current) {
      const r = adminBtnRef.current.getBoundingClientRect();
      setAdminPos({
        top: r.bottom + 10,
        left: Math.min(r.left, window.innerWidth - 240),
      });
    }
    setAdminMenuOpen(true);
  };

  const scheduleCloseAdminMenu = () => {
    if (adminCloseTimer.current) clearTimeout(adminCloseTimer.current);
    adminCloseTimer.current = setTimeout(() => setAdminMenuOpen(false), 250);
  };

  const visibleNav = navItems.filter(
    (item) =>
      (!item.perm || hasPermission(item.perm)) &&
      (!item.role || roles.includes(item.role)) &&
      (!item.notRole || !roles.includes(item.notRole))
  );
  const isAdmin = roles.includes("admin");

  const iconBtnCls =
    "flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--muted)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--primary-tint)]/30 hover:text-[var(--primary)]";
  const menuItemCls =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--primary-tint)]/25";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      {/* ===== Top header — like the image ===== */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--app-bg)]/85 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4">
          {/* Left: app mark + name */}
          <Link href="/dashboard" className="group flex flex-none items-center gap-2.5">
            <div className="font-heading flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md shadow-[var(--primary)]/25 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
              D
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="font-heading text-sm font-semibold text-[var(--ink)]">Dr&apos;Bloom</div>
              <div className="text-xs capitalize text-[var(--muted)]">{roles.join(", ")}</div>
            </div>
          </Link>

          {/* Center: dark pill command bar — ALL nav links */}
          <div className="mx-auto hidden max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[var(--primary)] p-1.5 shadow-lg shadow-[var(--primary)]/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-[var(--primary)]/30 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
            {/* all nav links — same pills, same roll animation */}
            {visibleNav.map((item) => {
              const active = pathname.startsWith(item.href);
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

            {/* Administration dropdown */}
            {(() => {
              const allowed = adminItems.filter(
                (item) => (!item.perm || hasPermission(item.perm)) && (!item.role || roles.includes(item.role))
              );
              if (!allowed.length) return null;
              const anyActive = allowed.some((i) => pathname.startsWith(i.href));
              return (
                <div
                  className="relative ml-1 flex-none"
                  onMouseEnter={openAdminMenu}
                  onMouseLeave={scheduleCloseAdminMenu}
                >
                  <button
                    ref={adminBtnRef}
                    onClick={() => (adminMenuOpen ? setAdminMenuOpen(false) : openAdminMenu())}
                    title="Administration"
                    className={`btn-roll flex items-center gap-1 rounded-full px-4 py-1.5 text-xs whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 ${
                      adminMenuOpen || anyActive
                        ? "bg-white font-semibold text-[var(--primary)]"
                        : "font-medium text-[var(--primary-tint)] hover:bg-white hover:font-semibold hover:text-[var(--primary)]"
                    }`}
                  >
                    <span className="roll">
                      <span className="r1">Administration</span>
                      <span className="r2" aria-hidden>Administration</span>
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                      className={`transition-transform duration-300 ${adminMenuOpen ? "rotate-180" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {adminMenuOpen && adminPos && createPortal(
                    <div
                      className="animate-fade-up fixed z-[95] w-56 rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-xl shadow-[var(--primary)]/10"
                      style={{ top: adminPos.top, left: adminPos.left }}
                      onMouseEnter={openAdminMenu}
                      onMouseLeave={scheduleCloseAdminMenu}
                    >
                      {allowed.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                              active
                                ? "bg-[var(--primary-tint)]/40 font-medium text-[var(--primary)]"
                                : "text-[var(--ink)] hover:bg-[var(--primary-tint)]/25"
                            }`}
                          >
                            <Icon name={item.icon} size={16} /> {item.label}
                          </Link>
                        );
                      })}
                    </div>,
                    document.body
                  )}
                </div>
              );
            })()}
          </div>

          {/* mobile spacer when bar is hidden */}
          <div className="mx-auto md:hidden" />

          {/* Right: ⋯ menu + avatar */}
          <div className="ml-auto flex flex-none items-center gap-1.5">
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
                      <div className="text-xs capitalize text-[var(--muted)]">{roles.join(", ")}</div>
                    </div>
                    <div className="pt-1">
                      <button onClick={() => { setMenuOpen(false); router.push("/profile"); }} className={menuItemCls}>
                        <Icon name="profile" size={16} /> My Profile
                      </button>
                      {isAdmin && (
                        <button onClick={() => { setMenuOpen(false); router.push("/settings"); }} className={menuItemCls}>
                          <Icon name="settings" size={16} /> Hospital Settings
                        </button>
                      )}
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
            <button
              onClick={() => router.push("/profile")}
              title="My Profile"
              className="ml-1 rounded-full ring-2 ring-[var(--primary-tint)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <ProfileAvatar name={user?.name ?? "Profile"} className="h-10 w-10 rounded-full bg-[var(--primary)] font-heading text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/30" />
            </button>
          </div>
        </div>

        {/* ===== Mobile icon nav (bar is hidden on small screens) ===== */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
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
                <Icon name={item.icon} />
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="animate-fade-up flex-1 p-5">
        <AnnouncementBanner />
        {children}
      </main>
    </div>
  );
}