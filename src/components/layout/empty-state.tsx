import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  body,
  action,
  actionLabel,
  icon,
}: {
  title: string;
  body: string;
  action?: () => void;
  actionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="text-base font-semibold tracking-tight">{title}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && actionLabel ? (
        <Button onClick={action} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
