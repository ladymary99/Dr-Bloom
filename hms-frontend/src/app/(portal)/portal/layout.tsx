"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { usePortal } from "@/store/portal";
import { LANGS, useLang, useT, type Lang } from "@/lib/i18n";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import ProfileAvatar from "@/components/ProfileAvatar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationBell from "@/components/NotificationBell";
import Icon, { type IconName } from "@/components/icons";
import { Modal, btnGhost, btnPrimary, Notice } from "@/components/ui";

type NavItem = { href: string; label: string; icon: IconName };

const navItems: NavItem[] = [
  { href: "/portal", label: "Overview", icon: "dashboard" },
  { href: "/portal/book", label: "Book appointment", icon: "appointments" },
  { href: "/portal/appointments", label: "Appointments", icon: "queue" },
  { href: "/portal/records", label: "Medical records", icon: "patients" },
  { href: "/portal/billing", label: "Billing", icon: "payments" },
  { href: "/portal/messages", label: "Messages", icon: "mail" },
  { href: "/portal/documents", label: "Documents", icon: "reports" },
];

const subscribeToNothing = () => () => {};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { user, token, clear, roles } = useAuthStore();
  const { lang, setLang } = useLang();
  const { needsConsent, unreadMessages, policyVersion, setMeta } = usePortal();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const isPatient = roles.includes("patient");
  const [menuOpen, setMenuOpen] = useState(false);
  const [consentErr, setConsentErr] = useState("");
  const [accepting, setAccepting] = useState(false);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // Clear local auth even if the token has expired.
    }
    clear();
    router.replace("/login");
  }, [clear, router]);

  // Session timeout: 14 min idle + 60 s warning
  const idle = useIdleLogout(logout, mounted && !!token && isPatient);

  useEffect(() => {
    if (mounted && (!token || !isPatient)) router.replace("/login");
  }, [mounted, token, isPatient, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Shared meta: consent gate, unread badge, and the patient's saved language (applied once per login)
  useEffect(() => {
    if (!mounted || !token || !isPatient) return;
    let alive = true;
    api
      .get("/portal/me")
      .then(({ data }) => {
        if (!alive) return;
        setMeta({ needsConsent: data.needs_consent, unreadMessages: data.stats?.unread_messages ?? 0 });
        const saved = data.patient?.preferred_language as Lang | undefined;
        if (saved && !sessionStorage.getItem("lang-applied")) {
          setLang(saved);
          sessionStorage.setItem("lang-applied", "1");
        }
      })
      .catch(() => {});
    api.get("/portal/profile").then(({ data }) => alive && setMeta({ policyVersion: data.privacy_policy_version })).catch(() => {});
    return () => {
      alive = false;
    };
  }, [mounted, token, isPatient, pathname, setMeta, setLang]);

  if (!mounted || !token || !isPatient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--muted)]">
        <div role="status" aria-label={t("Loading")} className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-tint)] border-t-[var(--primary)]" />
      </div>
    );
  }

  async function acceptPolicy() {
    setAccepting(true);
    setConsentErr("");
    try {
      await api.post("/portal/consents", { accept: true });
      setMeta({ needsConsent: false });
    } catch (e) {
      setConsentErr(apiError(e));
    } finally {
      setAccepting(false);
    }
  }

  function changeLang(code: Lang) {
    setLang(code);
    api.put("/portal/profile", { preferred_language: code }).catch(() => {});
  }

  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));
  const iconBtnCls =
    "flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--muted)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--primary-tint)]/30 hover:text-[var(--primary)]";
  const menuItemCls = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--primary-tint)]/25";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      <a href="#main" className="skip-link">{t("Skip to content")}</a>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--app-bg)]/85 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4">
          <Link href="/portal" className="group flex flex-none items-center gap-2.5" aria-label="Dr'Bloom – home">
            <div aria-hidden className="font-heading flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md shadow-[var(--primary)]/25 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">D</div>
            <div className="hidden leading-tight sm:block">
              <div className="font-heading text-sm font-semibold text-[var(--ink)]">Dr&apos;Bloom</div>
              <div className="text-xs text-[var(--muted)]">{t("Patient Portal")}</div>
            </div>
          </Link>

          <nav aria-label="Main" className="mx-auto hidden max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[var(--primary)] p-1.5 shadow-lg shadow-[var(--primary)]/25 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`btn-roll relative flex-none rounded-full px-4 py-1.5 text-xs whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 ${
                    active ? "bg-white font-semibold text-[var(--primary)]" : "font-medium text-[var(--primary-tint)] hover:bg-white hover:font-semibold hover:text-[var(--primary)]"
                  }`}
                >
                  <span className="roll">
                    <span className="r1">{t(item.label)}</span>
                    <span className="r2" aria-hidden>{t(item.label)}</span>
                  </span>
                  {item.href === "/portal/messages" && unreadMessages > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      <span className="sr-only">{unreadMessages} unread</span>
                      <span aria-hidden>{unreadMessages}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mx-auto md:hidden" />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <NotificationBell viewAllHref="/portal/notifications" />

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`${iconBtnCls} ${menuOpen ? "bg-[var(--primary-tint)]/40 text-[var(--primary)]" : ""}`}
              >
                <Icon name="dots" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div role="menu" className="animate-fade-up absolute right-0 top-12 z-50 w-64 rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-xl shadow-[var(--primary)]/15">
                    <div className="border-b border-[var(--border)] px-3 pb-2 pt-1.5">
                      <div className="truncate font-heading text-sm font-semibold text-[var(--ink)]">{user?.name}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{user?.email}</div>
                    </div>
                    <div className="pt-1">
                      <Link role="menuitem" href="/portal/profile" className={menuItemCls}><Icon name="patients" size={16} /> {t("Profile")}</Link>
                      <Link role="menuitem" href="/portal/settings" className={menuItemCls}><Icon name="settings" size={16} /> {t("Settings")}</Link>
                      <Link role="menuitem" href="/portal/notifications" className={menuItemCls}><Icon name="bell" size={16} /> {t("Notifications")}</Link>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <div className="px-3 py-1.5">
                        <label htmlFor="lang-select" className="mb-1 block text-xs font-semibold text-[var(--muted)]">{t("Language")}</label>
                        <select id="lang-select" value={lang} onChange={(e) => changeLang(e.target.value as Lang)} className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm">
                          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button role="menuitem" onClick={logout} className={`${menuItemCls} text-red-700 hover:bg-red-50`}>
                        <Icon name="logout" size={16} /> {t("Sign out")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/portal/profile" aria-label={t("Profile")} className="ml-1 rounded-full ring-2 ring-[var(--primary-tint)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <ProfileAvatar name={user?.name ?? "Profile"} className="h-10 w-10 rounded-full bg-[var(--primary)] font-heading text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/30" />
            </Link>
          </div>
        </div>

        {/* Mobile nav: icon + short label so it is usable without guessing */}
        <nav aria-label="Main (mobile)" className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden [scrollbar-width:none]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-[4.25rem] flex-none flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition ${
                  active ? "bg-[var(--primary)] text-white shadow-md" : "text-[var(--muted)] hover:bg-[var(--primary-tint)]/35 hover:text-[var(--primary)]"
                }`}
              >
                <Icon name={item.icon} size={20} />
                <span className="max-w-[4.5rem] truncate">{t(item.label).split(" ")[0]}</span>
                {item.href === "/portal/messages" && unreadMessages > 0 && (
                  <span aria-label={`${unreadMessages} unread`} className="absolute right-1 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="animate-fade-up mx-auto w-full max-w-6xl flex-1 p-4 sm:p-5">
        <AnnouncementBanner endpoint="/portal/announcements" />
        {children}
      </main>

      {/* Privacy consent gate: required once per policy version */}
      <Modal
        open={needsConsent}
        onClose={() => {}}
        title={t("Privacy policy")}
        footer={
          <>
            <button onClick={logout} className={btnGhost}>{t("Sign out")}</button>
            <button onClick={acceptPolicy} disabled={accepting} className={btnPrimary}>{t("Accept and continue")}</button>
          </>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
          <p>Dr&apos;Bloom keeps your health information private and uses it only to provide your care, run appointments and billing, and meet legal duties.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Only you and the clinicians treating you can open your records.</li>
            <li>Every time staff view or change your record, it is logged.</li>
            <li>You can download your data or ask for deletion anytime in Settings → Privacy &amp; data.</li>
          </ul>
          <p className="text-xs text-[var(--muted)]">Policy version {policyVersion || "—"}. Your acceptance is recorded with the date and version.</p>
          {consentErr && <Notice kind="error">{consentErr}</Notice>}
        </div>
      </Modal>

      <Modal
        open={idle.warning}
        onClose={idle.stay}
        title={t("You will be signed out soon")}
        footer={
          <>
            <button onClick={logout} className={btnGhost}>{t("Sign out")}</button>
            <button onClick={idle.stay} data-autofocus className={btnPrimary}>{t("Stay signed in")}</button>
          </>
        }
      >
        <p className="text-sm">For your privacy we sign you out after a period of inactivity. Signing out in <strong>{idle.secondsLeft}s</strong>.</p>
      </Modal>
    </div>
  );
}
