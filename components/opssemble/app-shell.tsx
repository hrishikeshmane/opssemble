"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ChevronsUpDown,
  GitPullRequest,
  Moon,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Plug,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { changeStats, missionStats, repo } from "@/lib/mock-data"
import { Kbd, StatusDot } from "@/components/opssemble/kit"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const nav = [
  {
    href: "/changes",
    label: "Changes",
    icon: GitPullRequest,
    badge: changeStats.open,
  },
  {
    href: "/missions",
    label: "Missions",
    icon: Radar,
    badge: missionStats.running,
  },
  { href: "/agents", label: "Agents", icon: Sparkles, badge: null },
  { href: "/policies", label: "Policies", icon: ShieldCheck, badge: null },
  { href: "/integrations", label: "Integrations", icon: Plug, badge: null },
] as const

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge: number | null
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "ops-focus group relative flex h-7 items-center gap-2 rounded-md px-2 text-[12px] transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "absolute left-0 h-3.5 w-0.5 rounded-full bg-brand transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      <span className="flex-1" />
      {badge ? (
        <span className="ops-mono text-[10px] text-muted-foreground/70">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {/* Rendered via CSS so the icon never mismatches on hydration. */}
            <Moon className="hidden dark:block" />
            <Sun className="block dark:hidden" />
          </Button>
        }
      />
      <TooltipContent className="flex items-center gap-1.5">
        Toggle theme <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden w-[212px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-12 items-center gap-2 px-3">
          <div className="flex size-5 items-center justify-center rounded bg-brand text-[10px] font-semibold text-brand-foreground">
            O
          </div>
          <span className="text-[13px] font-medium tracking-[-0.01em]">
            Opssemble
          </span>
        </div>

        <button
          type="button"
          className="ops-focus mx-2 mb-2 flex h-9 items-center gap-2 rounded-md border border-border px-2 text-left transition-colors hover:bg-sidebar-accent/50"
        >
          <div className="min-w-0 flex-1">
            <div className="ops-mono truncate text-[11px] leading-tight">
              {repo.slug}
            </div>
            <div className="text-[10px] leading-tight text-muted-foreground">
              GitHub repository
            </div>
          </div>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </button>

        <nav className="flex flex-col gap-0.5 px-2">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="flex-1" />

        <div className="space-y-2 p-2">
          <div className="rounded-md border border-border p-2.5">
            <div className="ops-label">Production</div>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusDot status="ok" />
              <span className="text-[12px] font-medium text-ok">Healthy</span>
            </div>
            <div className="ops-mono mt-1 text-[10px] text-muted-foreground">
              {repo.productionDeployment}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-1">
            <StatusDot status="ok" />
            <span className="text-[10px] text-muted-foreground">
              Synced {repo.syncedSecondsAgo}s ago
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <button
            type="button"
            className="ops-focus flex h-7 w-full max-w-[280px] items-center gap-2 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Search className="size-3.5" />
            <span>Search changes and missions</span>
            <span className="flex-1" />
            <Kbd>⌘K</Kbd>
          </button>
          <div className="flex-1" />
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            Contract engine
            <StatusDot status="ok" />
          </span>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ThemeToggle />
          <div className="ml-1 flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
            DW
          </div>
        </div>

        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
