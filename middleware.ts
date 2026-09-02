// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Skip middleware for these paths
  const publicPaths = ['/auth', '/_next', '/favicon.ico', '/api'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ✅ Skip onboarding check for onboarding page itself
  if (pathname.startsWith('/onboarding')) {
    return NextResponse.next();
  }

  // ✅ For home page, let it render and check within the component
  if (pathname === '/') {
    return NextResponse.next();
  }

  // ✅ For all other protected routes, check onboarding status
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, let it pass (auth middleware will handle)
    if (!session?.user) {
      return NextResponse.next();
    }

    // Check if user has completed onboarding
    const { data, error } = await supabase
      .from('user_taste_profiles')
      .select('onboarding_completed')
      .eq('user_id', session.user.id)
      .single();

    // If no profile or onboarding not completed, redirect to onboarding
    if (!data?.onboarding_completed && pathname !== '/') {
      console.log(`🔒 User ${session.user.id} hasn't onboarded, redirecting to /onboarding`);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

  } catch (error) {
    // If error (e.g., table doesn't exist), let user through
    console.warn('⚠️ Onboarding check failed:', error);
  }

  return NextResponse.next();
}

// ✅ Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - auth (Auth pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth).*)',
  ],
};
