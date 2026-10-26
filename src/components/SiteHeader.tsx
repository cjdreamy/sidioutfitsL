import { Link } from "@tanstack/react-router";
import { ShoppingBag, User, LayoutGrid } from "lucide-react";
import { useShop } from "@/lib/shop";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-script leading-none text-primary ${className}`}>Sidi Outfits</span>
  );
}

export function SiteHeader() {
  const { count, isAdmin, session } = useShop();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="Sidi Outfits home">
          <Logo className="text-4xl" />
        </Link>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <Link to="/admin" className="rounded-full p-2.5 text-foreground hover:bg-secondary" aria-label="Dashboard">
              <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          )}
          <Link
            to={session ? "/orders" : "/auth"}
            className="rounded-full p-2.5 text-foreground hover:bg-secondary"
            aria-label="Account"
          >
            <User className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <Link to="/bag" className="relative rounded-full p-2.5 text-foreground hover:bg-secondary" aria-label="Bag">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-plum text-plum-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <span className="font-script text-5xl">Sidi Outfits</span>
        <p className="eyebrow mt-4 opacity-70">Dressed with intention</p>
      </div>
    </footer>
  );
}
