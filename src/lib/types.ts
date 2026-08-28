export const PERIODS = [
  "today",
  "week",
  "month",
  "quarter",
  "year",
  "custom",
] as const;

export type PeriodKey = (typeof PERIODS)[number];

export const ANALYTICS_PERIODS = [
  "current_month",
  "previous_month",
  "current_year",
  "custom",
] as const;

export type AnalyticsPeriodKey = (typeof ANALYTICS_PERIODS)[number];

export const DOCTOR_SORTS = ["orders", "units", "revenue"] as const;
export type DoctorSort = (typeof DOCTOR_SORTS)[number];

export const LANGUAGES = ["ru", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const CURRENCIES = ["RUB", "USD", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const DATE_FORMATS = ["dd.MM.yyyy", "yyyy-MM-dd", "MM/dd/yyyy"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const THEMES = [
  "light",
  "ivory",
  "ocean",
  "dark",
  "graphite",
  "midnight",
  "system",
] as const;
export type Theme = (typeof THEMES)[number];

export interface Doctor {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkType {
  id: string;
  name: string;
  defaultPrice: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShadeColor {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  workTypeId: string;
  workTypeName: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  colorId: string | null;
  colorName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  total: number;
  unitCount: number;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  colorId: string | null;
  colorName: string | null;
  createdAt: string;
  itemsSummary: string;
  total: number;
  unitCount: number;
}

export interface OrderItemInput {
  workTypeId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderInput {
  orderNumber: string;
  doctorId?: string;
  doctorName?: string;
  patientName: string;
  colorId?: string | null;
  notes?: string;
  items: OrderItemInput[];
  createdAt?: string;
}

export interface AppSettings {
  language: Language;
  currency: CurrencyCode;
  dateFormat: DateFormat;
  theme: Theme;
}

export interface Lookups {
  doctors: Doctor[];
  workTypes: WorkType[];
  colors: ShadeColor[];
  settings: AppSettings;
}

export interface OrderFilters {
  from: string;
  to: string;
  doctorId?: string;
  workTypeId?: string;
  colorId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SummaryKpis {
  orders: number;
  units: number;
  revenue: number;
  doctors: number;
}

export interface AnalyticsKpis {
  orders: number;
  units: number;
  revenue: number;
  averageOrder: number;
}

export interface TimePoint {
  key: string;
  label: string;
  revenue: number;
  units: number;
  orders: number;
}

export interface WorkTypeStat {
  workTypeId: string;
  name: string;
  units: number;
  revenue: number;
  percent: number;
}

export interface DoctorRank {
  doctorId: string;
  name: string;
  orders: number;
  units: number;
  revenue: number;
}

export interface MonthComparison {
  currentLabel: string;
  previousLabel: string;
  orders: { current: number; previous: number; delta: number };
  units: { current: number; previous: number; delta: number };
  revenue: { current: number; previous: number; delta: number };
}

export interface DoctorProfile {
  doctor: Doctor;
  orders: number;
  units: number;
  revenue: number;
  averageCheck: number;
  lastWorkAt: string | null;
  monthly: TimePoint[];
  workTypes: WorkTypeStat[];
  recentOrders: OrderListItem[];
}

export interface DoctorListRow {
  id: string;
  name: string;
  phone: string | null;
  orders: number;
  units: number;
  revenue: number;
  lastWorkAt: string | null;
}

export const EXPORT_APP = "Dental Lab Work Manager";
export const EXPORT_VERSION = 1;

export interface ExportPayload {
  app: typeof EXPORT_APP;
  version: number;
  exported_at: string;
  data: {
    doctors: Array<{
      id: string;
      name: string;
      phone: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>;
    patients: Array<{
      id: string;
      name: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>;
    work_types: Array<{
      id: string;
      name: string;
      default_price: number;
      description: string | null;
      is_active: boolean;
      sort_order: number;
      created_at: string;
      updated_at: string;
    }>;
    colors: Array<{
      id: string;
      name: string;
      is_active: boolean;
      sort_order: number;
      created_at: string;
    }>;
    orders: Array<{
      id: string;
      order_number: string;
      doctor_id: string;
      patient_id: string;
      color_id: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>;
    order_items: Array<{
      id: string;
      order_id: string;
      work_type_id: string;
      quantity: number;
      unit_price: number;
      created_at: string;
    }>;
    settings: Array<{ key: string; value: string }>;
  };
}

export interface ImportPreview {
  version: number;
  exportedAt: string | null;
  counts: {
    doctors: number;
    patients: number;
    workTypes: number;
    colors: number;
    orders: number;
    orderItems: number;
  };
  conflicts: string[];
}
