import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { calculateOrderTotal, calculateOrderUnits } from "@/lib/calculations/orders";
import { orderInputSchema } from "@/lib/validation/order";
import { newId } from "@/lib/utils";
import type { Sql } from "@/lib/db";
import { loadOrder, queryKpis, queryOrders } from "./order-query";
import { userDb } from "./scope";

async function nextNumberForUser(sql: Sql, userId: string): Promise<string> {
  const rows = await sql.query<{ n: number | null }>(
    `select coalesce(
       max(nullif(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::int),
       0
     ) as n
     from orders where user_id = $1`,
    [userId],
  );
  return String((rows[0]?.n ?? 0) + 1);
}

async function resolveDoctor(
  sql: Sql,
  userId: string,
  input: { doctorId?: string; doctorName?: string },
): Promise<string> {
  if (input.doctorId) {
    const found = await sql.query<{ id: string }>(
      "select id from doctors where id = $1 and user_id = $2",
      [input.doctorId, userId],
    );
    if (found[0]) return found[0].id;
  }
  const name = input.doctorName?.trim();
  if (!name) throw new Error("Выберите врача");
  const existing = await sql.query<{ id: string }>(
    "select id from doctors where user_id = $1 and lower(name) = lower($2) limit 1",
    [userId, name],
  );
  if (existing[0]) return existing[0].id;
  const id = newId();
  const now = new Date().toISOString();
  await sql.query(
    `insert into doctors (id, user_id, name, created_at, updated_at) values ($1, $2, $3, $4, $4)`,
    [id, userId, name, now],
  );
  return id;
}

async function resolvePatient(sql: Sql, userId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await sql.query<{ id: string }>(
    "select id from patients where user_id = $1 and lower(name) = lower($2) limit 1",
    [userId, trimmed],
  );
  if (existing[0]) return existing[0].id;
  const id = newId();
  const now = new Date().toISOString();
  await sql.query(
    `insert into patients (id, user_id, name, created_at, updated_at) values ($1, $2, $3, $4, $4)`,
    [id, userId, trimmed, now],
  );
  return id;
}

async function replaceItems(
  sql: Sql,
  userId: string,
  orderId: string,
  items: Array<{ workTypeId: string; quantity: number; unitPrice: number }>,
) {
  await sql.query("delete from order_items where order_id = $1 and user_id = $2", [orderId, userId]);
  const now = new Date().toISOString();
  for (const item of items) {
    await sql.query(
      `insert into order_items (id, user_id, order_id, work_type_id, quantity, unit_price, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [newId(), userId, orderId, item.workTypeId, item.quantity, item.unitPrice, now],
    );
  }
}

const filterSchema = z.object({
  from: z.string(),
  to: z.string(),
  doctorId: z.string().optional(),
  workTypeId: z.string().optional(),
  colorId: z.string().optional(),
  q: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const listOrders = createServerFn({ method: "GET" })
  .validator((input: unknown) => filterSchema.parse(input ?? {}))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    return queryOrders(sql, data, context.userId);
  });

export const getSummaryKpis = createServerFn({ method: "GET" })
  .validator((input: unknown) => filterSchema.parse(input ?? {}))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    return queryKpis(sql, data, context.userId);
  });

export const getOrder = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    return loadOrder(sql, data.id, context.userId);
  });

export const getNextOrderNumber = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await userDb(context.userId);
    return nextNumberForUser(sql, context.userId);
  });

export const saveOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        payload: orderInputSchema,
      })
      .parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    try {
      const sql = await userDb(context.userId);
      const payload = data.payload;
      const doctorId = await resolveDoctor(sql, context.userId, {
        doctorId: payload.doctorId,
        doctorName: payload.doctorName,
      });
      const patientId = await resolvePatient(sql, context.userId, payload.patientName);
      const now = new Date().toISOString();

      if (data.id) {
        const existing = await loadOrder(sql, data.id, context.userId);
        if (!existing) throw new Error("Наряд не найден");
        await sql.query(
          `update orders set
             order_number = $3, doctor_id = $4, patient_id = $5, color_id = $6,
             notes = $7, updated_at = $8
           where id = $1 and user_id = $2`,
          [
            data.id,
            context.userId,
            payload.orderNumber,
            doctorId,
            patientId,
            payload.colorId ?? null,
            payload.notes ?? null,
            now,
          ],
        );
        await replaceItems(sql, context.userId, data.id, payload.items);
        const saved = await loadOrder(sql, data.id, context.userId);
        return {
          order: saved,
          total: saved ? calculateOrderTotal(saved.items) : 0,
          units: saved ? calculateOrderUnits(saved.items) : 0,
        };
      }

      const id = newId();
      const createdAt = payload.createdAt ?? now;
      await sql.query(
        `insert into orders (
           id, user_id, order_number, doctor_id, patient_id, color_id, notes, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
        [
          id,
          context.userId,
          payload.orderNumber,
          doctorId,
          patientId,
          payload.colorId ?? null,
          payload.notes ?? null,
          createdAt,
        ],
      );
      await replaceItems(sql, context.userId, id, payload.items);
      const saved = await loadOrder(sql, id, context.userId);
      return {
        order: saved,
        total: saved ? calculateOrderTotal(saved.items) : 0,
        units: saved ? calculateOrderUnits(saved.items) : 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить наряд";
      throw new Error(
        message.includes("не удалось") || message.includes("Выберите") || message.includes("Укажите")
          ? message
          : "Не удалось сохранить наряд. Проверьте соединение и попробуйте ещё раз.",
      );
    }
  });

export const duplicateOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const source = await loadOrder(sql, data.id, context.userId);
    if (!source) throw new Error("Наряд не найден");
    const orderNumber = await nextNumberForUser(sql, context.userId);
    const id = newId();
    const now = new Date().toISOString();
    await sql.query(
      `insert into orders (
         id, user_id, order_number, doctor_id, patient_id, color_id, notes, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        id,
        context.userId,
        orderNumber,
        source.doctorId,
        source.patientId,
        source.colorId,
        source.notes,
        now,
      ],
    );
    await replaceItems(
      sql,
      context.userId,
      id,
      source.items.map((item) => ({
        workTypeId: item.workTypeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );
    return loadOrder(sql, id, context.userId);
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const existing = await sql.query<{ id: string }>(
      "select id from orders where id = $1 and user_id = $2",
      [data.id, context.userId],
    );
    if (!existing[0]) throw new Error("Наряд не найден");
    await sql.query("delete from order_items where order_id = $1 and user_id = $2", [
      data.id,
      context.userId,
    ]);
    const deleted = await sql.query<{ id: string }>(
      "delete from orders where id = $1 and user_id = $2 returning id",
      [data.id, context.userId],
    );
    if (!deleted[0]) throw new Error("Не удалось удалить наряд");
    return { ok: true, id: data.id };
  });
