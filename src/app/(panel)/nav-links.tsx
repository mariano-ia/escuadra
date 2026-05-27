"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string; badge?: number }[] }) {
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
            className={`font-display text-xs tracking-[0.16em] uppercase whitespace-nowrap h-full flex items-center gap-1.5 border-b-2 transition-colors ${
              active ? "text-ink border-ink" : "text-grey border-transparent hover:text-ink"
            }`}
          >
            {n.label}
            {!!n.badge && n.badge > 0 && (
              <span className="grid place-items-center min-w-[1.1rem] h-[1.1rem] px-1 bg-ink text-bg text-[0.6rem] leading-none tabular-nums">
                {n.badge > 99 ? "99+" : n.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
