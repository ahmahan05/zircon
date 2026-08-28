import { z } from "zod";
import { EXPORT_APP, EXPORT_VERSION, type ExportPayload, type ImportPreview } from "../types.ts";

const iso = z.string();

const exportSchema = z.object({
  app: z.string().optional(),
  version: z.number().int().min(1),
  exported_at: z.string().optional(),
  data: z.object({
    doctors: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        phone: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        created_at: iso,
        updated_at: iso.optional(),
      }),
    ),
    patients: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        notes: z.string().nullable().optional(),
        created_at: iso,
        updated_at: iso.optional(),
      }),
    ),
    work_types: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        default_price: z.number().int(),
        description: z.string().nullable().optional(),
        is_active: z.boolean().optional(),
        sort_order: z.number().int().optional(),
        created_at: iso,
        updated_at: iso.optional(),
      }),
    ),
    colors: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        is_active: z.boolean().optional(),
        sort_order: z.number().int().optional(),
        created_at: iso,
      }),
    ),
    orders: z.array(
      z.object({
        id: z.string().min(1),
        order_number: z.string().min(1),
        doctor_id: z.string().min(1),
        patient_id: z.string().min(1),
        color_id: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        created_at: iso,
        started_at: z.string().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        status: z.string().optional(),
        updated_at: iso.optional(),
      }),
    ),
    order_items: z.array(
      z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        work_type_id: z.string().min(1),
        quantity: z.number().int().min(1),
        unit_price: z.number().int().min(0),
        created_at: iso.optional(),
      }),
    ),
    settings: z
      .array(z.object({ key: z.string(), value: z.string() }))
      .optional(),
  }),
});

export type ParsedExport = z.infer<typeof exportSchema>;

export function parseExportPayload(raw: unknown): {
  ok: true;
  data: ParsedExport;
} | { ok: false; error: string } {
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") || "file";
    return {
      ok: false,
      error: `Некорректный файл импорта (${path}: ${issue?.message ?? "ошибка схемы"}). Ожидается JSON версии ${EXPORT_VERSION}.`,
    };
  }
  if (parsed.data.version > EXPORT_VERSION) {
    return {
      ok: false,
      error: `Файл создан в более новой версии приложения (v${parsed.data.version}). Обновите приложение и попробуйте снова.`,
    };
  }
  return { ok: true, data: parsed.data };
}

export function previewImport(
  payload: ParsedExport,
  existing: { doctorIds: Set<string>; orderIds: Set<string> },
): ImportPreview {
  const conflicts: string[] = [];
  const doctorHits = payload.data.doctors.filter((d) =>
    existing.doctorIds.has(d.id),
  ).length;
  const orderHits = payload.data.orders.filter((o) =>
    existing.orderIds.has(o.id),
  ).length;
  if (doctorHits > 0) {
    conflicts.push(`${doctorHits} врачей уже есть в базе (совпадение по id)`);
  }
  if (orderHits > 0) {
    conflicts.push(`${orderHits} нарядов уже есть в базе (совпадение по id)`);
  }
  return {
    version: payload.version,
    exportedAt: payload.exported_at ?? null,
    counts: {
      doctors: payload.data.doctors.length,
      patients: payload.data.patients.length,
      workTypes: payload.data.work_types.length,
      colors: payload.data.colors.length,
      orders: payload.data.orders.length,
      orderItems: payload.data.order_items.length,
    },
    conflicts,
  };
}

export function buildExportEnvelope(data: ExportPayload["data"]): ExportPayload {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    data,
  };
}
