import { Link } from "@tanstack/react-router";
import { formatKES, type Product } from "@/lib/shop";

export function ProductCard({ p, i = 0 }: { p: Product; i?: number }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group rise block"
      style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary">
        {p.images[0] && (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        )}
        {p.quantity === 0 && (
          <span className="eyebrow absolute left-2 top-2 rounded-sm bg-background px-2 py-1 text-foreground">Sold out</span>
        )}
        {p.quantity > 0 && p.quantity <= 3 && (
          <span className="eyebrow absolute left-2 top-2 rounded-sm bg-primary px-2 py-1 text-primary-foreground">
            {p.quantity} left
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-lg leading-tight">{p.name}</h3>
        <span className="shrink-0 text-sm text-muted-foreground">{formatKES(Number(p.price))}</span>
      </div>
    </Link>
  );
}
