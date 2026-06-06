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
    const { content_id, content_type, recommendation_tier, comment, existing_id } = await req.json()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let oldTier: string | null = null
    let contentData: any = null
    
    // If updating existing recommendation
    if (existing_id) {
      // Get old recommendation tier to adjust stats
      const { data: oldRec } = await supabase
        .from('recommendations')
        .select('recommendation_tier')
        .eq('id', existing_id)
        .single()
      
      oldTier = oldRec?.recommendation_tier || null
      
      // Update the recommendation
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({
          recommendation_tier,
          comment: comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing_id)
      
      if (updateError) throw updateError
    } else {
      // Check if already exists (prevent duplicate)
      const { data: existing } = await supabase
        .from('recommendations')
        .select('id, recommendation_tier')
        .eq('user_id', session.user.id)
        .eq('content_id', content_id)
        .maybeSingle()
      
      if (existing) {
        // Update instead of creating new
        const { error: updateError } = await supabase
          .from('recommendations')
          .update({
            recommendation_tier,
            comment: comment || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (updateError) throw updateError
        oldTier = existing.recommendation_tier
      } else {
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
      }
    }
    
    // Get current content stats
    const { data: currentStats } = await supabase
      .from('content')
      .select('stats_highly, stats_recommended, stats_not')
      .eq('id', content_id)
      .single()
    
    // Calculate new stats
    let newStats = { ...currentStats }
    
    // Remove old tier if it exists
    if (oldTier) {
      if (oldTier === 'highly') newStats.stats_highly = Math.max(0, (newStats.stats_highly || 0) - 1)
      else if (oldTier === 'recommended') newStats.stats_recommended = Math.max(0, (newStats.stats_recommended || 0) - 1)
      else if (oldTier === 'not') newStats.stats_not = Math.max(0, (newStats.stats_not || 0) - 1)
    }
    
    // Add new tier
    if (recommendation_tier === 'highly') newStats.stats_highly = (newStats.stats_highly || 0) + 1
    else if (recommendation_tier === 'recommended') newStats.stats_recommended = (newStats.stats_recommended || 0) + 1
    else if (recommendation_tier === 'not') newStats.stats_not = (newStats.stats_not || 0) + 1
    
    // Update content stats
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
