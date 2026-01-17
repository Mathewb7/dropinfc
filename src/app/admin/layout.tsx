'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/contexts/AuthContext'
import { AdminNav } from '@/components/admin/AdminNav'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useRequireAuth()
  const { profile } = useAuth()
  const router = useRouter()

  // Check if user is admin
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  useEffect(() => {
    if (!authLoading && !isAdmin && user) {
      router.push('/dashboard')
    }
  }, [authLoading, isAdmin, user, router])

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access the admin area.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-500">Manage DropIn FC</p>
          </div>
          <AdminNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
