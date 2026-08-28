import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COLOR_NAMES, DEFAULT_WORK_TYPES } from "../catalog.ts";
import { parseVoiceOrder, shadeSpokenForms } from "./parse-order.ts";

const catalog = {
  doctors: [
    { id: "d-ivanov", name: "Иванов И.И." },
    { id: "d-petrov", name: "Петров А.А." },
  ],
  workTypes: DEFAULT_WORK_TYPES.map((w) => ({
    id: w.id,
    name: w.name,
    defaultPrice: w.price,
    isActive: true,
  })),
  colors: COLOR_NAMES.map((name, i) => ({
    id: `c-${name}`,
    name,
    isActive: true,
    sortOrder: i,
  })),
};

describe("shadeSpokenForms", () => {
  it("covers spoken A2 and A3.5", () => {
    const a2 = shadeSpokenForms("A2");
    assert.ok(a2.includes("а 2") || a2.includes("а2"));
    assert.ok(a2.some((f) => f.includes("два")));
    const a35 = shadeSpokenForms("A3.5");
    assert.ok(a35.some((f) => f.includes("3.5") || f.includes("три")));
  });
});

describe("parseVoiceOrder", () => {
  it("fills a full Russian dictation", () => {
    const draft = parseVoiceOrder(
      "наряд 1524 врач иванов пациент петрова мария циркон стандарт цвет а два две штуки",
      catalog,
    );
    assert.equal(draft.orderNumber, "1524");
    assert.equal(draft.doctorId, "d-ivanov");
    assert.equal(draft.patientName, "Петрова Мария");
    assert.equal(draft.colorId, "c-A2");
    assert.equal(draft.items.length, 1);
    assert.equal(draft.items[0]?.workTypeId, "wt-zr-std");
    assert.equal(draft.items[0]?.quantity, 2);
    assert.deepEqual(draft.filled.sort(), [
      "color",
      "doctor",
      "orderNumber",
      "patient",
      "works",
    ]);
  });

  it("matches zircon vip and A3.5", () => {
    const draft = parseVoiceOrder("цирконий вип цвет а 3.5", catalog);
    assert.equal(draft.items[0]?.workTypeId, "wt-zr-vip");
    assert.equal(draft.colorId, "c-A3.5");
  });

  it("matches temporary crown alias and quantity words", () => {
    const draft = parseVoiceOrder("времянка четыре штуки", catalog);
    assert.equal(draft.items[0]?.workTypeId, "wt-temp-std");
    assert.equal(draft.items[0]?.quantity, 4);
  });

  it("matches П/А and MK work types", () => {
    const pa = parseVoiceOrder("п а базовый", catalog);
    assert.equal(pa.items[0]?.workTypeId, "wt-pa-base");
    const mk = parseVoiceOrder("мк культя", catalog);
    assert.equal(mk.items[0]?.workTypeId, "wt-mk-stump");
  });

  it("puts leftover speech into notes", () => {
    const draft = parseVoiceOrder(
      "циркон базовый сдать к пятнице срочно без примерки",
      catalog,
    );
    assert.equal(draft.items[0]?.workTypeId, "wt-zr-base");
    assert.ok(draft.notes && /пятниц/i.test(draft.notes));
  });

  it("keeps unknown doctor name for create", () => {
    const draft = parseVoiceOrder("врач сидорова наряд 88", catalog);
    assert.equal(draft.doctorName, "Сидорова");
    assert.equal(draft.doctorId, undefined);
    assert.equal(draft.orderNumber, "88");
  });

  it("returns empty draft for blank audio", () => {
    const draft = parseVoiceOrder("   ", catalog);
    assert.equal(draft.items.length, 0);
    assert.equal(draft.filled.length, 0);
  });
});
