// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';
import { supabase } from '@/lib/supabase/client';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function getMovieDetails(tmdbId: string) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.id.toString(),
      title: data.title,
      description: data.overview,
      image_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      type: 'movie',
      year: data.release_date ? new Date(data.release_date).getFullYear() : 0,
      rating: data.vote_average || 0,
      rating_count: data.vote_count || 0,
      genre: data.genres?.map((g: any) => g.name).join(', ') || '',
      runtime: data.runtime ? `${data.runtime} min` : null,
    };
  } catch (error) {
    console.error('Error fetching TMDB movie:', error);
    return null;
  }
}

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

    // Get AI provider (Gemini)
    const aiProvider = getAIProvider();
    
    console.log('🧠 Calling Gemini AI...');
    const result = await aiProvider.generateRecommendations({
      userId,
      userTasteProfile: tasteProfile,
      watchHistory: [],
      limit: 10,
      excludeIds: [],
    });

    console.log('📊 Gemini response:', result.recommendations?.length || 0, 'recommendations');

    // ✅ Fetch movie details from TMDB for each recommendation
    const merged = await Promise.all(
      (result.recommendations || []).map(async (rec: any) => {
        try {
          const tmdbData = await getMovieDetails(rec.contentId);
          if (tmdbData) {
            return {
              ...rec,
              content: tmdbData
            };
          }
          console.warn('⚠️ Could not fetch TMDB data for ID:', rec.contentId);
          return { ...rec, content: null };
        } catch (error) {
          console.error('Error fetching TMDB data for:', rec.contentId, error);
          return { ...rec, content: null };
        }
      })
    );

    // Filter out null content
    const validRecommendations = merged.filter((rec: any) => rec.content !== null);

    console.log(`✅ Returning ${validRecommendations.length} valid recommendations`);

    return NextResponse.json({ 
      success: true, 
      recommendations: validRecommendations,
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
