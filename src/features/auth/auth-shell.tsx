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

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.42z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.97-.9 6.63-2.35l-3.23-2.5c-.9.6-2.04.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A10 10 0 0 0 12 22z"
      />
      <path
        fill="currentColor"
        d="M6.39 13.98A6.01 6.01 0 0 1 6.08 12c0-.69.12-1.35.31-1.98V7.44H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.56l3.33-2.58z"
      />
      <path
        fill="currentColor"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.44l3.33 2.58C7.18 7.72 9.39 5.96 12 5.96z"
      />
    </svg>
  );
}

export function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.7 10.3 21.4 2.5h-2.1l-5.6 6.5L9.2 2.5H3l7.1 10.3L3 21.5h2.1l6-7 4.8 7H22l-7.3-11.2Zm-2.1 2.5-.7-1-5.6-8h2.4l4.5 6.4.7 1 5.9 8.4h-2.4l-4.8-6.8Z"
      />
    </svg>
  );
}
