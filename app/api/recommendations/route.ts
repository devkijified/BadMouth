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

// ✅ NEW: Smart fallback that uses taste profile to personalize recommendations
function getPersonalizedFallback(
  movies: any[],
  tasteProfile: any,
  limit: number = 10
): any[] {
  if (!movies || movies.length === 0) return [];

  // Get user's top genres from taste profile
  const topGenres = tasteProfile?.genre_affinities
    ? Object.entries(tasteProfile.genre_affinities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre]) => genre.toLowerCase())
    : [];

  console.log('🎯 Top genres from taste profile:', topGenres);

  // Score each movie based on taste profile
  const scoredMovies = movies.map((movie: any) => {
    let score = 0.5; // Base score
    
    // Genre matching (higher weight)
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      // Get genre names for this movie
      const genreMap: Record<number, string> = {
        28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
        80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
        14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
        9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 10770: 'tv movie',
        53: 'thriller', 10752: 'war', 37: 'western'
      };
      
      const movieGenres = movie.genre_ids.map((id: number) => genreMap[id]?.toLowerCase()).filter(Boolean);
      
      for (const genre of movieGenres) {
        if (topGenres.includes(genre)) {
          // Boost score based on affinity weight
          const affinity = tasteProfile?.genre_affinities?.[genre] || 0.5;
          score += affinity * 0.3;
        }
      }
    }

    // Boost for high rating
    if (movie.vote_average) {
      score += (movie.vote_average / 10) * 0.2;
    }

    // Boost for popularity
    if (movie.popularity) {
      score += Math.min(movie.popularity / 1000, 0.2);
    }

    // Boost for recency (2026 movies get a small bump)
    if (movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      if (year >= 2025) {
        score += 0.1;
      }
    }

    // Mood matching (if user has mood preferences)
    if (tasteProfile?.mood_preferences && tasteProfile.mood_preferences.length > 0) {
      // Map moods to genre expectations
      const moodGenres: Record<string, string[]> = {
        'action-packed': ['action', 'thriller', 'adventure'],
        'mind-bending': ['sci-fi', 'mystery', 'thriller'],
        'suspenseful': ['thriller', 'mystery', 'crime'],
        'epic': ['adventure', 'fantasy', 'action'],
        'feel-good': ['comedy', 'family', 'romance'],
        'dark': ['crime', 'drama', 'thriller'],
        'romantic': ['romance', 'drama'],
        'scary': ['horror', 'thriller'],
        'quirky': ['comedy', 'drama'],
        'musical': ['music'],
        'thoughtful': ['drama', 'documentary'],
        'family': ['family', 'animation', 'adventure'],
      };

      const movieGenres = movie.genre_ids?.map((id: number) => {
        const map: Record<number, string> = {
          28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
          80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
          14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
          9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 10770: 'tv movie',
          53: 'thriller', 10752: 'war', 37: 'western'
        };
        return map[id]?.toLowerCase();
      }).filter(Boolean) || [];

      // Check if movie matches any of the user's mood preferences
      for (const mood of tasteProfile.mood_preferences) {
        const moodGenreList = moodGenres[mood.toLowerCase()] || [];
        if (movieGenres.some((g: string) => moodGenreList.includes(g))) {
          score += 0.1;
          break;
        }
      }
    }

    return { ...movie, personalizedScore: Math.min(score, 1.0) };
  });

  // Sort by personalized score (highest first)
  const sorted = scoredMovies.sort((a, b) => b.personalizedScore - a.personalizedScore);

  // Return top N with reasons
  return sorted.slice(0, limit).map((movie: any) => {
    // Generate a personalized reason
    let reason = 'Trending and highly rated.';
    
    // Pick top matching genre
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
        reason = `A popular ${topGenre} movie that matches your taste.`;
      } else if (genres.length > 0) {
        reason = `A trending ${genres[0]} movie you might enjoy.`;
      }
    }

    // Add rating mention
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

    // Get user taste profile
    const { data: tasteProfile, error: tasteError } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tasteError) {
      console.error('Error fetching taste profile:', tasteError);
    }

    console.log('📊 Taste profile found:', tasteProfile ? 'Yes' : 'No', tasteProfile || '');

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

    // ✅ SMART FALLBACK: Use taste profile to personalize recommendations
    if (recommendations.length === 0) {
      console.log('⚠️ No Gemini recommendations, falling back to personalized TMDB trending...');
      
      // Get trending movies (get more than needed so we can filter)
      const trendingMovies = await getTrendingMovies();
      
      if (trendingMovies.length > 0) {
        // Use the smart personalized fallback
        recommendations = getPersonalizedFallback(trendingMovies, tasteProfile, 10);
        source = 'tmdb-trending-personalized';
        console.log(`✅ Personalized TMDB trending returned ${recommendations.length} recommendations`);
      }
    }

    // ✅ FINAL FALLBACK: If still nothing, use top rated with personalization
    if (recommendations.length === 0) {
      console.log('⚠️ No trending movies, falling back to personalized top rated...');
      
      const topRated = await getTopRatedMovies();
      
      if (topRated.length > 0) {
        recommendations = getPersonalizedFallback(topRated, tasteProfile, 10);
        source = 'tmdb-top-rated-personalized';
        console.log(`✅ Personalized TMDB top rated returned ${recommendations.length} recommendations`);
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
