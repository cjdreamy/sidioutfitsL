import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { formatKES, useShop } from "@/lib/shop";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: "Your bag — Sidi Outfits" },
      { name: "description", content: "Review your pieces and book your order." },
      { property: "og:title", content: "Your bag — Sidi Outfits" },
      { property: "og:description", content: "Review your pieces and book your order." },
    ],
  }),
  component: BagPage,
});

function BagPage() {
  const { bag, setQty, remove, total, session, clear } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", location: "", note: "" });
  const [busy, setBusy] = useState(false);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Please add your name and phone");
    setBusy(true);
    const { error } = await supabase.rpc("place_order", {
      _name: form.name.trim(),
      _phone: form.phone.trim(),
      _location: form.location.trim(),
      _note: form.note.trim(),
      _items: bag.map((i) => ({ product_id: i.product_id, qty: i.qty })),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    clear();
    toast.success("Booked! We'll call you shortly.");
    navigate({ to: "/orders" });
  };

  return (
    <div className="min-h-screen pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <h1 className="text-4xl">Your bag</h1>
        {bag.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-script text-5xl text-primary">Empty, for now</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">
              Find something lovely
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-10 md:grid-cols-[1fr_380px]">
            <ul className="divide-y">
              {bag.map((i) => (
                <li key={i.product_id} className="flex gap-4 py-4">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-secondary">
                    {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="text-lg leading-tight" style={{ fontFamily: "var(--font-display)" }}>{i.name}</p>
                      <button onClick={() => remove(i.product_id)} aria-label="Remove" className="text-muted-foreground"><X className="h-4 w-4" /></button>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatKES(i.price)}</p>
                    <div className="mt-auto flex w-fit items-center rounded-full border">
                      <button className="p-2" onClick={() => setQty(i.product_id, i.qty - 1)} aria-label="Less"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <button className="p-2" onClick={() => setQty(i.product_id, i.qty + 1)} aria-label="More"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="h-fit rounded-md bg-card p-5 ring-1 ring-border">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-muted-foreground">Total</span>
                <span className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>{formatKES(total)}</span>
              </div>
              {!session ? (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">Sign in once to book — it takes a few seconds and lets you track your order.</p>
                  <Link to="/auth" search={{ redirect: "/bag" }} className="mt-4 block rounded-full bg-primary py-3.5 text-center text-sm font-medium text-primary-foreground">
                    Sign in to book
                  </Link>
                </div>
              ) : (
                <form onSubmit={book} className="mt-6 space-y-3">
                  <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12" />
                  <Input placeholder="Phone (e.g. 0712 345 678)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12" />
                  <Input placeholder="Delivery area / pickup" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-12" />
                  <Textarea placeholder="Note (size, colour…)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  <button disabled={busy} className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
                    {busy ? "Booking…" : "Book order"}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Pay on delivery or pickup.</p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
