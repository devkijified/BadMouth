// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || undefined;
    const language = searchParams.get('language') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get user data
    const { data: watchHistory } = await supabase
      .from('user_watch_history')
      .select('*, content(*)')
      .eq('user_id', userId)
      .limit(50);

    const { data: tasteProfile } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get AI recommendations
    const aiProvider = getAIProvider();
    const result = await aiProvider.generateRecommendations({
      userId,
      userTasteProfile: tasteProfile,
      watchHistory: watchHistory || [],
      mood,
      language,
      limit,
      excludeIds: watchHistory?.map(h => h.content_id) || [],
    });

    // Get full content details
    const contentIds = result.recommendations.map((r: any) => r.contentId);
    const { data: content } = await supabase
      .from('content')
      .select('*')
      .in('id', contentIds);

    const merged = result.recommendations.map((rec: any) => ({
      ...rec,
      content: content?.find((c: any) => c.id === rec.contentId) || null,
    }));

    return NextResponse.json({ success: true, recommendations: merged });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
