import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/shop";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sidi Outfits — Handbags, Dresses & Outfits" },
      { name: "description", content: "Shop handbags, dresses, outfits and keychains from Sidi Outfits. Browse freely and book in seconds." },
      { property: "og:title", content: "Sidi Outfits — Handbags, Dresses & Outfits" },
      { property: "og:description", content: "Handpicked pieces, dressed with intention." },
    ],
  }),
  component: Index,
});

function Index() {
  const [cat, setCat] = useState<string>("All");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const shown = cat === "All" ? products : products.filter((p) => p.category === cat);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-6 md:grid-cols-2 md:pt-12">
        <div className="rise order-2 md:order-1">
          <p className="eyebrow text-muted-foreground">New season · Nairobi</p>
          <h1 className="mt-4 text-5xl leading-[0.95] md:text-7xl">
            Pieces that <em className="text-primary">carry</em> you.
          </h1>
          <p className="mt-5 max-w-sm text-muted-foreground">
            Handbags, dresses and little keepsakes — chosen one by one.
          </p>
          <a
            href="#shop"
            className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
          >
            Explore the collection
          </a>
        </div>
        <div className="relative order-1 md:order-2">
          <img
            src={hero}
            alt="Woman in a plum silk dress holding a leather handbag"
            width={1024}
            height={1280}
            className="aspect-[4/5] w-full rounded-sm object-cover md:aspect-[5/6]"
          />
          <span className="font-script absolute -bottom-6 left-4 hidden text-6xl md:block text-primary md:-left-10 md:text-7xl">
            Sidi
          </span>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-sm bg-secondary" />)}
          {shown.map((p, i) => (
            <ProductCard key={p.id} p={p} i={i} />
          ))}
        </div>
        {!isLoading && shown.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-script text-5xl text-primary">Coming soon</p>
            <p className="mt-3 text-sm text-muted-foreground">New pieces are on their way.</p>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
