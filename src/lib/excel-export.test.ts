import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWorkbookBase64 } from "./excel-export.ts";
import type { ExportPayload } from "./types.ts";

const sample: ExportPayload["data"] = {
  doctors: [
    {
      id: "d1",
      name: "Магомедов А.А.",
      phone: null,
      notes: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  patients: [
    {
      id: "p1",
      name: "Абдуллаев М.",
      notes: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  work_types: [
    {
      id: "w1",
      name: "Циркон стандарт",
      default_price: 60000,
      description: null,
      is_active: true,
      sort_order: 0,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  colors: [{ id: "c1", name: "A2", is_active: true, sort_order: 0, created_at: "2026-01-01T00:00:00.000Z" }],
  orders: [
    {
      id: "o1",
      order_number: "1524",
      doctor_id: "d1",
      patient_id: "p1",
      color_id: "c1",
      notes: "клыки",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
  ],
  order_items: [
    {
      id: "i1",
      order_id: "o1",
      work_type_id: "w1",
      quantity: 4,
      unit_price: 60000,
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ],
  settings: [],
};

describe("excel export", () => {
  it("writes a real xlsx workbook", async () => {
    const base64 = await buildWorkbookBase64(
      sample,
      {
        journal: "Журнал работ",
        doctors: "Итоги по врачам",
        works: "Итоги по работам",
        summary: "Сводка",
        period: "Период",
        date: "Дата",
        number: "№ наряда",
        doctor: "Врач",
        patient: "Пациент",
        color: "Цвет",
        workType: "Вид работы",
        qty: "Кол-во",
        price: "Цена",
        amount: "Сумма",
        notes: "Заметки",
        orders: "Нарядов",
        units: "Единиц",
        earned: "Заработано",
        average: "Средний чек",
        doctorsCount: "Врачей",
        workTypesCount: "Видов работ",
        empty: "Нет работ за этот период.",
        currency: "RUB",
        language: "ru",
        dateFormat: "dd.MM.yyyy",
      },
      "2026-08",
    );
    const buf = Buffer.from(base64, "base64");
    assert.ok(buf.length > 1000);
    assert.equal(buf.subarray(0, 2).toString(), "PK");
  });
});
