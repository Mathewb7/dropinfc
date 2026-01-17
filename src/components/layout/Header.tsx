'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { User, LogOut, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  isActive: boolean
  children: React.ReactNode
  className?: string
}

function NavLink({ href, isActive, children, className }: NavLinkProps): React.ReactNode {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100',
        className
      )}
    >
      {children}
    </Link>
  )
}

const AUTH_PAGES = ['/login', '/signup']

export function Header(): React.ReactNode {
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()

  if (!user || AUTH_PAGES.includes(pathname)) {
    return null
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  async function handleSignOut(): Promise<void> {
    await signOut()
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="text-2xl font-bold text-indigo-600">
                DropIn FC
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-4">
              <NavLink href="/dashboard" isActive={pathname === '/dashboard'}>
                Dashboard
              </NavLink>
              <NavLink href="/profile" isActive={pathname === '/profile'}>
                Profile
              </NavLink>
              {isAdmin && (
                <NavLink
                  href="/admin"
                  isActive={pathname?.startsWith('/admin') ?? false}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {profile.display_name}
                </span>
                {isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                )}
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-900" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.display_name}</span>
                    <span className="text-xs font-normal text-gray-500">
                      {profile?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Mobile navigation */}
                <div className="md:hidden">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
