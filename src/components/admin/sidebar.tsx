"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Table2,
  Tags,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { signOutAction } from "@/app/admin/actions";
import { LOGO_MARK, LOGO_TYPE } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { SIDEBAR_COOKIE } from "@/lib/ui-cookies";

/** The day-to-day run of the shop. */
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/database", label: "Database", icon: Table2 },
  { href: "/admin/customers", label: "Customers", icon: Users },
] as const;

/** Set up once, then visited now and again — below the rule. */
const SECONDARY = [
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/sales", label: "Sales", icon: Ticket },
  { href: "/admin/checkouts", label: "Checkouts", icon: ShoppingCart },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The collapse preference rides in a cookie and is read on the server, so the
 * sidebar renders at the right width on the first paint — no flash, and no
 * state to sync up after mount.
 */
export function AdminShell({
  email,
  defaultCollapsed = false,
  children,
}: {
  email: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${
      next ? "collapsed" : "expanded"
    }; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="min-h-dvh bg-plane">
      {/* Desktop sidebar — fixed to the left edge */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-sidebar lg:flex",
          collapsed ? "lg:w-[76px]" : "lg:w-64",
        )}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          email={email}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col border-r border-line bg-sidebar shadow-2xl">
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              email={email}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-dvh flex-col",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-1 flex size-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-plane"
          >
            <Menu className="size-5" />
          </button>
          <Logotype />
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  email,
  onClose,
  onToggleCollapse,
}: {
  pathname: string;
  collapsed: boolean;
  email: string;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-16 items-center gap-2",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {collapsed ? <Mark /> : <Logotype />}

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-sidebar-hover hover:text-ink"
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-sidebar-hover hover:text-ink"
          >
            <X className="size-[18px]" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="mx-auto mb-2 flex size-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-sidebar-hover hover:text-ink"
        >
          <PanelLeftOpen className="size-[18px]" />
        </button>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            collapsed={collapsed}
            onNavigate={onClose}
            active={isActive(pathname, item.href, "exact" in item && item.exact)}
          />
        ))}

        <div className="!mt-5 space-y-1 border-t border-line pt-4">
          {SECONDARY.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={onClose}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "justify-center",
          )}
        >
          {!collapsed && (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                {email.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">
                  Admin
                </p>
                <p className="truncate text-[11px] text-ink-muted">{email}</p>
              </div>
            </>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-sidebar-hover hover:text-ink"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "h-10 justify-center" : "h-10 px-3",
        active
          ? "bg-brand-soft text-brand"
          : "text-ink-secondary hover:bg-sidebar-hover hover:text-ink",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function Logotype() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO_TYPE} alt="phadewoman" className="h-5 w-auto" />
  );
}

function Mark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO_MARK} alt="phadewoman" className="size-9 object-contain" />
  );
}
