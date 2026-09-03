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
      description: data.overview || '',
      long_description: data.overview || null,
      image_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      type: 'movie' as const,
      year: data.release_date ? new Date(data.release_date).getFullYear() : 0,
      director: null,
      artist: null,
      actors: [],
      platforms: [],
      trailer_url: null,
      runtime: data.runtime ? `${data.runtime} min` : null,
      duration: null,
      genre: data.genres?.map((g: any) => g.name).join(', ') || '',
      stats_highly: 0,
      stats_recommended: 0,
      stats_not: 0,
      rating: data.vote_average || 0,
      rating_count: data.vote_count || 0,
      is_tv_show: false,
    };
  } catch (error) {
    console.error('Error fetching TMDB movie:', error);
    return null;
  }
}

async function getTrendingMovies() {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching trending:', error);
    return [];
  }
}

async function getTopRatedMovies() {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&vote_count.gte=100&page=1`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching top rated:', error);
    return [];
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

    let recommendations = [];
    let source = 'none';

    // Try Gemini first
    try {
      console.log('🧠 Calling Gemini AI...');
      const aiProvider = getAIProvider();
      const result = await aiProvider.generateRecommendations({
        userId,
        userTasteProfile: tasteProfile,
        watchHistory: [],
        limit: 10,
        excludeIds: [],
      });

      console.log('📊 Gemini response:', result.recommendations?.length || 0, 'recommendations');

      if (result.recommendations && result.recommendations.length > 0) {
        const merged = await Promise.all(
          result.recommendations.map(async (rec: any) => {
            try {
              const tmdbData = await getMovieDetails(rec.contentId);
              if (tmdbData) {
                return {
                  ...rec,
                  content: tmdbData
                };
              }
              return null;
            } catch (error) {
              return null;
            }
          })
        );

        recommendations = merged.filter((rec: any) => rec !== null);
        source = 'gemini';
        console.log(`✅ Gemini returned ${recommendations.length} valid recommendations`);
      }
    } catch (error) {
      console.error('❌ Gemini error:', error);
    }

    // ✅ FALLBACK: If Gemini returns nothing, use TMDB trending
    if (recommendations.length === 0) {
      console.log('⚠️ No Gemini recommendations, falling back to TMDB trending...');
      
      const trendingMovies = await getTrendingMovies();
      
      if (trendingMovies.length > 0) {
        // ✅ FIX: Cast entries to [string, number][] to fix type error
        let topGenres = 'various genres';
        if (tasteProfile?.genre_affinities) {
          const entries = Object.entries(tasteProfile.genre_affinities) as [string, number][];
          topGenres = entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre)
            .join(', ');
        }

        recommendations = trendingMovies.slice(0, 10).map((movie: any) => ({
          contentId: movie.id.toString(),
          score: 0.7 + (Math.random() * 0.2),
          reason: `Trending now! Based on your interest in ${topGenres || 'movies'}, this is a must-watch.`,
          content: {
            id: movie.id.toString(),
            title: movie.title,
            description: movie.overview || '',
            long_description: movie.overview || null,
            image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
            type: 'movie' as const,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
            director: null,
            artist: null,
            actors: [],
            platforms: [],
            trailer_url: null,
            runtime: null,
            duration: null,
            genre: movie.genre_ids?.join(', ') || '',
            stats_highly: 0,
            stats_recommended: 0,
            stats_not: 0,
            rating: movie.vote_average || 0,
            rating_count: movie.vote_count || 0,
            is_tv_show: false,
          }
        }));
        source = 'tmdb-trending';
        console.log(`✅ TMDB trending returned ${recommendations.length} recommendations`);
      }
    }

    // ✅ FINAL FALLBACK: If still nothing, use top rated
    if (recommendations.length === 0) {
      console.log('⚠️ No trending movies, falling back to top rated...');
      
      const topRated = await getTopRatedMovies();
      
      if (topRated.length > 0) {
        recommendations = topRated.slice(0, 10).map((movie: any) => ({
          contentId: movie.id.toString(),
          score: 0.8,
          reason: 'Highly rated by audiences worldwide. A must-see classic!',
          content: {
            id: movie.id.toString(),
            title: movie.title,
            description: movie.overview || '',
            long_description: movie.overview || null,
            image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
            type: 'movie' as const,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
            director: null,
            artist: null,
            actors: [],
            platforms: [],
            trailer_url: null,
            runtime: null,
            duration: null,
            genre: movie.genre_ids?.join(', ') || '',
            stats_highly: 0,
            stats_recommended: 0,
            stats_not: 0,
            rating: movie.vote_average || 0,
            rating_count: movie.vote_count || 0,
            is_tv_show: false,
          }
        }));
        source = 'tmdb-top-rated';
        console.log(`✅ TMDB top rated returned ${recommendations.length} recommendations`);
      }
    }

    console.log(`✅ Returning ${recommendations.length} recommendations from ${source}`);

    return NextResponse.json({ 
      success: true, 
      recommendations,
      metadata: { source }
    });
    
  } catch (error: any) {
    console.error('❌ Recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
