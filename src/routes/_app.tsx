import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppStateProvider } from "@/features/app-state";
import { AppShell } from "@/components/layout/app-shell";
import { AuthOpening } from "@/features/auth/auth-shell";
import { useJournalUnlocked } from "@/features/auth/session";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const unlocked = useJournalUnlocked();

  if (!unlocked) return <Navigate to="/login" replace />;
  if (isPending) return <AuthOpening />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppStateProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppStateProvider>
  );
}
