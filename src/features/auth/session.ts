import { useSyncExternalStore } from "react";
import { authClient, signOut } from "@/lib/auth/client";

const UNLOCK_KEY = "atelier.unlocked";
const SIGNED_OUT_KEY = "atelier.just-signed-out";
const CHANGE_EVENT = "atelier-journal-lock";

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isJournalUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function unlockJournal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNLOCK_KEY, "1");
    window.sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    /* storage unavailable */
  }
  emitChange();
}

export function lockJournal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(UNLOCK_KEY);
    window.sessionStorage.setItem(SIGNED_OUT_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  emitChange();
}

export function wasJustSignedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useJournalUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isJournalUnlocked, () => false);
}

/** Best-effort: drop any leftover Better Auth cookie/session before a new login. */
export async function dropLeftoverSession(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    /* ignore — the following sign-in must still require credentials */
  }
}

/**
 * End the journal session for real.
 *
 * Preview email/password logins have no bearer token, so `signOut()` from the
 * auth client would skip the server call and the next "Войти" would reopen the
 * last account. Always hit Better Auth first, then run the platform sign-out.
 */
export async function signOutOfJournal(): Promise<void> {
  lockJournal();
  try {
    const { error } = await authClient.signOut();
    if (error) throw new Error(error.message ?? "Sign-out failed");
  } catch (err) {
    const onPreview =
      typeof window !== "undefined" && window.location.hostname.endsWith(".grok-sandbox.com");
    if (!onPreview) throw err;
  }
  await signOut("/login");
}
