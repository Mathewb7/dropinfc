import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/profile', '/admin']
const ADMIN_ROUTES = ['/admin']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  function updateResponse(name: string, value: string, options: CookieOptions): void {
    request.cookies.set({ name, value, ...options })
    response = NextResponse.next({
      request: { headers: request.headers },
    })
    response.cookies.set({ name, value, ...options })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          updateResponse(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          updateResponse(name, '', options)
        },
      },
    }
  )

  return { supabase, getResponse: () => response }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!isProtectedRoute(pathname)) {
    return getResponse()
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return getResponse()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
