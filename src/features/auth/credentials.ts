import { authClient } from "@/lib/auth/client";
import { dropLeftoverSession, unlockJournal } from "./session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthKind = "signin" | "signup";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateCredentials(
  kind: AuthKind,
  input: { name?: string; email: string; password: string; confirm?: string },
): string | null {
  const email = normalizeEmail(input.email);
  if (kind === "signup" && !input.name?.trim()) return "Укажите имя.";
  if (!email) return "Укажите почту.";
  if (!EMAIL_RE.test(email)) return "Проверьте адрес почты.";
  if (!input.password) {
    return kind === "signup" ? "Придумайте пароль — не меньше 8 символов." : "Введите пароль.";
  }
  if (input.password.length < 8) return "Пароль должен быть не короче 8 символов.";
  if (kind === "signup") {
    if (!input.name?.trim()) return "Укажите имя.";
    if (input.confirm !== input.password) return "Пароли не совпадают.";
  }
  return null;
}

async function assertSessionEmail(expected: string): Promise<void> {
  const session = await authClient.getSession();
  const signed = session.data?.user?.email?.toLowerCase() ?? "";
  if (signed && signed !== expected) {
    await dropLeftoverSession();
    throw new Error("Неверная почта или пароль.");
  }
}

export async function signInWithPassword(emailRaw: string, password: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const problem = validateCredentials("signin", { email, password });
  if (problem) throw new Error(problem);

  await dropLeftoverSession();

  const { error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message ?? "Не удалось войти.");

  await assertSessionEmail(email);
  unlockJournal();
}

export async function signUpWithPassword(
  nameRaw: string,
  emailRaw: string,
  password: string,
  confirm: string,
): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const name = nameRaw.trim() || email.split("@")[0] || "Техник";
  const problem = validateCredentials("signup", { name, email, password, confirm });
  if (problem) throw new Error(problem);

  await dropLeftoverSession();

  const { error } = await authClient.signUp.email({ name, email, password });
  if (error) throw new Error(error.message ?? "Не удалось зарегистрироваться.");

  await assertSessionEmail(email);
  unlockJournal();
}

export function friendlyAuthError(err: unknown, kind: AuthKind): string {
  const message = err instanceof Error ? err.message : "";
  if (
    message.startsWith("Укажите") ||
    message.startsWith("Проверьте") ||
    message.startsWith("Введите") ||
    message.startsWith("Придумайте") ||
    message.startsWith("Парол") ||
    message.startsWith("Неверная")
  ) {
    return message;
  }
  const lower = message.toLowerCase();
  if (lower.includes("invalid") && lower.includes("password")) {
    return kind === "signin" ? "Неверная почта или пароль." : "Пароль должен быть не короче 8 символов.";
  }
  if (lower.includes("already") || lower.includes("exists") || lower.includes("user already")) {
    return "Этот адрес уже занят. Войдите или укажите другую почту.";
  }
  if (lower.includes("invalid email")) {
    return kind === "signup"
      ? "Этот адрес уже занят. Войдите или укажите другую почту."
      : "Неверная почта или пароль.";
  }
  if (lower.includes("too small") || (lower.includes("password") && kind === "signup")) {
    return "Пароль должен быть не короче 8 символов.";
  }
  return message || (kind === "signup" ? "Не удалось зарегистрироваться." : "Не удалось войти.");
}
