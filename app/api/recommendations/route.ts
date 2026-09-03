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

    console.log('🎯 Fetching AI recommendations for user:', userId);

    // Get user taste profile
    const { data: tasteProfile, error: tasteError } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tasteError) {
      console.error('Error fetching taste profile:', tasteError);
    }

    console.log('📊 Taste profile:', tasteProfile ? 'Found' : 'Not found');

    // Get watch history
    const { data: watchHistory } = await supabase
      .from('user_watch_history')
      .select('*, content(*)')
      .eq('user_id', userId)
      .limit(50);

    console.log('📺 Watch history:', watchHistory?.length || 0, 'items');

    // ✅ Get AI provider (Gemini)
    const aiProvider = getAIProvider();
    
    console.log('🧠 Calling Gemini AI...');
    const result = await aiProvider.generateRecommendations({
      userId,
      userTasteProfile: tasteProfile,
      watchHistory: watchHistory || [],
      limit: 10,
      excludeIds: watchHistory?.map(h => h.content_id) || [],
    });

    console.log('📊 Gemini response:', result.recommendations?.length || 0, 'recommendations');

    // Get full content details
    const contentIds = result.recommendations.map((r: any) => r.contentId);
    
    let contentItems: any[] = [];
    if (contentIds.length > 0) {
      const { data: content } = await supabase
        .from('content')
        .select('*')
        .in('id', contentIds);
      contentItems = content || [];
    }

    const merged = result.recommendations.map((rec: any) => ({
      ...rec,
      content: contentItems.find((c: any) => c.id === rec.contentId) || null,
    }));

    return NextResponse.json({ 
      success: true, 
      recommendations: merged,
      metadata: result.metadata 
    });
    
  } catch (error: any) {
    console.error('❌ Recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
