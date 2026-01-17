'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  MessageSquare,
  HandCoins,
  Shield,
  AlertTriangle,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Players',
    href: '/admin/players',
    icon: Users,
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: DollarSign,
  },
  {
    name: 'Messages',
    href: '/admin/messages',
    icon: MessageSquare,
  },
  {
    name: 'Refunds',
    href: '/admin/refunds',
    icon: HandCoins,
  },
  {
    name: 'Strikes',
    href: '/admin/strikes',
    icon: AlertTriangle,
  },
  {
    name: 'Admins',
    href: '/admin/admins',
    icon: Shield,
    superAdminOnly: true,
  },
]

export function AdminNav() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'

  const filteredNavItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  )

  return (
    <nav className="space-y-1">
      {filteredNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
