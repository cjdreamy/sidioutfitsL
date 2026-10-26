import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [{ data: orders }, { data: products }, { data: items }] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at,seen,customer_name").order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,quantity,price,images,published"),
        supabase.from("order_items").select("name,qty,price,order_id"),
      ]);
      return { orders: orders ?? [], products: products ?? [], items: items ?? [] };
    },
  });
  if (!data) return <div className="h-40 animate-pulse rounded-md bg-secondary" />;

  const valid = data.orders.filter((o) => o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
  const newCount = data.orders.filter((o) => o.status === "new").length;
  const stockUnits = data.products.reduce((s, p) => s + p.quantity, 0);
  const stockValue = data.products.reduce((s, p) => s + p.quantity * Number(p.price), 0);
  const low = data.products.filter((p) => p.quantity <= 2).sort((a, b) => a.quantity - b.quantity);

  const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const perDay = days.map((d) => {
    const next = d.getTime() + 86400000;
    return {
      d,
      v: valid.filter((o) => +new Date(o.created_at) >= d.getTime() && +new Date(o.created_at) < next).reduce((s, o) => s + Number(o.total), 0),
    };
  });
  const max = Math.max(1, ...perDay.map((x) => x.v));

  const validIds = new Set(valid.map((o) => o.id));
  const top = Object.entries(
    data.items.filter((i) => validIds.has(i.order_id)).reduce<Record<string, number>>((m, i) => ({ ...m, [i.name]: (m[i.name] ?? 0) + i.qty }), {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {newCount > 0 && (
        <Link to="/admin/orders" className="flex items-center justify-between rounded-md bg-primary p-4 text-primary-foreground">
          <span>{newCount} new booking{newCount > 1 ? "s" : ""} waiting</span>
          <span className="eyebrow">View →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue" value={formatKES(revenue)} />
        <Stat label="Bookings" value={String(valid.length)} />
        <Stat label="Units in stock" value={String(stockUnits)} />
        <Stat label="Stock value" value={formatKES(stockValue)} />
      </div>

      <section className="rounded-md bg-card p-5 ring-1 ring-border">
        <p className="eyebrow text-muted-foreground">Last 7 days</p>
        <div className="mt-4 flex h-36 items-end gap-2">
          {perDay.map(({ d, v }) => (
            <div key={+d} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-sm bg-primary transition-all" style={{ height: `${Math.max(3, (v / max) * 100)}%` }} title={formatKES(v)} />
              <span className="text-[10px] text-muted-foreground">{format(d, "EEE")}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-md bg-card p-5 ring-1 ring-border">
          <p className="eyebrow text-muted-foreground">Best sellers</p>
          {top.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No sales yet.</p>}
          <ol className="mt-3 space-y-2 text-sm">
            {top.map(([n, q], i) => (
              <li key={n} className="flex justify-between"><span>{i + 1}. {n}</span><span className="text-muted-foreground">{q} sold</span></li>
            ))}
          </ol>
        </section>
        <section className="rounded-md bg-card p-5 ring-1 ring-border">
          <p className="eyebrow text-muted-foreground">Low stock</p>
          {low.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Everything is well stocked.</p>}
          <ul className="mt-3 space-y-2 text-sm">
            {low.slice(0, 6).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="truncate">{p.name}</span>
                <span className={p.quantity === 0 ? "text-destructive" : "text-muted-foreground"}>{p.quantity === 0 ? "Sold out" : `${p.quantity} left`}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card p-4 ring-1 ring-border">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
    </div>
  );
}
