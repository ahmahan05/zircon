import { calculateOrderTotal, calculateOrderUnits } from "./orders.ts";

export interface AnalyticsOrder {
  id: string;
  doctorId: string;
  doctorName: string;
  createdAt: string;
  items: Array<{
    workTypeId: string;
    workTypeName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function getTotalWorkUnits(orders: AnalyticsOrder[]): number {
  let units = 0;
  for (const order of orders) {
    units += calculateOrderUnits(order.items);
  }
  return units;
}

export function getTotalRevenue(orders: AnalyticsOrder[]): number {
  let revenue = 0;
  for (const order of orders) {
    revenue += calculateOrderTotal(order.items);
  }
  return revenue;
}

export function getAverageOrderRevenue(orders: AnalyticsOrder[]): number {
  if (orders.length === 0) return 0;
  return Math.round(getTotalRevenue(orders) / orders.length);
}

export function getWorkCountByType(
  orders: AnalyticsOrder[],
): Array<{
  workTypeId: string;
  name: string;
  units: number;
  revenue: number;
  percent: number;
}> {
  const map = new Map<string, { name: string; units: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const row = map.get(item.workTypeId) ?? {
        name: item.workTypeName,
        units: 0,
        revenue: 0,
      };
      row.units += item.quantity;
      row.revenue += item.quantity * item.unitPrice;
      map.set(item.workTypeId, row);
    }
  }
  const rows = [...map.entries()].map(([workTypeId, row]) => ({
    workTypeId,
    ...row,
  }));
  const totalUnits = rows.reduce((s, r) => s + r.units, 0) || 1;
  rows.sort((a, b) => b.units - a.units);
  return rows.map((row) => ({
    ...row,
    percent: (row.units / totalUnits) * 100,
  }));
}

export function getDoctorRanking(
  orders: AnalyticsOrder[],
  sort: "orders" | "units" | "revenue" = "revenue",
): Array<{
  doctorId: string;
  name: string;
  orders: number;
  units: number;
  revenue: number;
}> {
  const map = new Map<
    string,
    { name: string; orders: number; units: number; revenue: number }
  >();
  for (const order of orders) {
    const row = map.get(order.doctorId) ?? {
      name: order.doctorName,
      orders: 0,
      units: 0,
      revenue: 0,
    };
    row.orders += 1;
    row.units += calculateOrderUnits(order.items);
    row.revenue += calculateOrderTotal(order.items);
    map.set(order.doctorId, row);
  }
  const rows = [...map.entries()].map(([doctorId, row]) => ({
    doctorId,
    ...row,
  }));
  rows.sort((a, b) => {
    const d = b[sort] - a[sort];
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "ru");
  });
  return rows;
}

const MONTHS_RU = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

function monthBucket(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { key: iso, label: iso };
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { key, label: `${MONTHS_RU[month]} ${year}` };
}

export function getRevenueByMonth(orders: AnalyticsOrder[]): Array<{
  key: string;
  label: string;
  revenue: number;
  units: number;
  orders: number;
}> {
  const map = new Map<
    string,
    { label: string; revenue: number; units: number; orders: number }
  >();
  for (const order of orders) {
    const { key, label } = monthBucket(order.createdAt);
    const row = map.get(key) ?? { label, revenue: 0, units: 0, orders: 0 };
    row.orders += 1;
    row.units += calculateOrderUnits(order.items);
    row.revenue += calculateOrderTotal(order.items);
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getMonthlyComparison(
  current: AnalyticsOrder[],
  previous: AnalyticsOrder[],
  currentLabel: string,
  previousLabel: string,
) {
  const metric = (orders: AnalyticsOrder[]) => ({
    orders: orders.length,
    units: getTotalWorkUnits(orders),
    revenue: getTotalRevenue(orders),
  });
  const c = metric(current);
  const p = metric(previous);
  const delta = (curr: number, prev: number) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / prev) * 100;
  };
  return {
    currentLabel,
    previousLabel,
    orders: { current: c.orders, previous: p.orders, delta: delta(c.orders, p.orders) },
    units: { current: c.units, previous: p.units, delta: delta(c.units, p.units) },
    revenue: {
      current: c.revenue,
      previous: p.revenue,
      delta: delta(c.revenue, p.revenue),
    },
  };
}
