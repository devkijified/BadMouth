// app/api/recommendations/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { contentId, type, metadata } = await request.json();

    await supabase.from('user_interactions').insert({
      user_id: userId,
      content_id: contentId,
      interaction_type: type,
      metadata: metadata || {},
    });

    // If like/rating/watch, update taste profile
    if (['like', 'rating', 'watch'].includes(type)) {
      // Update taste profile logic here
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
