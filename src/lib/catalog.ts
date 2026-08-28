export const DEFAULT_WORK_TYPES: Array<{
  id: string;
  name: string;
  price: number;
  order: number;
}> = [
  { id: "wt-pa-base", name: "П/А базовый", price: 40000, order: 1 },
  { id: "wt-pa-std", name: "П/А стандарт", price: 60000, order: 2 },
  { id: "wt-pa-vip", name: "П/А вип", price: 80000, order: 3 },
  { id: "wt-zr-base", name: "Циркон базовый", price: 40000, order: 4 },
  { id: "wt-zr-std", name: "Циркон стандарт", price: 60000, order: 5 },
  { id: "wt-zr-vip", name: "Циркон вип", price: 80000, order: 6 },
  { id: "wt-mk-stump", name: "Мк культя", price: 25000, order: 7 },
  { id: "wt-mk-impl", name: "Мк имплант", price: 55000, order: 8 },
  { id: "wt-bar", name: "Балка", price: 300000, order: 9 },
  { id: "wt-temp-std", name: "Временная коронка стандарт", price: 40000, order: 10 },
  { id: "wt-transfer", name: "Трансферчек", price: 10000, order: 11 },
  { id: "wt-bite", name: "Прикусной на жесткой", price: 35000, order: 12 },
];

export const COLOR_NAMES = [
  "A1",
  "A2",
  "A3",
  "A3.5",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "C1",
  "C2",
  "C3",
  "C4",
  "D2",
  "D3",
  "D4",
] as const;
