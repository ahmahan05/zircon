import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateLineTotal,
  calculateOrderTotal,
  calculateOrderUnits,
  nextOrderNumber,
  summarizeItems,
} from "./orders.ts";
import {
  getAverageOrderRevenue,
  getDoctorRanking,
  getMonthlyComparison,
  getRevenueByMonth,
  getTotalRevenue,
  getTotalWorkUnits,
  getWorkCountByType,
  type AnalyticsOrder,
} from "./analytics.ts";

describe("calculateOrderTotal", () => {
  it("sums quantity × snapshot unit price", () => {
    const total = calculateOrderTotal([
      { quantity: 4, unitPrice: 60000 },
      { quantity: 2, unitPrice: 50000 },
      { quantity: 1, unitPrice: 80000 },
    ]);
    assert.equal(total, 420000);
  });

  it("treats fractional input as truncated integers", () => {
    assert.equal(calculateLineTotal({ quantity: 2.9 as number, unitPrice: 100 }), 200);
  });

  it("returns 0 for empty items", () => {
    assert.equal(calculateOrderTotal([]), 0);
    assert.equal(calculateOrderUnits([]), 0);
  });
});

describe("nextOrderNumber", () => {
  it("increments the max numeric order number", () => {
    assert.equal(nextOrderNumber(["1520", "1524", "99"]), "1525");
  });
});

describe("summarizeItems", () => {
  it("shortens known work type names", () => {
    assert.equal(
      summarizeItems([
        { workTypeName: "Циркон базовый", quantity: 4 },
        { workTypeName: "Мк культя", quantity: 2 },
      ]),
      "Циркон баз. ×4, МК культя ×2",
    );
  });
});

function sampleOrders(): AnalyticsOrder[] {
  return [
    {
      id: "1",
      doctorId: "d1",
      doctorName: "Магомедов А.А.",
      createdAt: "2026-08-01T10:00:00.000Z",
      items: [
        { workTypeId: "z", workTypeName: "Zircon", quantity: 4, unitPrice: 60000 },
      ],
    },
    {
      id: "2",
      doctorId: "d2",
      doctorName: "Иванов И.И.",
      createdAt: "2026-08-05T10:00:00.000Z",
      items: [
        { workTypeId: "m", workTypeName: "Metal", quantity: 2, unitPrice: 50000 },
      ],
    },
  ];
}

describe("analytics calculations", () => {
  it("counts every order toward revenue", () => {
    const orders = sampleOrders();
    assert.equal(orders.length, 2);
    assert.equal(getTotalRevenue(orders), 340000);
    assert.equal(getTotalWorkUnits(orders), 6);
    assert.equal(getAverageOrderRevenue(orders), 170000);
  });

  it("ranks doctors by revenue", () => {
    const ranks = getDoctorRanking(sampleOrders(), "revenue");
    assert.equal(ranks.length, 2);
    assert.equal(ranks[0]?.doctorId, "d1");
    assert.equal(ranks[0]?.revenue, 240000);
    assert.equal(ranks[1]?.doctorId, "d2");
  });

  it("aggregates work types with percents", () => {
    const stats = getWorkCountByType(sampleOrders());
    assert.equal(stats[0]?.workTypeId, "z");
    assert.equal(stats[0]?.units, 4);
    assert.ok(Math.abs(stats[0]!.percent - 66.666) < 0.1);
  });

  it("buckets revenue by month", () => {
    const points = getRevenueByMonth(sampleOrders());
    assert.equal(points.length, 1);
    assert.equal(points[0]?.key, "2026-08");
    assert.equal(points[0]?.revenue, 340000);
  });

  it("compares two months", () => {
    const cmp = getMonthlyComparison(sampleOrders(), [], "Август 2026", "Июль 2026");
    assert.equal(cmp.revenue.current, 340000);
    assert.equal(cmp.revenue.previous, 0);
    assert.equal(cmp.revenue.delta, 100);
  });
});
