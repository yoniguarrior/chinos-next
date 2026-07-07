"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface MenuItem {
  text: string;
  href: string;
}

interface NavBarProps {
  menuItems: MenuItem[];
  onNavigate?: () => void;
  vertical?: boolean;
}

export function NavBar({ menuItems, onNavigate, vertical = false }: NavBarProps) {
  const pathname = usePathname();

  return (
    <>
      {menuItems.map((menuItem) => (
        <Link
          key={menuItem.text}
          href={menuItem.href}
          className={cn(
            "menu-item",
            vertical && "block w-full",
            pathname === menuItem.href && "menu-item-active",
          )}
          onClick={onNavigate}
        >
          {menuItem.text}
        </Link>
      ))}
    </>
  );
}
