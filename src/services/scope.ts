import { getSql, type Sql } from "@/lib/db";
import { seedForUser } from "./seed";

export async function userDb(userId: string): Promise<Sql> {
  const sql = await getSql();
  await seedForUser(sql, userId);
  return sql;
}
