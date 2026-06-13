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
      .select('id, recommendation_tier, comment, created_at, updated_at')
      .eq('user_id', session.user.id)
      .eq('content_id', contentId)
      .maybeSingle()
    
    if (data) {
      return NextResponse.json({ 
        exists: true, 
        recommendation_tier: data.recommendation_tier,
        comment: data.comment,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at
      })
    }
    
    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error checking recommendation:', error)
    return NextResponse.json({ exists: false })
  }
}
