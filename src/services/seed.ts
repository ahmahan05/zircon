import type { Sql } from "@/lib/db";
import { COLOR_NAMES, DEFAULT_WORK_TYPES } from "@/lib/catalog";
import { newId } from "@/lib/utils";

export async function seedCatalog(sql: Sql, userId: string): Promise<void> {
  await sql.query(
    `insert into app_settings (user_id, key, value) values
      ($1, 'language', 'ru'),
      ($1, 'currency', 'RUB'),
      ($1, 'dateFormat', 'dd.MM.yyyy'),
      ($1, 'theme', 'light'),
      ($1, 'wallpaper', 'none'),
      ($1, 'wallpaperOpacity', '35')
     on conflict (user_id, key) do nothing`,
    [userId],
  );

  const workCount = await sql.query<{ n: number }>(
    "select count(*)::int as n from work_types where user_id = $1",
    [userId],
  );
  if ((workCount[0]?.n ?? 0) === 0) {
    const now = new Date().toISOString();
    const params: unknown[] = [];
    const values = DEFAULT_WORK_TYPES.map((wt, i) => {
      const b = i * 6;
      params.push(newId(), userId, wt.name, wt.price, wt.order, now);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},true,$${b + 5},$${b + 6},$${b + 6})`;
    });
    await sql.query(
      `insert into work_types (id, user_id, name, default_price, is_active, sort_order, created_at, updated_at)
       values ${values.join(",")}`,
      params,
    );
  }

  const colorCount = await sql.query<{ n: number }>(
    "select count(*)::int as n from colors where user_id = $1",
    [userId],
  );
  if ((colorCount[0]?.n ?? 0) === 0) {
    const now = new Date().toISOString();
    const params: unknown[] = [];
    const values = COLOR_NAMES.map((name, i) => {
      const b = i * 5;
      params.push(newId(), userId, name, i + 1, now);
      return `($${b + 1},$${b + 2},$${b + 3},true,$${b + 4},$${b + 5})`;
    });
    await sql.query(
      `insert into colors (id, user_id, name, is_active, sort_order, created_at)
       values ${values.join(",")}`,
      params,
    );
  }
}

const seeded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function invalidateSeed(userId: string): void {
  seeded.delete(userId);
}

export function seedForUser(sql: Sql, userId: string): Promise<void> {
  if (seeded.has(userId)) return Promise.resolve();
  const running = inflight.get(userId);
  if (running) return running;
  const promise = seedCatalog(sql, userId)
    .then(() => {
      seeded.add(userId);
      inflight.delete(userId);
    })
    .catch((err: unknown) => {
      inflight.delete(userId);
      throw err;
    });
  inflight.set(userId, promise);
  return promise;
}
