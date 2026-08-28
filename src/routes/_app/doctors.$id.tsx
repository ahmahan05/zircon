import { createFileRoute } from "@tanstack/react-router";
import { DoctorProfilePage } from "@/features/doctors/doctor-profile-page";

export const Route = createFileRoute("/_app/doctors/$id")({
  component: DoctorProfile,
});

function DoctorProfile() {
  const { id } = Route.useParams();
  return <DoctorProfilePage id={id} />;
}
