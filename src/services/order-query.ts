import type { Sql } from "@/lib/db";
import type { Order, OrderFilters, OrderListItem, Paged, SummaryKpis } from "@/lib/types";
import {
  mapOrder,
  mapOrderItem,
  mapOrderListItem,
  ORDER_SELECT,
  type OrderItemRow,
  type OrderRow,
} from "./db-map";

export async function loadItems(
  sql: Sql,
  orderIds: string[],
  userId: string,
): Promise<Map<string, ReturnType<typeof mapOrderItem>[]>> {
  const map = new Map<string, ReturnType<typeof mapOrderItem>[]>();
  if (orderIds.length === 0) return map;
  const placeholders = orderIds.map((_, i) => `$${i + 2}`).join(",");
  const rows = await sql.query<OrderItemRow>(
    `select oi.id, oi.order_id, oi.work_type_id, wt.name as work_type_name,
            oi.quantity, oi.unit_price, oi.created_at
     from order_items oi
     join work_types wt on wt.id = oi.work_type_id and wt.user_id = oi.user_id
     where oi.user_id = $1 and oi.order_id in (${placeholders})
     order by oi.created_at`,
    [userId, ...orderIds],
  );
  for (const row of rows) {
    const item = mapOrderItem(row);
    const list = map.get(item.orderId) ?? [];
    list.push(item);
    map.set(item.orderId, list);
  }
  return map;
}

export function buildWhere(filters: OrderFilters, userId: string) {
  const where: string[] = ["o.user_id = $1", "o.created_at >= $2", "o.created_at <= $3"];
  const params: unknown[] = [userId, filters.from, filters.to];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };
  if (filters.doctorId) add("o.doctor_id = ?", filters.doctorId);
  if (filters.colorId) add("o.color_id = ?", filters.colorId);
  if (filters.workTypeId) {
    add(
      `exists (select 1 from order_items oi where oi.order_id = o.id and oi.user_id = $1 and oi.work_type_id = ?)`,
      filters.workTypeId,
    );
  }
  let search = false;
  if (filters.q && filters.q.trim()) {
    search = true;
    const q = `%${filters.q.trim()}%`;
    params.push(q, q, q, q);
    const a = params.length - 3;
    const b = params.length - 2;
    const c = params.length - 1;
    const d = params.length;
    where.push(
      `(o.order_number ilike $${a} or d.name ilike $${b} or p.name ilike $${c}
        or exists (
          select 1 from order_items oi
          join work_types wt on wt.id = oi.work_type_id and wt.user_id = oi.user_id
          where oi.order_id = o.id and oi.user_id = $1 and wt.name ilike $${d}
        ))`,
    );
  }
  return { where: where.join(" and "), params, search };
}

export async function queryOrders(
  sql: Sql,
  filters: OrderFilters,
  userId: string,
): Promise<Paged<OrderListItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, filters.pageSize ?? 20));
  const { where, params } = buildWhere(filters, userId);
  const offset = (page - 1) * pageSize;
  const rows = await sql.query<OrderRow & { full_count: number }>(
    `select ${ORDER_SELECT}, count(*) over()::int as full_count
     from orders o
     join doctors d on d.id = o.doctor_id and d.user_id = o.user_id
     join patients p on p.id = o.patient_id and p.user_id = o.user_id
     left join colors c on c.id = o.color_id and c.user_id = o.user_id
     where ${where}
     order by o.created_at desc
     limit ${pageSize} offset ${offset}`,
    params,
  );
  const total = rows[0]?.full_count ?? 0;
  const itemsMap = await loadItems(
    sql,
    rows.map((r) => r.id),
    userId,
  );
  return {
    items: rows.map((row) => mapOrderListItem(row, itemsMap.get(row.id) ?? [])),
    total,
    page,
    pageSize,
  };
}

export async function queryKpis(
  sql: Sql,
  filters: OrderFilters,
  userId: string,
): Promise<SummaryKpis> {
  const { where, params, search } = buildWhere(filters, userId);
  const nameJoins = search
    ? `join doctors d on d.id = o.doctor_id and d.user_id = o.user_id
       join patients p on p.id = o.patient_id and p.user_id = o.user_id
       left join colors c on c.id = o.color_id and c.user_id = o.user_id`
    : "";
  const rows = await sql.query<{
    orders: number;
    doctors: number;
    units: number;
    revenue: number;
  }>(
    `select
        count(distinct o.id)::int as orders,
        count(distinct o.doctor_id)::int as doctors,
        coalesce(sum(oi.quantity), 0)::int as units,
        coalesce(sum(oi.quantity * oi.unit_price), 0)::int as revenue
     from orders o
     ${nameJoins}
     left join order_items oi on oi.order_id = o.id and oi.user_id = o.user_id
     where ${where}`,
    params,
  );
  const row = rows[0];
  return {
    orders: row?.orders ?? 0,
    doctors: row?.doctors ?? 0,
    units: row?.units ?? 0,
    revenue: row?.revenue ?? 0,
  };
}

export async function loadOrder(sql: Sql, id: string, userId: string): Promise<Order | null> {
  const rows = await sql.query<OrderRow>(
    `select ${ORDER_SELECT}
     from orders o
     join doctors d on d.id = o.doctor_id and d.user_id = o.user_id
     join patients p on p.id = o.patient_id and p.user_id = o.user_id
     left join colors c on c.id = o.color_id and c.user_id = o.user_id
     where o.id = $1 and o.user_id = $2`,
    [id, userId],
  );
  const row = rows[0];
  if (!row) return null;
  const items = await loadItems(sql, [id], userId);
  return mapOrder(row, items.get(id) ?? []);
}
