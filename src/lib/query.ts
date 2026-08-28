import type { QueryClient } from "@tanstack/react-query";

export const journalKeys = {
  lookups: ["lookups"] as const,
  orders: ["orders"] as const,
  kpis: ["kpis"] as const,
  analytics: ["analytics"] as const,
  doctors: ["doctors"] as const,
  order: (id?: string) => (id ? (["order", id] as const) : (["order"] as const)),
  nextNumber: ["next-order-number"] as const,
};

export async function invalidateJournal(queryClient: QueryClient, orderId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: journalKeys.orders }),
    queryClient.invalidateQueries({ queryKey: journalKeys.kpis }),
    queryClient.invalidateQueries({ queryKey: journalKeys.analytics }),
    queryClient.invalidateQueries({ queryKey: journalKeys.doctors }),
    queryClient.invalidateQueries({ queryKey: journalKeys.lookups }),
    queryClient.invalidateQueries({ queryKey: journalKeys.nextNumber }),
    queryClient.invalidateQueries({ queryKey: journalKeys.order(orderId) }),
  ]);
}
