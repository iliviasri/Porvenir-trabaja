import { PageHeader } from "@/components/layout/dashboard-shell";
import { CulCard } from "@/components/shared/cul-card";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Servicios laborales · CUL" };

export default async function WorkerServicesPage() {
  await requireRole("worker", "/trabajador/servicios");
  return (
    <>
      <PageHeader title="Servicios laborales" description="Trámites oficiales que te ayudan a conseguir empleo." />
      <CulCard />
    </>
  );
}
