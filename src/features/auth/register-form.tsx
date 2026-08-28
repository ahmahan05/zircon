import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth-shell";
import { friendlyAuthError, signUpWithPassword } from "./credentials";
import { useJournalUnlocked } from "./session";

export function RegisterForm() {
  const { user, isPending } = useCurrentUserState();
  const unlocked = useJournalUnlocked();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user && unlocked) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextName = String(form.get("name") ?? name);
    const nextEmail = String(form.get("email") ?? email);
    const nextPassword = String(form.get("password") ?? password);
    const nextConfirm = String(form.get("confirm") ?? confirm);
    setName(nextName);
    setEmail(nextEmail);
    setPassword(nextPassword);
    setConfirm(nextConfirm);
    setError(null);
    setBusy(true);
    try {
      await signUpWithPassword(nextName, nextEmail, nextPassword, nextConfirm);
      window.location.assign("/");
    } catch (err) {
      setError(friendlyAuthError(err, "signup"));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      hint="Создайте свой аккаунт. Наряды и цены будут только ваши."
    >
      {authEnabled ? (
        <form className="mt-5 space-y-3" autoComplete="off" noValidate onSubmit={(e) => void onSubmit(e)}>
          <Field id="register-name" label="Имя">
            <Input
              id="register-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Как к вам обращаться"
              className="h-11"
            />
          </Field>
          <Field id="register-email" label="Почта">
            <Input
              id="register-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@lab.ru"
              className="h-11"
            />
          </Field>
          <Field id="register-password" label="Пароль">
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Не меньше 8 символов"
              className="h-11"
            />
          </Field>
          <Field id="register-confirm" label="Повторите пароль">
            <Input
              id="register-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ещё раз пароль"
              className="h-11"
            />
          </Field>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={busy}>
            {busy ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </Button>
          <p className="pt-1 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Войти
            </Link>
          </p>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Регистрация сейчас выключена.</p>
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
