import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { formatKES, useShop } from "@/lib/shop";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Sidi Outfits — Piece details" },
      { name: "description", content: "See photos, price and availability, then add it to your bag." },
      { property: "og:title", content: "Sidi Outfits — Piece details" },
      { property: "og:description", content: "See photos, price and availability." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { add } = useShop();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Shop
        </Link>
      </div>
      {isLoading && <div className="mx-auto mt-4 aspect-[4/5] max-w-md animate-pulse bg-secondary" />}
      {!isLoading && !p && <p className="py-20 text-center text-muted-foreground">This piece is no longer available.</p>}
      {p && (
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-4 md:grid-cols-2 md:gap-12">
          <div>
            <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-sm md:block"
              onScroll={(e) => {
                const el = e.currentTarget;
                setActive(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {(p.images.length ? p.images : [""]).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${p.name} ${i + 1}`}
                  className={`aspect-[4/5] w-full shrink-0 snap-center bg-secondary object-cover ${i === active ? "md:block" : "md:hidden"}`}
                />
              ))}
            </div>
            {p.images.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5 md:justify-start">
                {p.images.map((src, i) => (
                  <button key={i} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all md:h-16 md:w-14 md:overflow-hidden md:rounded-sm ${i === active ? "w-6 bg-primary md:ring-2 md:ring-primary" : "w-1.5 bg-border"}`}>
                    <img src={src} alt="" className="hidden h-full w-full object-cover md:block" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:pt-8">
            <p className="eyebrow text-muted-foreground">{p.category}</p>
            <h1 className="mt-2 text-4xl md:text-5xl">{p.name}</h1>
            <p className="mt-3 text-xl text-primary">{formatKES(Number(p.price))}</p>
            <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>
            <p className="mt-6 text-sm">
              {p.quantity === 0 ? <span className="text-destructive">Sold out</span> : <span>{p.quantity} in stock</span>}
            </p>

            {p.quantity > 0 && (
              <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background p-4 md:static md:mt-8 md:border-0 md:p-0">
                <div className="flex items-center rounded-full border">
                  <button className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less"><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center">{qty}</span>
                  <button className="p-3" onClick={() => setQty((q) => Math.min(p.quantity, q + 1))} aria-label="More"><Plus className="h-4 w-4" /></button>
                </div>
                <button
                  onClick={() => {
                    add(p, qty);
                    toast.success("Added to your bag");
                  }}
                  className="flex-1 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground active:scale-[0.98]"
                >
                  Add to bag
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
