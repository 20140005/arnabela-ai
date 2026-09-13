"use client";

import { useState, type ReactNode } from "react";

import ArnabelaLogo from "@/components/brand/ArnabelaLogo";
import Sidebar from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
  status?: string;
  tone?: "default" | "live";
  /** Kept for callers; app shell is always dark premium. */
  theme?: "light" | "dark";
};

export default function AppShell({
  children,
  status,
  tone = "default",
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="app-menu-button"
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="app-topbar-brand">
            <ArnabelaLogo variant="compact" />
          </div>

          {status ? (
            <div className={`app-topbar-status ${tone}`}>
              <span className="status-dot" />
              {status}
            </div>
          ) : (
            <div className="app-topbar-spacer" />
          )}
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
