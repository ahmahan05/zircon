export interface CalcItem {
  quantity: number;
  unitPrice: number;
}

export function calculateLineTotal(item: CalcItem): number {
  const qty = Math.max(0, Math.trunc(item.quantity));
  const price = Math.max(0, Math.trunc(item.unitPrice));
  return qty * price;
}

export function calculateOrderTotal(items: readonly CalcItem[]): number {
  let total = 0;
  for (const item of items) total += calculateLineTotal(item);
  return total;
}

export function calculateOrderUnits(items: readonly CalcItem[]): number {
  let units = 0;
  for (const item of items) units += Math.max(0, Math.trunc(item.quantity));
  return units;
}

export function summarizeItems(
  items: readonly { workTypeName: string; quantity: number }[],
): string {
  return items
    .map((item) => `${shortWorkName(item.workTypeName)} ×${item.quantity}`)
    .join(", ");
}

export function shortWorkName(name: string): string {
  const map: Record<string, string> = {
    "П/А базовый": "П/А баз.",
    "П/А стандарт": "П/А ст.",
    "П/А вип": "П/А вип",
    "Циркон базовый": "Циркон баз.",
    "Циркон стандарт": "Циркон ст.",
    "Циркон вип": "Циркон вип",
    "Мк культя": "МК культя",
    "Мк имплант": "МК импл.",
    "Временная коронка стандарт": "Врем. коронка",
    "Прикусной на жесткой": "Прикусной",
  };
  return map[name] ?? name;
}

export function nextOrderNumber(existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    const n = Number.parseInt(value.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1 || 1);
}
