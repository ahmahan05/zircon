import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDoctorTotals,
  buildExportSummary,
  buildJournalRows,
  buildOrdersCsv,
  buildWorkTotals,
  exportFilename,
  filterExportByMonth,
  listMonthsFromOrders,
} from "./backup-format.ts";
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
      name: "Zircon",
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
      notes: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "o2",
      order_number: "1400",
      doctor_id: "d1",
      patient_id: "p1",
      color_id: null,
      notes: null,
      created_at: "2026-07-12T00:00:00.000Z",
      updated_at: "2026-07-12T00:00:00.000Z",
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
    {
      id: "i2",
      order_id: "o2",
      work_type_id: "w1",
      quantity: 1,
      unit_price: 50000,
      created_at: "2026-07-12T00:00:00.000Z",
    },
  ],
  settings: [],
};

describe("backup format", () => {
  it("filters orders and items by month", () => {
    const filtered = filterExportByMonth(sample, "2026-08");
    assert.equal(filtered.orders.length, 1);
    assert.equal(filtered.orders[0]?.order_number, "1524");
    assert.equal(filtered.order_items.length, 1);
    assert.equal(filtered.doctors.length, 1);
  });

  it("lists months newest first", () => {
    const months = listMonthsFromOrders(sample.orders);
    assert.deepEqual(
      months.map((m) => m.key),
      ["2026-08", "2026-07"],
    );
    assert.equal(months[0]?.orders, 1);
  });

  it("builds a csv with the august line only after filter", () => {
    const csv = buildOrdersCsv(filterExportByMonth(sample, "2026-08"));
    assert.match(csv, /1524/);
    assert.doesNotMatch(csv, /1400/);
    assert.match(csv, /2400/);
  });

  it("builds journal rows a technician can read", () => {
    const rows = buildJournalRows(filterExportByMonth(sample, "2026-08"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.doctor, "Магомедов А.А.");
    assert.equal(rows[0]?.workType, "Zircon");
    assert.equal(rows[0]?.quantity, 4);
    assert.equal(rows[0]?.amountMajor, 2400);
  });

  it("totals doctors and work types", () => {
    const doctors = buildDoctorTotals(sample);
    assert.equal(doctors[0]?.orders, 2);
    assert.equal(doctors[0]?.units, 5);
    assert.equal(doctors[0]?.amountMajor, 2900);
    const works = buildWorkTotals(sample);
    assert.equal(works[0]?.name, "Zircon");
    assert.equal(works[0]?.units, 5);
  });

  it("summarizes the period", () => {
    const summary = buildExportSummary(filterExportByMonth(sample, "2026-08"), "2026-08", "ru");
    assert.equal(summary.orders, 1);
    assert.equal(summary.units, 4);
    assert.equal(summary.amountMajor, 2400);
    assert.match(summary.periodLabel, /2026/);
  });

  it("names monthly files by month", () => {
    assert.equal(exportFilename("csv", "2026-08"), "atelier-2026-08.csv");
    assert.equal(exportFilename("json", "2026-08"), "atelier-2026-08.json");
    assert.equal(exportFilename("xlsx", "2026-08"), "atelier-2026-08.xlsx");
  });
});
