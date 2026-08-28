import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  getAverageOrderRevenue,
  getDoctorRanking,
  getMonthlyComparison,
  getRevenueByMonth,
  getTotalRevenue,
  getTotalWorkUnits,
  getWorkCountByType,
  type AnalyticsOrder,
} from "@/lib/calculations/analytics";
import type { AnalyticsKpis, DoctorSort } from "@/lib/types";
import { iso, ORDER_SELECT, type OrderRow } from "./db-map";
import { loadItems } from "./order-query";
import { userDb } from "./scope";
import type { Sql } from "@/lib/db";

async function loadAnalyticsOrders(
  sql: Sql,
  userId: string,
  from: string,
  to: string,
  extra?: {
    doctorId?: string;
    workTypeId?: string;
  },
): Promise<AnalyticsOrder[]> {
  const where = ["o.user_id = $1", "o.created_at >= $2", "o.created_at <= $3"];
  const params: unknown[] = [userId, from, to];
  if (extra?.doctorId) {
    params.push(extra.doctorId);
    where.push(`o.doctor_id = $${params.length}`);
  }
  if (extra?.workTypeId) {
    params.push(extra.workTypeId);
    where.push(
      `exists (select 1 from order_items oi where oi.order_id = o.id and oi.user_id = $1 and oi.work_type_id = $${params.length})`,
    );
  }
  const rows = await sql.query<OrderRow>(
    `select ${ORDER_SELECT}
     from orders o
     join doctors d on d.id = o.doctor_id and d.user_id = o.user_id
     join patients p on p.id = o.patient_id and p.user_id = o.user_id
     left join colors c on c.id = o.color_id and c.user_id = o.user_id
     where ${where.join(" and ")}`,
    params,
  );
  if (rows.length === 0) return [];
  const grouped = await loadItems(
    sql,
    rows.map((r) => r.id),
    userId,
  );
  return rows.map((row) => {
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
}

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
  previousFrom: z.string(),
  previousTo: z.string(),
  currentLabel: z.string(),
  previousLabel: z.string(),
  doctorId: z.string().optional(),
  workTypeId: z.string().optional(),
  doctorSort: z.enum(["orders", "units", "revenue"]).optional(),
});

export const getAnalytics = createServerFn({ method: "GET" })
  .validator((input: unknown) => querySchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const extra = { doctorId: data.doctorId, workTypeId: data.workTypeId };
    const [current, previous] = await Promise.all([
      loadAnalyticsOrders(sql, context.userId, data.from, data.to, extra),
      loadAnalyticsOrders(sql, context.userId, data.previousFrom, data.previousTo, extra),
    ]);
    const doctorSort: DoctorSort = data.doctorSort ?? "revenue";
    const kpis: AnalyticsKpis = {
      orders: current.length,
      units: getTotalWorkUnits(current),
      revenue: getTotalRevenue(current),
      averageOrder: getAverageOrderRevenue(current),
    };
    return {
      kpis,
      series: getRevenueByMonth(current),
      workTypes: getWorkCountByType(current),
      doctors: getDoctorRanking(current, doctorSort),
      comparison: getMonthlyComparison(
        current,
        previous,
        data.currentLabel,
        data.previousLabel,
      ),
    };
  });
