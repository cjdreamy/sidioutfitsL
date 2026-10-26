import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export const CATEGORIES = ["Handbags", "Dresses", "Outfits", "Keychains", "Accessories"] as const;

export const formatKES = (n: number) =>
  "KSh " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 });

export type BagItem = { product_id: string; name: string; price: number; image?: string; qty: number; max: number };

type ShopCtx = {
  bag: BagItem[];
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  total: number;
  session: Session | null;
  isAdmin: boolean;
  ready: boolean;
};

const Ctx = createContext<ShopCtx | null>(null);
const KEY = "sidi-bag";

export function ShopProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<BagItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setBag(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(bag));
  }, [bag]);

  useEffect(() => {
    const check = async (s: Session | null) => {
      setSession(s);
      if (s) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
        setIsAdmin(!!data?.some((r) => r.role === "admin"));
      } else setIsAdmin(false);
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => check(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const add: ShopCtx["add"] = (p, qty = 1) =>
    setBag((b) => {
      const ex = b.find((i) => i.product_id === p.id);
      if (ex) return b.map((i) => (i.product_id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.quantity) } : i));
      return [...b, { product_id: p.id, name: p.name, price: Number(p.price), image: p.images[0], qty: Math.min(qty, p.quantity), max: p.quantity }];
    });

  const value: ShopCtx = {
    bag,
    add,
    setQty: (id, qty) => setBag((b) => b.map((i) => (i.product_id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.max)) } : i))),
    remove: (id) => setBag((b) => b.filter((i) => i.product_id !== id)),
    clear: () => setBag([]),
    count: bag.reduce((s, i) => s + i.qty, 0),
    total: bag.reduce((s, i) => s + i.qty * i.price, 0),
    session,
    isAdmin,
    ready,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShop outside provider");
  return c;
}
