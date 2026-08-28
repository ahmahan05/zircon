import { minorToMajor } from "./money.ts";
import type { CurrencyCode, DateFormat, ExportPayload, Language } from "./types.ts";
import { formatDate } from "./format.ts";

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function filterExportByMonth(
  data: ExportPayload["data"],
  month?: string,
): ExportPayload["data"] {
  if (!month || month === "all") return data;
  const orders = data.orders.filter((order) => monthKey(order.created_at) === month);
  const ids = new Set(orders.map((order) => order.id));
  return {
    ...data,
    orders,
    order_items: data.order_items.filter((item) => ids.has(item.order_id)),
  };
}

export function listMonthsFromOrders(
  orders: Array<{ created_at: string }>,
): Array<{ key: string; orders: number }> {
  const map = new Map<string, number>();
  for (const order of orders) {
    const key = monthKey(order.created_at);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, orders: count }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildOrdersCsv(data: ExportPayload["data"]): string {
  const header = [
    "Номер",
    "Врач",
    "Пациент",
    "Цвет",
    "Дата",
    "Вид работы",
    "Количество",
    "Цена",
    "Сумма",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const row of buildJournalRows(data)) {
    lines.push(
      [
        row.orderNumber,
        row.doctor,
        row.patient,
        row.color,
        row.dateIso,
        row.workType,
        row.quantity,
        row.unitPriceMajor,
        row.amountMajor,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

export interface JournalRow {
  dateIso: string;
  orderNumber: string;
  doctor: string;
  patient: string;
  color: string;
  workType: string;
  quantity: number;
  unitPriceMinor: number;
  unitPriceMajor: number;
  amountMinor: number;
  amountMajor: number;
  notes: string;
}

export function buildJournalRows(data: ExportPayload["data"]): JournalRow[] {
  const doctorName = Object.fromEntries(data.doctors.map((d) => [d.id, d.name]));
  const patientName = Object.fromEntries(data.patients.map((p) => [p.id, p.name]));
  const colorName = Object.fromEntries(data.colors.map((c) => [c.id, c.name]));
  const workName = Object.fromEntries(data.work_types.map((w) => [w.id, w.name]));
  const orderById = Object.fromEntries(data.orders.map((o) => [o.id, o]));
  const rows: JournalRow[] = [];
  const items = [...data.order_items].sort((a, b) => {
    const oa = orderById[a.order_id];
    const ob = orderById[b.order_id];
    const da = oa?.created_at ?? "";
    const db = ob?.created_at ?? "";
    if (da !== db) return da.localeCompare(db);
    const na = oa?.order_number ?? "";
    const nb = ob?.order_number ?? "";
    if (na !== nb) return na.localeCompare(nb, undefined, { numeric: true });
    return (workName[a.work_type_id] ?? "").localeCompare(workName[b.work_type_id] ?? "");
  });
  for (const item of items) {
    const order = orderById[item.order_id];
    if (!order) continue;
    const amountMinor = item.quantity * item.unit_price;
    rows.push({
      dateIso: order.created_at.slice(0, 10),
      orderNumber: order.order_number,
      doctor: doctorName[order.doctor_id] ?? "",
      patient: patientName[order.patient_id] ?? "",
      color: order.color_id ? (colorName[order.color_id] ?? "") : "",
      workType: workName[item.work_type_id] ?? "",
      quantity: item.quantity,
      unitPriceMinor: item.unit_price,
      unitPriceMajor: minorToMajor(item.unit_price),
      amountMinor,
      amountMajor: minorToMajor(amountMinor),
      notes: order.notes ?? "",
    });
  }
  return rows;
}

export interface NamedTotal {
  name: string;
  orders: number;
  units: number;
  amountMajor: number;
}

export function buildDoctorTotals(data: ExportPayload["data"]): NamedTotal[] {
  const doctorName = Object.fromEntries(data.doctors.map((d) => [d.id, d.name]));
  const orderById = Object.fromEntries(data.orders.map((o) => [o.id, o]));
  const map = new Map<string, { orders: Set<string>; units: number; amount: number }>();
  for (const item of data.order_items) {
    const order = orderById[item.order_id];
    if (!order) continue;
    const key = order.doctor_id;
    const row = map.get(key) ?? { orders: new Set<string>(), units: 0, amount: 0 };
    row.orders.add(order.id);
    row.units += item.quantity;
    row.amount += item.quantity * item.unit_price;
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([id, row]) => ({
      name: doctorName[id] ?? "",
      orders: row.orders.size,
      units: row.units,
      amountMajor: minorToMajor(row.amount),
    }))
    .sort((a, b) => b.amountMajor - a.amountMajor || a.name.localeCompare(b.name, "ru"));
}

export function buildWorkTotals(data: ExportPayload["data"]): NamedTotal[] {
  const workName = Object.fromEntries(data.work_types.map((w) => [w.id, w.name]));
  const orderById = Object.fromEntries(data.orders.map((o) => [o.id, o]));
  const map = new Map<string, { orders: Set<string>; units: number; amount: number }>();
  for (const item of data.order_items) {
    const order = orderById[item.order_id];
    if (!order) continue;
    const row = map.get(item.work_type_id) ?? { orders: new Set<string>(), units: 0, amount: 0 };
    row.orders.add(order.id);
    row.units += item.quantity;
    row.amount += item.quantity * item.unit_price;
    map.set(item.work_type_id, row);
  }
  return [...map.entries()]
    .map(([id, row]) => ({
      name: workName[id] ?? "",
      orders: row.orders.size,
      units: row.units,
      amountMajor: minorToMajor(row.amount),
    }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name, "ru"));
}

export interface ExportSummary {
  periodLabel: string;
  orders: number;
  units: number;
  amountMajor: number;
  averageCheckMajor: number;
  doctors: number;
  workTypes: number;
}

export function buildExportSummary(
  data: ExportPayload["data"],
  month: string | undefined,
  lang: Language,
): ExportSummary {
  const rows = buildJournalRows(data);
  const units = rows.reduce((sum, row) => sum + row.quantity, 0);
  const amountMajor = rows.reduce((sum, row) => sum + row.amountMajor, 0);
  const orderIds = new Set(data.orders.map((o) => o.id));
  return {
    periodLabel: monthLabel(month, lang),
    orders: orderIds.size,
    units,
    amountMajor,
    averageCheckMajor: orderIds.size > 0 ? amountMajor / orderIds.size : 0,
    doctors: new Set(data.orders.map((o) => o.doctor_id)).size,
    workTypes: new Set(data.order_items.map((i) => i.work_type_id)).size,
  };
}

export function monthLabel(month: string | undefined, lang: Language): string {
  if (!month || month === "all") return lang === "en" ? "All orders" : "Все наряды";
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  const raw = new Date(year, m - 1, 1).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatJournalDate(iso: string, dateFormat: DateFormat): string {
  return formatDate(`${iso}T00:00:00.000Z`, dateFormat);
}

export function exportFilename(kind: "json" | "csv" | "xlsx", month?: string): string {
  if (month && month !== "all") return `atelier-${month}.${kind}`;
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "json") return `atelier-backup-${day}.json`;
  if (kind === "xlsx") return `atelier-journal-${day}.xlsx`;
  return `atelier-orders-${day}.csv`;
}

export type ExcelCopy = {
  journal: string;
  doctors: string;
  works: string;
  summary: string;
  period: string;
  date: string;
  number: string;
  doctor: string;
  patient: string;
  color: string;
  workType: string;
  qty: string;
  price: string;
  amount: string;
  notes: string;
  orders: string;
  units: string;
  earned: string;
  average: string;
  doctorsCount: string;
  workTypesCount: string;
  empty: string;
  currency: CurrencyCode;
  language: Language;
  dateFormat: DateFormat;
};
