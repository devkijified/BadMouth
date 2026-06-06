import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const contentId = searchParams.get('content_id')
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ exists: false })
    }
    
    const { data } = await supabase
      .from('recommendations')
      .select('recommendation_tier')
      .eq('user_id', session.user.id)
      .eq('content_id', contentId)
      .maybeSingle()
    
    if (data) {
      return NextResponse.json({ exists: true, recommendation_tier: data.recommendation_tier })
    }
    
    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error checking recommendation:', error)
    return NextResponse.json({ exists: false })
  }
}
