"use client"

/**
 * The app frame: a sidebar the same colour as the canvas, separated by a
 * hairline rather than a fill, and a content column that owns its own scrolling.
 *
 * Nothing here is tinted. The only colour in the chrome is the active row's
 * neutral `bg-accent`, so a status tone anywhere in the content is the brightest
 * thing on screen.
 */
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ChevronsUpDown,
  GitPullRequest,
  MoonIcon,
  PlugIcon,
  Radar,
  Search,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { repo } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const NAV = [
  { href: "/changes", label: "Changes", Icon: GitPullRequest },
  { href: "/missions", label: "Missions", Icon: Radar },
  { href: "/agents", label: "Agents", Icon: SparklesIcon },
  { href: "/policies", label: "Policies", Icon: ShieldCheckIcon },
  { href: "/integrations", label: "Integrations", Icon: PlugIcon },
] as const

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: typeof GitPullRequest
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // The current row is a neutral fill. A coloured indicator here would
        // spend the one signal the content needs for status.
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
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
            size="icon-xs"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {/* Swapped in CSS so the glyph cannot mismatch on hydration. */}
            <MoonIcon className="hidden size-3.5 dark:block" />
            <SunIcon className="block size-3.5 dark:hidden" />
          </Button>
        }
      />
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <aside className="hidden w-[212px] shrink-0 flex-col border-r border-border/60 bg-sidebar md:flex">
        <div className="flex h-10 shrink-0 items-center px-4">
          <span className="text-sm font-semibold">Opssemble</span>
        </div>

        {/* The repository this workspace is pointed at. A picker rather than a
            label because a reader's first question on an unfamiliar screen is
            which repository they are looking at. */}
        <button
          type="button"
          className="mx-2 mb-2 flex h-8 items-center gap-2 rounded-md px-2 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {repo.slug}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </button>

        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="flex-1" />

        {/* Production state earns a tone: it is the one thing on the frame a
            reader needs to see without looking for it. */}
        <div className="px-4 py-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground">Production</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-300/90">
              healthy
            </span>
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/70">
            {repo.productionDeployment}
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 px-4">
          <button
            type="button"
            className="flex h-6 min-w-0 max-w-72 flex-1 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-3.5 shrink-0" />
            <span className="truncate">Search changes and missions</span>
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <span
            aria-hidden
            className="ml-1 flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground"
          >
            D
          </span>
        </div>

        <main className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
