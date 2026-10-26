import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { formatKES } from "@/lib/shop";
import { StatusPill } from "@/components/StatusPill";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My orders — Sidi Outfits" },
      { name: "description", content: "Track your bookings with Sidi Outfits." },
      { property: "og:title", content: "My orders — Sidi Outfits" },
      { property: "og:description", content: "Track your bookings." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", u.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl">My orders</h1>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground underline">Sign out</button>
        </div>
        {!isLoading && orders.length === 0 && <p className="mt-10 text-muted-foreground">No bookings yet.</p>}
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-md bg-card p-4 ring-1 ring-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{format(new Date(o.created_at), "d MMM, HH:mm")}</span>
                <StatusPill status={o.status} />
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between"><span>{i.qty} × {i.name}</span><span>{formatKES(Number(i.price) * i.qty)}</span></li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 font-medium"><span>Total</span><span>{formatKES(Number(o.total))}</span></div>
              <div className="mt-2 flex justify-between text-sm text-muted-foreground"><span>Payment</span><span>{o.payment_status === "paid" ? `Paid${o.mpesa_receipt ? ` · ${o.mpesa_receipt}` : ""}` : `${o.payment_status} · ${formatKES(Number(o.amount_due_now))} requested`}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
