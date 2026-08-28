import { create } from "zustand";

export type OrderSheet =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; orderId: string }
  | { mode: "details"; orderId: string };

interface OrderSheetStore {
  sheet: OrderSheet;
  searchFocusToken: number;
  openCreate: () => void;
  openEdit: (orderId: string) => void;
  openDetails: (orderId: string) => void;
  closeSheet: () => void;
  focusSearch: () => void;
}

export const useOrderSheet = create<OrderSheetStore>((set) => ({
  sheet: { mode: "closed" },
  searchFocusToken: 0,
  openCreate: () => set({ sheet: { mode: "create" } }),
  openEdit: (orderId) => set({ sheet: { mode: "edit", orderId } }),
  openDetails: (orderId) => set({ sheet: { mode: "details", orderId } }),
  closeSheet: () => set({ sheet: { mode: "closed" } }),
  focusSearch: () => set((state) => ({ searchFocusToken: state.searchFocusToken + 1 })),
}));
