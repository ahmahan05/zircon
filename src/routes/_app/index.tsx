import { createFileRoute } from "@tanstack/react-router";
import { SummaryPage } from "@/features/summary/summary-page";

export const Route = createFileRoute("/_app/")({
  component: SummaryPage,
});
