import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/ui/feedback";
import { NotificationList } from "@/components/forms/misc-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notificaciones" };

export default async function BusinessNotificationsPage() {
  const user = await requireRole("business", "/empresa/notificaciones");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return (<><PageHeader title="Notificaciones" description="Postulaciones nuevas, revisiones y moderación." />{data && data.length ? <NotificationList items={data} /> : <EmptyState icon={Bell} title="No tienes notificaciones" />}</>);
}
