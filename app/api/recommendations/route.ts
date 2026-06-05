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
      .limit(20)
    
    if (error) throw error
    
    // Transform the data to match the expected format
    const transformed = data?.map((rec: any) => ({
      id: rec.id,
      user_id: rec.user_id,
      content_id: rec.content_id,
      content_type: rec.content_type,
      recommendation_tier: rec.recommendation_tier,
      comment: rec.comment,
      created_at: rec.created_at,
      profiles: Array.isArray(rec.profiles) ? rec.profiles[0] : rec.profiles,
      content: Array.isArray(rec.content) ? rec.content[0] : rec.content
    })) || []
    
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
    
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Insert the recommendation
    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        user_id: session.user.id,
        content_id,
        content_type,
        recommendation_tier,
        comment: comment || null
      })
      .select()
    
    if (error) throw error
    
    // Update the content's stats
    const updateField = recommendation_tier === 'highly' ? 'stats_highly' : 
                        recommendation_tier === 'recommended' ? 'stats_recommended' : 'stats_not'
    
    // Get current stats and increment
    const { data: contentData } = await supabase
      .from('content')
      .select(updateField)
      .eq('id', content_id)
      .single()
    
    const currentValue = contentData?.[updateField] || 0
    
    await supabase
      .from('content')
      .update({ [updateField]: currentValue + 1 })
      .eq('id', content_id)
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving recommendation:', error)
    return NextResponse.json({ error: 'Failed to save recommendation' }, { status: 500 })
  }
}
