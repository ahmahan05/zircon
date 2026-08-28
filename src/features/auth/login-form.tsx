import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth-shell";
import { friendlyAuthError, signInWithPassword } from "./credentials";
import { useJournalUnlocked, wasJustSignedOut } from "./session";

export function LoginForm() {
  const { user, isPending } = useCurrentUserState();
  const unlocked = useJournalUnlocked();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    try {
      await signInWithPassword(nextEmail, nextPassword);
      window.location.assign("/");
    } catch (err) {
      setError(friendlyAuthError(err, "signin"));
      setBusy(false);
    }
  }

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
          <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </Button>
          <p className="pt-1 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
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
