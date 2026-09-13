'use client'

import {
  LayoutDashboard, Users, Briefcase, Gavel, CalendarDays, ListChecks,
  FolderOpen, ScrollText, FileSignature, Banknote, Receipt, HandCoins,
  TrendingDown, Wallet, Mails, UserCog, ChartColumn, Archive, Bell,
  Settings, ShieldCheck, History, Circle, MessageSquarePlus, Gavel as GavelIcon,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Briefcase, Gavel, CalendarDays, ListChecks,
  FolderOpen, ScrollText, FileSignature, Banknote, Receipt, HandCoins,
  TrendingDown, Wallet, Mails, UserCog, ChartColumn, Archive, Bell,
  Settings, ShieldCheck, History, MessageSquarePlus,
}

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle
  return <Icon className={className} />
}
