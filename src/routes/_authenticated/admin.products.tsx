import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, formatKES, type Product } from "@/lib/shop";
import { nameFromFile, uploadImage } from "@/lib/upload";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filter, setFilter] = useState<"all" | "drafts" | "low">("all");

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bulkUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const f of list) {
      try {
        const url = await uploadImage(f);
        const { error } = await supabase.from("products").insert({ name: nameFromFile(f), images: [url], published: false });
        if (error) throw error;
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
      setProgress((p) => p && { ...p, done: p.done + 1 });
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`${ok} draft${ok === 1 ? "" : "s"} added — tap each to set price & stock`);
    setFilter("drafts");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const shown = products.filter((p) => (filter === "drafts" ? !p.published : filter === "low" ? p.quantity <= 2 : true));

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => bulkUpload(e.target.files)} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={!!progress}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/40 bg-secondary py-8 text-secondary-foreground active:scale-[0.99] disabled:opacity-70"
      >
        <ImagePlus className="h-7 w-7" strokeWidth={1.5} />
        {progress ? (
          <span className="text-sm">Uploading {progress.done} / {progress.total}…</span>
        ) : (
          <>
            <span className="font-medium">Upload photos</span>
            <span className="text-xs text-muted-foreground">Pick many at once — each becomes a draft product</span>
          </>
        )}
      </button>

      <div className="mt-6 flex gap-2">
        {(["all", "drafts", "low"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-sm ${filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {f === "all" ? `All ${products.length}` : f === "drafts" ? `Drafts ${products.filter((p) => !p.published).length}` : "Low stock"}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y rounded-md bg-card ring-1 ring-border">
        {shown.map((p) => (
          <li key={p.id}>
            <button onClick={() => setEditing(p)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted">
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-secondary">
                {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{formatKES(Number(p.price))} · {p.category}</p>
              </div>
              <div className="text-right text-sm">
                <p className={p.quantity === 0 ? "text-destructive" : ""}>{p.quantity} pcs</p>
                {!p.published && <p className="eyebrow text-gold">Draft</p>}
              </div>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing here.</li>}
      </ul>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-xl md:mx-auto md:max-w-lg">
          {editing && <Editor key={editing.id} p={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Editor({ p, onDone }: { p: Product; onDone: () => void }) {
  const [f, setF] = useState({
    name: p.name,
    price: String(p.price),
    quantity: String(p.quantity),
    description: p.description,
    category: p.category,
    images: p.images,
    published: p.published,
  });
  const [busy, setBusy] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      setF((s) => ({ ...s, images: [...s.images, ...urls] }));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const save = async (publish?: boolean) => {
    const price = Number(f.price), quantity = parseInt(f.quantity, 10);
    if (!f.name.trim() || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) return toast.error("Check name, price and quantity");
    setBusy(true);
    const { error } = await supabase.from("products").update({
      name: f.name.trim(), price, quantity, description: f.description, category: f.category, images: f.images,
      published: publish ?? f.published, updated_at: new Date().toISOString(),
    }).eq("id", p.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onDone();
  };

  const del = async () => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    onDone();
  };

  return (
    <div className="space-y-4 pb-4">
      <SheetHeader className="p-0 text-left"><SheetTitle className="font-display text-2xl font-medium">Edit piece</SheetTitle></SheetHeader>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {f.images.map((src, i) => (
          <div key={src} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-secondary">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button onClick={() => setF((s) => ({ ...s, images: s.images.filter((_, j) => j !== i) }))}
              className="absolute right-1 top-1 rounded-full bg-background p-0.5" aria-label="Remove photo"><X className="h-3 w-3" /></button>
            {i === 0 && <span className="eyebrow absolute inset-x-0 bottom-0 bg-primary py-0.5 text-center text-[9px] text-primary-foreground">Cover</span>}
          </div>
        ))}
        <input ref={addRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        <button onClick={() => addRef.current?.click()} className="flex h-24 w-20 shrink-0 items-center justify-center rounded-sm border-2 border-dashed text-muted-foreground" aria-label="Add photos">
          <ImagePlus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-1.5"><Label>Item name</Label><Input className="h-11" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Price (KSh)</Label><Input className="h-11" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Quantity</Label><Input className="h-11" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setF({ ...f, category: c })}
              className={`rounded-full border px-3 py-1.5 text-sm ${f.category === c ? "border-primary bg-primary text-primary-foreground" : ""}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="flex items-center justify-between rounded-md bg-muted p-3">
        <Label htmlFor="pub">Visible in shop</Label>
        <Switch id="pub" checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
      </div>

      <div className="flex gap-2">
        <button onClick={del} className="rounded-full border p-3 text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        <button disabled={busy} onClick={() => save()} className="flex-1 rounded-full border py-3 text-sm font-medium disabled:opacity-60">Save</button>
        {!f.published && (
          <button disabled={busy} onClick={() => save(true)} className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">Save & publish</button>
        )}
      </div>
    </div>
  );
}
