export const STATUSES = ["new", "confirmed", "delivered", "cancelled"] as const;

const styles: Record<string, string> = {
  new: "bg-primary text-primary-foreground",
  confirmed: "bg-lilac text-accent-foreground",
  delivered: "bg-success text-primary-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`eyebrow rounded-full px-2.5 py-1 ${styles[status] ?? styles["new"]}`}>{status}</span>;
}
