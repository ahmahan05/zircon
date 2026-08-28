import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/features/app-state";
import { signOutOfJournal } from "@/features/auth/session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AccountCard() {
  const { copy } = useAppState();
  const { user } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? copy.appName;

  return (
    <section className="space-y-3 md:hidden">
      <h2 className="text-base font-semibold tracking-tight">{copy.auth.account}</h2>
      <Card className="flex items-center gap-3 rounded-2xl p-4">
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-medium">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          {user.primaryEmail ? (
            <div className="truncate text-xs text-muted-foreground">{user.primaryEmail}</div>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOutOfJournal().catch(() => setSigningOut(false));
          }}
        >
          <LogOut className="size-4" />
          {signingOut ? copy.auth.signingOut : copy.auth.signOut}
        </Button>
      </Card>
    </section>
  );
}
