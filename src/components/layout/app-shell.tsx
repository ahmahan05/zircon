import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, ClipboardList, LogOut, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/features/app-state";
import { OrderWorkspace } from "@/features/orders/order-workspace";
import { signOutOfJournal } from "@/features/auth/session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const nav = [
  { to: "/", icon: ClipboardList, key: "summary" as const },
  { to: "/analytics", icon: BarChart3, key: "analytics" as const },
  { to: "/doctors", icon: Users, key: "doctors" as const },
  { to: "/settings", icon: Settings, key: "settings" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { copy, openCreate, focusSearch } = useAppState();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") {
        if (typing) return;
        e.preventDefault();
        openCreate();
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCreate, focusSearch]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 5h10a1.5 1.5 0 0 1 1.5 1.5v5.2C18.5 16 16 19 12 19s-6.5-3-6.5-7.3V6.5A1.5 1.5 0 0 1 7 5zm2 2.5v4.8c0 2.1 1.1 3.6 3 3.6s3-1.5 3-3.6V7.5H9z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{copy.appName}</div>
            <div className="text-xs text-muted-foreground">{copy.appTagline}</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {copy.nav[item.key]}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border px-3 py-3">
          <AccountFooter />
        </div>
      </aside>

      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-10 md:pt-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {nav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {copy.nav[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>

      <OrderWorkspace />
    </div>
  );
}

function AccountFooter() {
  const { copy } = useAppState();
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return <div className="h-12 animate-pulse rounded-xl bg-muted" />;
  }
  if (!user) return null;

  const label = user.displayName ?? user.primaryEmail ?? copy.appName;
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-xl px-1 py-1">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium leading-tight">{label}</div>
        {user.primaryEmail && user.displayName ? (
          <div className="truncate text-[11px] text-muted-foreground">{user.primaryEmail}</div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOutOfJournal().catch(() => setSigningOut(false));
        }}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-wait"
        aria-label={signingOut ? copy.auth.signingOut : copy.auth.signOut}
        title={signingOut ? copy.auth.signingOut : copy.auth.signOut}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
