import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { doctorInputSchema } from "@/lib/validation/order";
import type { DoctorListRow, DoctorProfile, OrderListItem } from "@/lib/types";
import { newId } from "@/lib/utils";
import {
  getDoctorRanking,
  getRevenueByMonth,
  getWorkCountByType,
  type AnalyticsOrder,
} from "@/lib/calculations/analytics";
import {
  mapDoctor,
  iso,
  mapOrderListItem,
  ORDER_SELECT,
  type DoctorRow,
  type OrderRow,
} from "./db-map";
import { loadItems } from "./order-query";
import { userDb } from "./scope";
import type { Sql } from "@/lib/db";

async function doctorOrders(
  sql: Sql,
  userId: string,
  doctorId: string,
): Promise<{
  list: OrderListItem[];
  analytics: AnalyticsOrder[];
}> {
  const rows = await sql.query<OrderRow>(
    `select ${ORDER_SELECT}
     from orders o
     join doctors d on d.id = o.doctor_id and d.user_id = o.user_id
     join patients p on p.id = o.patient_id and p.user_id = o.user_id
     left join colors c on c.id = o.color_id and c.user_id = o.user_id
     where o.user_id = $1 and o.doctor_id = $2
     order by o.created_at desc`,
    [userId, doctorId],
  );
  if (rows.length === 0) return { list: [], analytics: [] };
  const grouped = await loadItems(
    sql,
    rows.map((r) => r.id),
    userId,
  );
  const list = rows.map((row) => mapOrderListItem(row, grouped.get(row.id) ?? []));
  const analytics: AnalyticsOrder[] = rows.map((row) => {
    const items = grouped.get(row.id) ?? [];
    return {
      id: row.id,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name ?? "",
      createdAt: iso(row.created_at),
      items: items.map((item) => ({
        workTypeId: item.workTypeId,
        workTypeName: item.workTypeName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
  });
  return { list, analytics };
}

export const listDoctors = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await userDb(context.userId);
    const rows = await sql.query<
      DoctorRow & { orders: number; units: number; revenue: number; last_work_at: unknown }
    >(
      `select d.*,
          count(distinct o.id)::int as orders,
          coalesce(sum(oi.quantity), 0)::int as units,
          coalesce(sum(oi.quantity * oi.unit_price), 0)::int as revenue,
          max(o.created_at) as last_work_at
       from doctors d
       left join orders o on o.doctor_id = d.id and o.user_id = d.user_id
       left join order_items oi on oi.order_id = o.id and oi.user_id = d.user_id
       where d.user_id = $1
       group by d.id
       order by d.name`,
      [context.userId],
    );
    const result: DoctorListRow[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      orders: Number(row.orders) || 0,
      units: Number(row.units) || 0,
      revenue: Number(row.revenue) || 0,
      lastWorkAt: row.last_work_at ? String(row.last_work_at) : null,
    }));
    return result;
  });

export const getDoctorProfile = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const doctors = await sql.query<DoctorRow>(
      "select * from doctors where id = $1 and user_id = $2",
      [data.id, context.userId],
    );
    const doctor = doctors[0];
    if (!doctor) return null;
    const { list, analytics } = await doctorOrders(sql, context.userId, data.id);
    const ranking = getDoctorRanking(analytics);
    const self = ranking[0];
    const last = list[0];
    const profile: DoctorProfile = {
      doctor: mapDoctor(doctor),
      orders: self?.orders ?? 0,
      units: self?.units ?? 0,
      revenue: self?.revenue ?? 0,
      averageCheck: self && self.orders > 0 ? Math.round(self.revenue / self.orders) : 0,
      lastWorkAt: last?.createdAt ?? null,
      monthly: getRevenueByMonth(analytics),
      workTypes: getWorkCountByType(analytics),
      recentOrders: list,
    };
    return profile;
  });

export const saveDoctor = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.string().optional(), payload: doctorInputSchema }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const now = new Date().toISOString();
    if (data.id) {
      await sql.query(
        `update doctors set name = $3, phone = $4, notes = $5, updated_at = $6
         where id = $1 and user_id = $2`,
        [
          data.id,
          context.userId,
          data.payload.name,
          data.payload.phone ?? null,
          data.payload.notes ?? null,
          now,
        ],
      );
      const rows = await sql.query<DoctorRow>(
        "select * from doctors where id = $1 and user_id = $2",
        [data.id, context.userId],
      );
      return rows[0] ? mapDoctor(rows[0]) : null;
    }
    const existing = await sql.query<{ id: string }>(
      "select id from doctors where user_id = $1 and lower(name) = lower($2) limit 1",
      [context.userId, data.payload.name],
    );
    if (existing[0]) {
      const rows = await sql.query<DoctorRow>(
        "select * from doctors where id = $1 and user_id = $2",
        [existing[0].id, context.userId],
      );
      return rows[0] ? mapDoctor(rows[0]) : null;
    }
    const id = newId();
    await sql.query(
      `insert into doctors (id, user_id, name, phone, notes, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$6)`,
      [
        id,
        context.userId,
        data.payload.name,
        data.payload.phone ?? null,
        data.payload.notes ?? null,
        now,
      ],
    );
    const rows = await sql.query<DoctorRow>(
      "select * from doctors where id = $1 and user_id = $2",
      [id, context.userId],
    );
    return rows[0] ? mapDoctor(rows[0]) : null;
  });

export const deleteDoctor = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const used = await sql.query<{ n: number }>(
      "select count(*)::int as n from orders where doctor_id = $1 and user_id = $2",
      [data.id, context.userId],
    );
    if ((used[0]?.n ?? 0) > 0) {
      throw new Error("Нельзя удалить врача, у которого есть наряды.");
    }
    await sql.query("delete from doctors where id = $1 and user_id = $2", [
      data.id,
      context.userId,
    ]);
    return { ok: true };
  });
