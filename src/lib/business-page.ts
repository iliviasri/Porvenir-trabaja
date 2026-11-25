import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness } from "@/lib/business";

/** Para páginas del panel de empresa que requieren tener un negocio registrado. */
export async function requireBusinessPage(path: string) {
  const user = await requireRole("business", path);
  const supabase = await createClient();
  const business = await getMyBusiness(supabase, user.id);
  if (!business) redirect("/empresa/negocio");
  return { user, supabase, business };
}
