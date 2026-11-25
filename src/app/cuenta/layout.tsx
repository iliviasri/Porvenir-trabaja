import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cuenta/privacidad");
  return (
    <>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter />
    </>
  );
}
