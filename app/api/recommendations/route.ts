import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const contentType = searchParams.get('type') || 'movie'
    
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        profiles!user_id (id, username, avatar_url),
        content!content_id (id, title, image_url, type, artist)
      `)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    const transformed = (data || []).map((rec: any) => ({
      id: rec.id,
      user_id: rec.user_id,
      content_id: rec.content_id,
      content_type: rec.content_type,
      recommendation_tier: rec.recommendation_tier,
      comment: rec.comment,
      created_at: rec.created_at,
      profiles: Array.isArray(rec.profiles) ? rec.profiles[0] : rec.profiles,
      content: Array.isArray(rec.content) ? rec.content[0] : rec.content
    }))
    
    return NextResponse.json({ recommendations: transformed })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { content_id, content_type, recommendation_tier, comment } = await req.json()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // CHECK FOR EXISTING RECOMMENDATION FIRST
    const { data: existing } = await supabase
      .from('recommendations')
      .select('id, recommendation_tier')
      .eq('user_id', session.user.id)
      .eq('content_id', content_id)
      .maybeSingle()
    
    if (existing) {
      // User already recommended this - return conflict
      return NextResponse.json({ 
        error: 'You have already recommended this content',
        existing_tier: existing.recommendation_tier
      }, { status: 409 })
    }
    
    // Insert new recommendation
    const { error: insertError } = await supabase
      .from('recommendations')
      .insert({
        user_id: session.user.id,
        content_id,
        content_type,
        recommendation_tier,
        comment: comment || null
      })
    
    if (insertError) throw insertError
    
    // Update content stats
    const { data: contentData } = await supabase
      .from('content')
      .select('stats_highly, stats_recommended, stats_not')
      .eq('id', content_id)
      .single()
    
    let newStats = { ...contentData }
    if (recommendation_tier === 'highly') {
      newStats.stats_highly = (contentData?.stats_highly || 0) + 1
    } else if (recommendation_tier === 'recommended') {
      newStats.stats_recommended = (contentData?.stats_recommended || 0) + 1
    } else if (recommendation_tier === 'not') {
      newStats.stats_not = (contentData?.stats_not || 0) + 1
    }
    
    await supabase
      .from('content')
      .update({
        stats_highly: newStats.stats_highly,
        stats_recommended: newStats.stats_recommended,
        stats_not: newStats.stats_not
      })
      .eq('id', content_id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving recommendation:', error)
    return NextResponse.json({ error: 'Failed to save recommendation' }, { status: 500 })
  }
}
