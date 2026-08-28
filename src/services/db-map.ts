import {
  calculateOrderTotal,
  calculateOrderUnits,
  summarizeItems,
} from "@/lib/calculations/orders";
import type {
  Doctor,
  Order,
  OrderItem,
  OrderListItem,
  Patient,
  ShadeColor,
  WorkType,
} from "@/lib/types";

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value == null) return new Date().toISOString();
  return String(value);
}

export function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function asInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface DoctorRow {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: unknown;
  updated_at: unknown;
}

export function mapDoctor(row: DoctorRow): Doctor {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface PatientRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: unknown;
  updated_at: unknown;
}

export function mapPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface WorkTypeRow {
  id: string;
  name: string;
  default_price: unknown;
  description: string | null;
  is_active: unknown;
  sort_order: unknown;
  created_at: unknown;
  updated_at: unknown;
}

export function mapWorkType(row: WorkTypeRow): WorkType {
  return {
    id: row.id,
    name: row.name,
    defaultPrice: asInt(row.default_price),
    description: row.description,
    isActive: asBool(row.is_active),
    sortOrder: asInt(row.sort_order),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface ColorRow {
  id: string;
  name: string;
  is_active: unknown;
  sort_order: unknown;
  created_at: unknown;
}

export function mapColor(row: ColorRow): ShadeColor {
  return {
    id: row.id,
    name: row.name,
    isActive: asBool(row.is_active),
    sortOrder: asInt(row.sort_order),
    createdAt: iso(row.created_at),
  };
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  work_type_id: string;
  work_type_name?: string;
  quantity: unknown;
  unit_price: unknown;
  created_at: unknown;
}

export function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    workTypeId: row.work_type_id,
    workTypeName: row.work_type_name ?? "",
    quantity: asInt(row.quantity),
    unitPrice: asInt(row.unit_price),
    createdAt: iso(row.created_at),
  };
}

export const ORDER_SELECT = `
  o.id, o.order_number, o.doctor_id, d.name as doctor_name,
  o.patient_id, p.name as patient_name, o.color_id, c.name as color_name,
  o.notes, o.created_at, o.updated_at
`;

export interface OrderRow {
  id: string;
  order_number: string;
  doctor_id: string;
  doctor_name?: string;
  patient_id: string;
  patient_name?: string;
  color_id: string | null;
  color_name?: string | null;
  notes: string | null;
  created_at: unknown;
  updated_at: unknown;
}

export function mapOrder(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name ?? "",
    patientId: row.patient_id,
    patientName: row.patient_name ?? "",
    colorId: row.color_id,
    colorName: row.color_name ?? null,
    notes: row.notes,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    items,
    total: calculateOrderTotal(items),
    unitCount: calculateOrderUnits(items),
  };
}

export function mapOrderListItem(row: OrderRow, items: OrderItem[]): OrderListItem {
  const order = mapOrder(row, items);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    doctorId: order.doctorId,
    doctorName: order.doctorName,
    patientId: order.patientId,
    patientName: order.patientName,
    colorId: order.colorId,
    colorName: order.colorName,
    createdAt: order.createdAt,
    itemsSummary: summarizeItems(items),
    total: order.total,
    unitCount: order.unitCount,
  };
}
