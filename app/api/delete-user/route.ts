import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // This requires service_role key
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // 👈 Add ': any' to fix the TypeScript error
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}
