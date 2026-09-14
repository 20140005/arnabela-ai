"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import ArnabelaLogo from "@/components/brand/ArnabelaLogo";

const workspace = [
  { href: "/", label: "New test" },
  { href: "/simulation", label: "Audience" },
  { href: "/results", label: "Results" },
  { href: "/compare", label: "Versus" },
] as const;

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        className={`app-sidebar-backdrop ${open ? "open" : ""}`}
        aria-label="Close navigation"
        onClick={onClose}
      />

      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <div className="app-sidebar-brand">
          <ArnabelaLogo variant="compact" priority />
        </div>

        <p className="app-sidebar-kicker">Workspace</p>

        <nav className="app-sidebar-nav" aria-label="Workspace">
          {workspace.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link ${active ? "active" : ""}`}
                onClick={onClose}
              >
                <span className="app-nav-dot" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar-footer">
          <p>One idea → 100 perspectives</p>
          <p>Simulated perspectives · Not human market research</p>
        </div>
      </aside>
    </>
  );
}
