import { AppShell } from "@/components/opssemble/app-shell"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
