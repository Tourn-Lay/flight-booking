import { formatMoney } from "@/lib/utils";

export function PriceBreakdown({
  unitPrice,
  passengers,
  subtotal,
  tax,
  total,
  taxRate,
  note,
}: {
  unitPrice: string | number;
  passengers: number;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  taxRate?: string | number;
  note?: string;
}) {
  const pct = taxRate !== undefined ? `${Math.round(Number(taxRate) * 1000) / 10}%` : null;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Ticket {formatMoney(unitPrice)} × {passengers} passenger{passengers > 1 ? "s" : ""}
        </span>
        <span>{formatMoney(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Taxes &amp; fees{pct ? ` (${pct})` : ""}</span>
        <span>{formatMoney(tax)}</span>
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-bold">
        <span>Total</span>
        <span className="text-primary">{formatMoney(total)}</span>
      </div>
      {note && <p className="pt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
