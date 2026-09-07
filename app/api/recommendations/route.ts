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

// 🚀 NEW: Fetch movies by specific genre IDs to ensure unique pools per user
async function getMoviesByGenres(genreIds: number[]) {
  try {
    const genresQuery = genreIds.join(',');
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genresQuery}&sort_by=popularity.desc&vote_count.gte=50&page=1`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching movies by genres:', error);
    return [];
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

function getPersonalizedFallback(
  movies: any[],
  tasteProfile: any,
  limit: number = 10
): any[] {
  if (!movies || movies.length === 0) return [];

  let topGenres: string[] = [];
  if (tasteProfile?.genre_affinities) {
    const entries = Object.entries(tasteProfile.genre_affinities) as [string, number][];
    topGenres = entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre.toLowerCase());
  }

  const scoredMovies = movies.map((movie: any) => {
    let score = 0.5;
    
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      const genreMap: Record<number, string> = {
        28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
        80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
        14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
        9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 10770: 'tv movie',
        53: 'thriller', 10752: 'war', 37: 'western'
      };
      
      const movieGenres = movie.genre_ids.map((id: number) => genreMap[id]?.toLowerCase()).filter(Boolean);
      const affinities = tasteProfile?.genre_affinities || {};
      
      for (const genre of movieGenres) {
        if (topGenres.includes(genre)) {
          const affinity = (affinities as Record<string, number>)[genre] || 0.5;
          score += affinity * 0.4; // Increased weight for personal alignment
        }
      }
    }

    if (movie.vote_average) {
      score += (movie.vote_average / 10) * 0.2;
    }

    if (movie.popularity) {
      score += Math.min(movie.popularity / 1000, 0.1);
    }

    return { ...movie, personalizedScore: Math.min(score, 1.0) };
  });

  const sorted = scoredMovies.sort((a, b) => b.personalizedScore - a.personalizedScore);

  return sorted.slice(0, limit).map((movie: any) => {
    let reason = 'Matched to your profile.';
    
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      const genreMap: Record<number, string> = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
        53: 'Thriller', 10752: 'War', 37: 'Western'
      };
      const genres = movie.genre_ids.map((id: number) => genreMap[id]).filter(Boolean);
      
      const topGenre = genres.find((g: string) => {
        const lower = g?.toLowerCase() || '';
        return topGenres.some((tg: string) => lower.includes(tg));
      });

      if (topGenre) {
        reason = `Selected because you enjoy ${topGenre}.`;
      } else if (genres.length > 0) {
        reason = `A popular ${genres[0]} pick for you.`;
      }
    }

    if (movie.vote_average && movie.vote_average > 7) {
      reason += ` ⭐ ${movie.vote_average.toFixed(1)}/10`;
    }

    return {
      contentId: movie.id.toString(),
      score: movie.personalizedScore,
      reason: reason,
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
        genre: movie.genre_ids?.map((id: number) => {
          const map: Record<number, string> = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
            53: 'Thriller', 10752: 'War', 37: 'Western'
          };
          return map[id];
        }).filter(Boolean).join(', ') || '',
        stats_highly: 0,
        stats_recommended: 0,
        stats_not: 0,
        rating: movie.vote_average || 0,
        rating_count: movie.vote_count || 0,
        is_tv_show: false,
      }
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    console.log('🎯 Fetching AI recommendations for user:', userId);

    const { data: tasteProfile, error: tasteError } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tasteError) {
      console.error('Error fetching taste profile:', tasteError);
    }

    console.log('📊 Taste profile found:', tasteProfile ? 'Yes' : 'No');

    let recommendations = [];
    let source = 'none';

    // Try Gemini first
    try {
      console.log('🧠 Calling Gemini AI with user profile...');
      const aiProvider = getAIProvider();
      const result = await aiProvider.generateRecommendations({
        userId,
        userTasteProfile: tasteProfile,
        watchHistory: [],
        limit: 10,
        excludeIds: [],
      });

      console.log('📊 Gemini raw response count:', result.recommendations?.length || 0);

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
    } catch (error: any) {
      console.error('❌ Gemini error:', error.message);
    }

    // Smart fallback: Fetch targeted genre pools based on user preference instead of global trending alone
    if (recommendations.length === 0) {
      console.log('⚠️ No Gemini recommendations, fetching user-tailored genre pools from TMDB...');
      
      let candidateMovies: any[] = [];
      
      // Extract numeric TMDB genre IDs based on user's top preferences
      const reverseGenreMap: Record<string, number> = {
        'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
        'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
        'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
        'mystery': 9648, 'romance': 10749, 'sci-fi': 878, 'thriller': 53, 'war': 10752, 'western': 37
      };

      const userAffinities = tasteProfile?.genre_affinities || {};
      const topGenreKeys = Object.entries(userAffinities)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 2)
        .map(([genre]) => genre.toLowerCase());

      const targetGenreIds = topGenreKeys
        .map(g => reverseGenreMap[g])
        .filter((id): id is number => id !== undefined);

      if (targetGenreIds.length > 0) {
        candidateMovies = await getMoviesByGenres(targetGenreIds);
      }

      // If genre-specific pool is empty, fall back to trending
      if (candidateMovies.length === 0) {
        candidateMovies = await getTrendingMovies();
      }
      
      if (candidateMovies.length > 0) {
        recommendations = getPersonalizedFallback(candidateMovies, tasteProfile, 10);
        source = 'tmdb-genre-personalized';
        console.log(`✅ Personalized TMDB genre fallback returned ${recommendations.length} recommendations`);
      }
    }

    // Final fallback to top rated if everything else is empty
    if (recommendations.length === 0) {
      console.log('⚠️ Falling back to top rated movies...');
      const topRated = await getTopRatedMovies();
      if (topRated.length > 0) {
        recommendations = getPersonalizedFallback(topRated, tasteProfile, 10);
        source = 'tmdb-top-rated-personalized';
      }
    }

    console.log(`✅ Returning ${recommendations.length} recommendations from source: ${source}`);

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
