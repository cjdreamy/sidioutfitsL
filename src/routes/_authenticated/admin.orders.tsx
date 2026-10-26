import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/shop";
import { STATUSES, StatusPill } from "@/components/StatusPill";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status, seen: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  if (orders.length === 0) return <p className="py-16 text-center text-muted-foreground">No bookings yet. They'll appear here the moment a customer books.</p>;

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className={`rounded-md bg-card p-4 ring-1 ${o.status === "new" ? "ring-primary" : "ring-border"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>{o.customer_name}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "d MMM yyyy, HH:mm")}{o.location && ` · ${o.location}`}</p>
            </div>
            <StatusPill status={o.status} />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between"><span>{i.qty} × {i.name}</span><span>{formatKES(Number(i.price) * i.qty)}</span></li>
            ))}
          </ul>
          {o.note && <p className="mt-2 rounded-sm bg-muted p-2 text-sm italic">“{o.note}”</p>}
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="font-medium">{formatKES(Number(o.total))}</span>
            <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
              <Phone className="h-3.5 w-3.5" /> {o.phone}
            </a>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {STATUSES.filter((s) => s !== o.status).map((s) => (
              <button key={s} onClick={() => setStatus(o.id, s)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize hover:bg-secondary">
                Mark {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
