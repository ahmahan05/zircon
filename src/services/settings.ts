import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { colorInputSchema, workTypeInputSchema } from "@/lib/validation/order";
import { THEMES, WALLPAPERS } from "@/lib/types";
import { loadSettings } from "./lookups";
import { newId } from "@/lib/utils";
import { mapColor, mapWorkType, type ColorRow, type WorkTypeRow } from "./db-map";
import { userDb } from "./scope";

export const saveSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        language: z.enum(["ru", "en"]).optional(),
        currency: z.enum(["RUB", "USD", "EUR"]).optional(),
        dateFormat: z.enum(["dd.MM.yyyy", "yyyy-MM-dd", "MM/dd/yyyy"]).optional(),
        theme: z.enum(THEMES).optional(),
        wallpaper: z.enum(WALLPAPERS).optional(),
        wallpaperOpacity: z.number().int().min(0).max(100).optional(),
      })
      .parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const entries = Object.entries(data).filter(([, value]) => value != null);
    if (entries.length > 0) {
      const params: unknown[] = [context.userId];
      const values = entries.map(([key, value], i) => {
        const b = i * 2;
        params.push(key, String(value));
        return `($1, $${b + 2}, $${b + 3})`;
      });
      await sql.query(
        `insert into app_settings (user_id, key, value) values ${values.join(",")}
         on conflict (user_id, key) do update set value = excluded.value`,
        params,
      );
    }
    return loadSettings(sql, context.userId);
  });

export const saveWorkType = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.string().optional(), payload: workTypeInputSchema }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const now = new Date().toISOString();
    const clash = await sql.query<{ id: string }>(
      "select id from work_types where user_id = $1 and lower(name) = lower($2) and id <> $3 limit 1",
      [context.userId, data.payload.name, data.id ?? ""],
    );
    if (clash[0]) throw new Error("WORK_TYPE_EXISTS");
    if (data.id) {
      await sql.query(
        `update work_types set name = $3, default_price = $4, description = $5,
           is_active = coalesce($6, is_active), updated_at = $7
         where id = $1 and user_id = $2`,
        [
          data.id,
          context.userId,
          data.payload.name,
          data.payload.defaultPrice,
          data.payload.description ?? null,
          data.payload.isActive ?? null,
          now,
        ],
      );
      const rows = await sql.query<WorkTypeRow>(
        "select * from work_types where id = $1 and user_id = $2",
        [data.id, context.userId],
      );
      return rows[0] ? mapWorkType(rows[0]) : null;
    }
    const max = await sql.query<{ n: number }>(
      "select coalesce(max(sort_order), 0)::int as n from work_types where user_id = $1",
      [context.userId],
    );
    const id = newId();
    await sql.query(
      `insert into work_types (id, user_id, name, default_price, description, is_active, sort_order, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        id,
        context.userId,
        data.payload.name,
        data.payload.defaultPrice,
        data.payload.description ?? null,
        data.payload.isActive ?? true,
        (max[0]?.n ?? 0) + 1,
        now,
      ],
    );
    const rows = await sql.query<WorkTypeRow>(
      "select * from work_types where id = $1 and user_id = $2",
      [id, context.userId],
    );
    return rows[0] ? mapWorkType(rows[0]) : null;
  });

export const archiveWorkType = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.string(), isActive: z.boolean() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    await sql.query(
      "update work_types set is_active = $3, updated_at = $4 where id = $1 and user_id = $2",
      [data.id, context.userId, data.isActive, new Date().toISOString()],
    );
    return { ok: true };
  });

export const deleteWorkType = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const used = await sql.query<{ n: number }>(
      "select count(*)::int as n from order_items where work_type_id = $1 and user_id = $2",
      [data.id, context.userId],
    );
    if ((used[0]?.n ?? 0) > 0) {
      await sql.query(
        "update work_types set is_active = false, updated_at = $3 where id = $1 and user_id = $2",
        [data.id, context.userId, new Date().toISOString()],
      );
      return { archived: true };
    }
    await sql.query("delete from work_types where id = $1 and user_id = $2", [
      data.id,
      context.userId,
    ]);
    return { archived: false };
  });

export const saveColor = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.string().optional(), payload: colorInputSchema }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    if (data.id) {
      await sql.query(
        "update colors set name = $3, is_active = coalesce($4, is_active) where id = $1 and user_id = $2",
        [data.id, context.userId, data.payload.name, data.payload.isActive ?? null],
      );
      const rows = await sql.query<ColorRow>(
        "select * from colors where id = $1 and user_id = $2",
        [data.id, context.userId],
      );
      return rows[0] ? mapColor(rows[0]) : null;
    }
    const max = await sql.query<{ n: number }>(
      "select coalesce(max(sort_order), 0)::int as n from colors where user_id = $1",
      [context.userId],
    );
    const id = newId();
    await sql.query(
      `insert into colors (id, user_id, name, is_active, sort_order, created_at) values ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        context.userId,
        data.payload.name,
        data.payload.isActive ?? true,
        (max[0]?.n ?? 0) + 1,
        new Date().toISOString(),
      ],
    );
    const rows = await sql.query<ColorRow>(
      "select * from colors where id = $1 and user_id = $2",
      [id, context.userId],
    );
    return rows[0] ? mapColor(rows[0]) : null;
  });

export const deleteColor = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await userDb(context.userId);
    const used = await sql.query<{ n: number }>(
      "select count(*)::int as n from orders where color_id = $1 and user_id = $2",
      [data.id, context.userId],
    );
    if ((used[0]?.n ?? 0) > 0) {
      await sql.query("update colors set is_active = false where id = $1 and user_id = $2", [
        data.id,
        context.userId,
      ]);
      return { archived: true };
    }
    await sql.query("delete from colors where id = $1 and user_id = $2", [
      data.id,
      context.userId,
    ]);
    return { archived: false };
  });
