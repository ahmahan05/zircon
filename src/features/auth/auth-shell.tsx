import type { ReactNode } from "react";

export function AuthShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 pb-24 text-foreground">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <AtelierMark />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">Atelier</div>
            <div className="text-sm text-muted-foreground">Журнал работ зубного техника</div>
          </div>
        </div>
        <section className="surface-card rounded-3xl bg-card p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthOpening() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <AtelierMark />
        </div>
        <p className="text-sm text-muted-foreground">Открываем журнал…</p>
      </div>
    </main>
  );
}

export function AtelierMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 5h10a1.5 1.5 0 0 1 1.5 1.5v5.2C18.5 16 16 19 12 19s-6.5-3-6.5-7.3V6.5A1.5 1.5 0 0 1 7 5zm2 2.5v4.8c0 2.1 1.1 3.6 3 3.6s3-1.5 3-3.6V7.5H9z"
      />
    </svg>
  );
}
