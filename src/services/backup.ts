import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { buildExportEnvelope, parseExportPayload, previewImport } from "@/lib/validation/import";
import {
  buildOrdersCsv,
  exportFilename,
  filterExportByMonth,
  listMonthsFromOrders,
} from "@/lib/backup-format";
import type { CurrencyCode, DateFormat, ExportPayload, ImportPreview, Language } from "@/lib/types";
import { newId } from "@/lib/utils";
import { iso, asInt, asBool } from "./db-map";
import { userDb } from "./scope";
import { seedForUser, invalidateSeed } from "./seed";
import { loadSettings } from "./lookups";
import type { Sql } from "@/lib/db";

type BackupFile = Extract<ReturnType<typeof parseExportPayload>, { ok: true }>["data"];

const monthSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

async function snapshot(sql: Sql, userId: string, month?: string): Promise<ExportPayload> {
  const [doctors, patients, workTypes, colors, orders, items, settings] = await Promise.all([
    sql.query<Record<string, unknown>>(
      "select * from doctors where user_id = $1 order by name",
      [userId],
    ),
    sql.query<Record<string, unknown>>(
      "select * from patients where user_id = $1 order by name",
      [userId],
    ),
    sql.query<Record<string, unknown>>(
      "select * from work_types where user_id = $1 order by sort_order",
      [userId],
    ),
    sql.query<Record<string, unknown>>(
      "select * from colors where user_id = $1 order by sort_order",
      [userId],
    ),
    sql.query<Record<string, unknown>>(
      "select * from orders where user_id = $1 order by created_at",
      [userId],
    ),
    sql.query<Record<string, unknown>>(
      "select * from order_items where user_id = $1 order by created_at",
      [userId],
    ),
    sql.query<{ key: string; value: string }>(
      "select key, value from app_settings where user_id = $1",
      [userId],
    ),
  ]);
  const data = filterExportByMonth(
    {
      doctors: doctors.map((d) => ({
        id: String(d.id),
        name: String(d.name),
        phone: (d.phone as string | null) ?? null,
        notes: (d.notes as string | null) ?? null,
        created_at: iso(d.created_at),
        updated_at: iso(d.updated_at),
      })),
      patients: patients.map((p) => ({
        id: String(p.id),
        name: String(p.name),
        notes: (p.notes as string | null) ?? null,
        created_at: iso(p.created_at),
        updated_at: iso(p.updated_at),
      })),
      work_types: workTypes.map((w) => ({
        id: String(w.id),
        name: String(w.name),
        default_price: asInt(w.default_price),
        description: (w.description as string | null) ?? null,
        is_active: asBool(w.is_active),
        sort_order: asInt(w.sort_order),
        created_at: iso(w.created_at),
        updated_at: iso(w.updated_at),
      })),
      colors: colors.map((c) => ({
        id: String(c.id),
        name: String(c.name),
        is_active: asBool(c.is_active),
        sort_order: asInt(c.sort_order),
        created_at: iso(c.created_at),
      })),
      orders: orders.map((o) => ({
        id: String(o.id),
        order_number: String(o.order_number),
        doctor_id: String(o.doctor_id),
        patient_id: String(o.patient_id),
        color_id: (o.color_id as string | null) ?? null,
        notes: (o.notes as string | null) ?? null,
        created_at: iso(o.created_at),
        updated_at: iso(o.updated_at),
      })),
      order_items: items.map((i) => ({
        id: String(i.id),
        order_id: String(i.order_id),
        work_type_id: String(i.work_type_id),
        quantity: asInt(i.quantity),
        unit_price: asInt(i.unit_price),
        created_at: iso(i.created_at),
      })),
      settings,
    },
    month,
  );
  return buildExportEnvelope(data);
}

export const listExportMonths = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await userDb(context.userId);
    const rows = await sql.query<{ created_at: unknown }>(
      "select created_at from orders where user_id = $1",
      [context.userId],
    );
    return listMonthsFromOrders(rows.map((row) => ({ created_at: iso(row.created_at) })));
  });

export const exportData = createServerFn({ method: "POST" })
  .validator((input: unknown) => monthSchema.parse(input ?? {}))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const payload = await snapshot(sql, context.userId, data.month);
    return {
      filename: exportFilename("json", data.month),
      json: JSON.stringify(payload, null, 2),
    };
  });

export const exportCsv = createServerFn({ method: "POST" })
  .validator((input: unknown) => monthSchema.parse(input ?? {}))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const payload = await snapshot(sql, context.userId, data.month);
    return {
      filename: exportFilename("csv", data.month),
      csv: buildOrdersCsv(payload.data),
    };
  });

export const exportExcel = createServerFn({ method: "POST" })
  .validator((input: unknown) => monthSchema.parse(input ?? {}))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const payload = await snapshot(sql, context.userId, data.month);
    const settings = await loadSettings(sql, context.userId);
    const lang: Language = settings.language;
    const { buildWorkbookBase64 } = await import("@/lib/excel-export");
    const base64 = await buildWorkbookBase64(
      payload.data,
      {
        journal: lang === "en" ? "Work journal" : "Журнал работ",
        doctors: lang === "en" ? "By doctor" : "Итоги по врачам",
        works: lang === "en" ? "By work type" : "Итоги по работам",
        summary: lang === "en" ? "Summary" : "Сводка",
        period: lang === "en" ? "Period" : "Период",
        date: lang === "en" ? "Date" : "Дата",
        number: lang === "en" ? "Order no." : "№ наряда",
        doctor: lang === "en" ? "Doctor" : "Врач",
        patient: lang === "en" ? "Patient" : "Пациент",
        color: lang === "en" ? "Shade" : "Цвет",
        workType: lang === "en" ? "Work type" : "Вид работы",
        qty: lang === "en" ? "Qty" : "Кол-во",
        price: lang === "en" ? "Price" : "Цена",
        amount: lang === "en" ? "Amount" : "Сумма",
        notes: lang === "en" ? "Notes" : "Заметки",
        orders: lang === "en" ? "Orders" : "Нарядов",
        units: lang === "en" ? "Units" : "Единиц",
        earned: lang === "en" ? "Earned" : "Заработано",
        average: lang === "en" ? "Average check" : "Средний чек",
        doctorsCount: lang === "en" ? "Doctors" : "Врачей",
        workTypesCount: lang === "en" ? "Work types" : "Видов работ",
        empty: lang === "en" ? "No work in this period." : "Нет работ за этот период.",
        currency: settings.currency as CurrencyCode,
        language: lang,
        dateFormat: settings.dateFormat as DateFormat,
      },
      data.month,
    );
    return {
      filename: exportFilename("xlsx", data.month),
      base64,
    };
  });

export const previewImportFile = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ json: z.unknown() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const parsed = parseExportPayload(data.json);
    if (!parsed.ok) throw new Error(parsed.error);
    const sql = await userDb(context.userId);
    const doctors = await sql.query<{ id: string }>(
      "select id from doctors where user_id = $1",
      [context.userId],
    );
    const orders = await sql.query<{ id: string }>(
      "select id from orders where user_id = $1",
      [context.userId],
    );
    const preview: ImportPreview = previewImport(parsed.data, {
      doctorIds: new Set(doctors.map((d) => d.id)),
      orderIds: new Set(orders.map((o) => o.id)),
    });
    return preview;
  });

async function adoptId(
  sql: Sql,
  table: "doctors" | "patients" | "work_types" | "colors" | "orders" | "order_items",
  incomingId: string,
  userId: string,
): Promise<string> {
  const rows = await sql.query<{ id: string; user_id: string }>(
    `select id, user_id from ${table} where id = $1`,
    [incomingId],
  );
  if (!rows[0]) return incomingId;
  if (rows[0].user_id === userId) return incomingId;
  return newId();
}

async function adoptNamed(
  sql: Sql,
  table: "doctors" | "patients" | "work_types" | "colors",
  incomingId: string,
  name: string,
  userId: string,
): Promise<string> {
  const byName = await sql.query<{ id: string }>(
    `select id from ${table} where user_id = $1 and lower(name) = lower($2) limit 1`,
    [userId, name],
  );
  if (byName[0]) return byName[0].id;
  return adoptId(sql, table, incomingId, userId);
}

async function upsertAll(sql: Sql, userId: string, payload: BackupFile) {
  const data = payload.data;
  const doctorMap = new Map<string, string>();
  const patientMap = new Map<string, string>();
  const workMap = new Map<string, string>();
  const colorMap = new Map<string, string>();
  const orderMap = new Map<string, string>();

  for (const d of data.doctors) {
    const id = await adoptNamed(sql, "doctors", d.id, d.name, userId);
    doctorMap.set(d.id, id);
    await sql.query(
      `insert into doctors (id, user_id, name, phone, notes, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set name = excluded.name, phone = excluded.phone,
         notes = excluded.notes, updated_at = excluded.updated_at
         where doctors.user_id = excluded.user_id`,
      [id, userId, d.name, d.phone ?? null, d.notes ?? null, d.created_at, d.updated_at ?? d.created_at],
    );
  }
  for (const p of data.patients) {
    const id = await adoptNamed(sql, "patients", p.id, p.name, userId);
    patientMap.set(p.id, id);
    await sql.query(
      `insert into patients (id, user_id, name, notes, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set name = excluded.name, notes = excluded.notes, updated_at = excluded.updated_at
         where patients.user_id = excluded.user_id`,
      [id, userId, p.name, p.notes ?? null, p.created_at, p.updated_at ?? p.created_at],
    );
  }
  for (const w of data.work_types) {
    const id = await adoptNamed(sql, "work_types", w.id, w.name, userId);
    workMap.set(w.id, id);
    await sql.query(
      `insert into work_types (id, user_id, name, default_price, description, is_active, sort_order, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set name = excluded.name, default_price = excluded.default_price,
         description = excluded.description, is_active = excluded.is_active, sort_order = excluded.sort_order,
         updated_at = excluded.updated_at
         where work_types.user_id = excluded.user_id`,
      [
        id,
        userId,
        w.name,
        w.default_price,
        w.description ?? null,
        w.is_active ?? true,
        w.sort_order ?? 0,
        w.created_at,
        w.updated_at ?? w.created_at,
      ],
    );
  }
  for (const c of data.colors) {
    const id = await adoptNamed(sql, "colors", c.id, c.name, userId);
    colorMap.set(c.id, id);
    await sql.query(
      `insert into colors (id, user_id, name, is_active, sort_order, created_at)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set name = excluded.name, is_active = excluded.is_active, sort_order = excluded.sort_order
         where colors.user_id = excluded.user_id`,
      [id, userId, c.name, c.is_active ?? true, c.sort_order ?? 0, c.created_at],
    );
  }
  for (const o of data.orders) {
    const id = await adoptId(sql, "orders", o.id, userId);
    orderMap.set(o.id, id);
    const doctorId = doctorMap.get(o.doctor_id);
    const patientId = patientMap.get(o.patient_id);
    if (!doctorId || !patientId) continue;
    await sql.query(
      `insert into orders (id, user_id, order_number, doctor_id, patient_id, color_id, notes, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set order_number = excluded.order_number, doctor_id = excluded.doctor_id,
         patient_id = excluded.patient_id, color_id = excluded.color_id,
         notes = excluded.notes, updated_at = excluded.updated_at
         where orders.user_id = excluded.user_id`,
      [
        id,
        userId,
        o.order_number,
        doctorId,
        patientId,
        o.color_id ? (colorMap.get(o.color_id) ?? null) : null,
        o.notes ?? null,
        o.created_at,
        o.updated_at ?? o.created_at,
      ],
    );
  }
  for (const i of data.order_items) {
    const id = await adoptId(sql, "order_items", i.id, userId);
    const orderId = orderMap.get(i.order_id);
    const workTypeId = workMap.get(i.work_type_id);
    if (!orderId || !workTypeId) continue;
    await sql.query(
      `insert into order_items (id, user_id, order_id, work_type_id, quantity, unit_price, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set order_id = excluded.order_id, work_type_id = excluded.work_type_id,
         quantity = excluded.quantity, unit_price = excluded.unit_price
         where order_items.user_id = excluded.user_id`,
      [id, userId, orderId, workTypeId, i.quantity, i.unit_price, i.created_at ?? new Date().toISOString()],
    );
  }
  for (const s of data.settings ?? []) {
    await sql.query(
      `insert into app_settings (user_id, key, value) values ($1,$2,$3)
       on conflict (user_id, key) do update set value = excluded.value`,
      [userId, s.key, s.value],
    );
  }
}

async function deleteUserData(sql: Sql, userId: string) {
  await sql.query("delete from order_items where user_id = $1", [userId]);
  await sql.query("delete from orders where user_id = $1", [userId]);
  await sql.query("delete from patients where user_id = $1", [userId]);
  await sql.query("delete from doctors where user_id = $1", [userId]);
  await sql.query("delete from work_types where user_id = $1", [userId]);
  await sql.query("delete from colors where user_id = $1", [userId]);
  await sql.query("delete from app_settings where user_id = $1", [userId]);
}

export const importData = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ json: z.unknown(), mode: z.enum(["merge", "replace"]) }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const parsed = parseExportPayload(data.json);
    if (!parsed.ok) throw new Error(parsed.error);
    const sql = await userDb(context.userId);
    if (data.mode === "replace") {
      await deleteUserData(sql, context.userId);
      invalidateSeed(context.userId);
    }
    await upsertAll(sql, context.userId, parsed.data);
    await seedForUser(sql, context.userId);
    return { ok: true as const };
  });
