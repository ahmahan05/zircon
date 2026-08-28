import type { QueryClient } from "@tanstack/react-query";
import type { AppSettings, Lookups } from "@/lib/types";

export const journalKeys = {
  lookups: ["lookups"] as const,
  orders: ["orders"] as const,
  kpis: ["kpis"] as const,
  analytics: ["analytics"] as const,
  doctors: ["doctors"] as const,
  doctor: (id?: string) => (id ? (["doctor", id] as const) : (["doctor"] as const)),
  order: (id?: string) => (id ? (["order", id] as const) : (["order"] as const)),
  nextNumber: ["next-order-number"] as const,
  exportMonths: ["export-months"] as const,
};

const JOURNAL_ROOTS: Set<string> = new Set([
  journalKeys.orders[0],
  journalKeys.kpis[0],
  journalKeys.analytics[0],
  journalKeys.doctors[0],
  journalKeys.doctor()[0],
  journalKeys.lookups[0],
  journalKeys.nextNumber[0],
  journalKeys.order()[0],
  journalKeys.exportMonths[0],
]);

export async function invalidateJournal(queryClient: QueryClient, orderId?: string) {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === "string" && JOURNAL_ROOTS.has(root);
    },
  });
  if (orderId) {
    await queryClient.invalidateQueries({ queryKey: journalKeys.order(orderId) });
  }
}

export function patchLookupsSettings(queryClient: QueryClient, settings: AppSettings) {
  queryClient.setQueryData<Lookups>(journalKeys.lookups, (current) =>
    current ? { ...current, settings } : current,
  );
}
