import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: "Opssemble",
  description:
    "Operational coverage for every change. Watch Plans, Release Contracts, and agent-run Release Missions.",
}

/**
 * The system UI stack rather than a webfont. A native face is a large part of
 * why a dense tool reads as an application instead of a document, and it removes
 * the layout shift a loading webfont costs on first paint.
 */
const fontVariables = {
  "--font-sans":
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  "--font-mono":
    'ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
} as React.CSSProperties

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans antialiased"
      style={fontVariables}
    >
      <body>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
