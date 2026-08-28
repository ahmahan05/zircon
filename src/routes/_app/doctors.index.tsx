import { createFileRoute } from "@tanstack/react-router";
import { DoctorsPage } from "@/features/doctors/doctors-page";

export const Route = createFileRoute("/_app/doctors/")({
  component: DoctorsPage,
});
