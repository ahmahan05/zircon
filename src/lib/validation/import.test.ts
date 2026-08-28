import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportEnvelope, parseExportPayload, previewImport } from "./import.ts";

const valid = {
  app: "Dental Lab Work Manager",
  version: 1,
  exported_at: "2026-08-21T10:00:00.000Z",
  data: {
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
        name: "Full Anatomy Zircon",
        default_price: 60000,
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    colors: [
      { id: "c1", name: "A2", is_active: true, sort_order: 0, created_at: "2026-01-01T00:00:00.000Z" },
    ],
    orders: [
      {
        id: "o1",
        order_number: "1524",
        doctor_id: "d1",
        patient_id: "p1",
        color_id: "c1",
        status: "completed" as const,
        notes: null,
        created_at: "2026-08-01T00:00:00.000Z",
        started_at: null,
        completed_at: "2026-08-02T00:00:00.000Z",
        updated_at: "2026-08-02T00:00:00.000Z",
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
    settings: [{ key: "language", value: "ru" }],
  },
};

describe("import validation", () => {
  it("accepts a versioned export envelope", () => {
    const result = parseExportPayload(valid);
    assert.equal(result.ok, true);
  });

  it("rejects a future schema version", () => {
    const result = parseExportPayload({ ...valid, version: 9 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /более новой версии/);
  });

  it("rejects malformed json", () => {
    const result = parseExportPayload({ hello: true });
    assert.equal(result.ok, false);
  });

  it("reports id conflicts in preview", () => {
    const parsed = parseExportPayload(valid);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const preview = previewImport(parsed.data, {
      doctorIds: new Set(["d1"]),
      orderIds: new Set(["o1"]),
    });
    assert.equal(preview.counts.orders, 1);
    assert.equal(preview.conflicts.length, 2);
  });

  it("builds a v1 envelope", () => {
    const envelope = buildExportEnvelope(valid.data);
    assert.equal(envelope.app, "Dental Lab Work Manager");
    assert.equal(envelope.version, 1);
    assert.ok(envelope.exported_at);
  });
});
