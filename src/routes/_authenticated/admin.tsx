import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id);
    if (!data?.some((r) => r.role === "admin")) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Sidi Outfits" },
      { name: "description", content: "Owner dashboard for Sidi Outfits." },
      { property: "og:title", content: "Dashboard — Sidi Outfits" },
      { property: "og:description", content: "Owner dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Bookings" },
] as const;

function AdminLayout() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`orders-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        toast.success(`New booking from ${(p.new as { customer_name: string }).customer_name}`);
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/"><Logo className="text-3xl" /></Link>
          <span className="eyebrow text-muted-foreground">Studio</span>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
