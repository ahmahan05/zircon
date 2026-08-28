import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthShell, GoogleMark, XMark } from "./auth-shell";
import { friendlyAuthError, signInWithPassword } from "./credentials";
import { unlockJournal, useJournalUnlocked, wasJustSignedOut } from "./session";

export function LoginForm() {
  const { user, isPending } = useCurrentUserState();
  const unlocked = useJournalUnlocked();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | "x" | null>(null);
  const signedOut = wasJustSignedOut();

  if (!isPending && user && unlocked) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextEmail = String(form.get("email") ?? email);
    const nextPassword = String(form.get("password") ?? password);
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError(null);
    setBusy("email");
    try {
      await signInWithPassword(nextEmail, nextPassword);
      window.location.assign("/");
    } catch (err) {
      setError(friendlyAuthError(err, "signin"));
      setBusy(null);
    }
  }

  async function onProvider(providerId: string) {
    setError(null);
    setBusy(providerId.includes("google") ? "google" : "x");
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
      unlockJournal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
      setBusy(null);
    }
  }

  const locked = busy !== null;

  return (
    <AuthShell
      title={signedOut ? "Вы вышли" : "Вход"}
      hint={
        signedOut
          ? "Введите почту и пароль. Без них прошлый аккаунт не откроется."
          : "Войдите своей почтой и паролем."
      }
    >
      {authEnabled ? (
        <form className="mt-5 space-y-3" autoComplete="off" noValidate onSubmit={(e) => void onSubmit(e)}>
          <Field id="login-email" label="Почта">
            <Input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@lab.ru"
              className="h-11"
            />
          </Field>
          <Field id="login-password" label="Пароль">
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ваш пароль"
              className="h-11"
            />
          </Field>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={locked}>
            {busy === "email" ? "Входим…" : "Войти"}
          </Button>
          <p className="pt-1 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">или</span>
            <Separator className="flex-1" />
          </div>
          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="outline"
              className="h-11 w-full justify-center rounded-xl"
              disabled={locked}
              onClick={() => void onProvider(p.providerId)}
            >
              {p.providerId.includes("google") ? <GoogleMark /> : <XMark />}
              {busy === (p.providerId.includes("google") ? "google" : "x")
                ? "Открываем…"
                : `Продолжить с ${p.label}`}
            </Button>
          ))}
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Вход сейчас выключен.</p>
      )}
    </AuthShell>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
