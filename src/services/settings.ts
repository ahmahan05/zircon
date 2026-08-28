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
