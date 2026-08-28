import { z } from "zod";

export const orderItemSchema = z.object({
  workTypeId: z.string().min(1, "Выберите вид работы"),
  quantity: z.number().int().min(1, "Количество должно быть не меньше 1"),
  unitPrice: z.number().int().min(0, "Цена не может быть отрицательной"),
});

export const orderInputSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1, "Укажите номер наряда")
    .max(40, "Номер слишком длинный"),
  doctorId: z.string().optional(),
  doctorName: z.string().trim().optional(),
  patientName: z.string().trim().min(1, "Укажите пациента").max(120),
  colorId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы одну работу"),
  createdAt: z.string().optional(),
}).refine((value) => Boolean(value.doctorId || value.doctorName), {
  message: "Выберите врача",
  path: ["doctorId"],
});

export const doctorInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя врача").max(120),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export const workTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(120),
  defaultPrice: z.number().int().min(0, "Цена не может быть отрицательной"),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const colorInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите цвет").max(40),
  isActive: z.boolean().optional(),
});

export type OrderInputParsed = z.infer<typeof orderInputSchema>;
