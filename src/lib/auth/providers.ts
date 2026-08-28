/**
 * The upstream identity providers this app offers for sign-in (via the broker).
 *
 * Empty on purpose: Atelier is email/password only. The OAuth scaffolding stays
 * in `server.ts` / `client.ts` so the broker path still compiles; no Google/X
 * buttons are rendered while this list is empty.
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [];
