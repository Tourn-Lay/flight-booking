import Link from "next/link";
import { Plane } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Plane className="h-4 w-4 -rotate-45" />
      </span>
      <span className="text-lg">
        Sky<span className="text-primary">Book</span>
      </span>
    </Link>
  );
}
