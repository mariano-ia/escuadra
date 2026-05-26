"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-6 h-14">
      {items.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`font-display text-xs tracking-[0.16em] uppercase whitespace-nowrap h-full flex items-center border-b-2 transition-colors ${
              active ? "text-ink border-ink" : "text-grey border-transparent hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
