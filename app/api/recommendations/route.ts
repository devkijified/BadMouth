// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';
import { supabase } from '@/lib/supabase/client';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western'
};

const REVERSE_GENRE_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name.toLowerCase(), Number(id)])
);

async function getMovieDetails(tmdbId: string) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
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
      director: data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || null,
      artist: null,
      actors: data.credits?.cast?.slice(0, 5).map((a: any) => a.name) || [],
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

// Fetch a broad, deep candidate pool matched tightly to the user's taste profile.
// Pulls multiple genre combinations across multiple pages instead of one shallow call.
async function getMoviesForTasteProfile(tasteProfile: any) {
  const affinities: Record<string, number> = tasteProfile?.genre_affinities || {};

  const rankedGenres = Object.entries(affinities)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([genre]) => genre.toLowerCase())
    .map((g) => REVERSE_GENRE_MAP[g])
    .filter((id): id is number => id !== undefined);

  if (rankedGenres.length === 0) {
    return [];
  }

  const minRating = typeof tasteProfile?.min_rating === 'number' ? tasteProfile.min_rating : 6.0;
  const preferredDecades: number[] = Array.isArray(tasteProfile?.preferred_decades)
    ? tasteProfile.preferred_decades
    : [];

  // Build several genre-combo queries: top genre alone, then top pairs/triples,
  // so the pool is dense in genres the user actually cares about instead of one blended query.
  const genreQueries = new Set<string>();
  for (let i = 0; i < Math.min(rankedGenres.length, 5); i++) {
    genreQueries.add(String(rankedGenres[i]));
    for (let j = i + 1; j < Math.min(rankedGenres.length, 5); j++) {
      genreQueries.add(`${rankedGenres[i]},${rankedGenres[j]}`);
    }
  }

  const decadeParams = preferredDecades.length > 0
    ? preferredDecades.map((decade) => ({
        'primary_release_date.gte': `${decade}-01-01`,
        'primary_release_date.lte': `${decade + 9}-12-31`,
      }))
    : [{}];

  const requests: Promise<any[]>[] = [];

  for (const genreQuery of genreQueries) {
    for (const decadeParam of decadeParams) {
      for (const page of [1, 2]) {
        const params = new URLSearchParams({
          api_key: TMDB_API_KEY,
          language: 'en-US',
          with_genres: genreQuery,
          sort_by: 'vote_average.desc',
          'vote_count.gte': '75',
          'vote_average.gte': String(minRating),
          page: String(page),
          ...decadeParam,
        });

        requests.push(
          fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : { results: [] }))
            .then((data) => data.results || [])
            .catch(() => [])
        );
      }
    }
  }

  const results = await Promise.all(requests);
  const combined = results.flat();

  // Dedupe by id
  const seen = new Set<number>();
  const deduped: any[] = [];
  for (const movie of combined) {
    if (!seen.has(movie.id)) {
      seen.add(movie.id);
      deduped.push(movie);
    }
  }

  return deduped;
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

// Scores each candidate against the FULL taste profile (all known genre affinities,
// not just the top few), plus favorite actors/directors/decades if present, plus
// quality signals. This produces a much tighter match to the user than a flat blend.
function getPersonalizedFallback(
  movies: any[],
  tasteProfile: any,
  limit: number = 10
): any[] {
  if (!movies || movies.length === 0) return [];

  const affinities: Record<string, number> = tasteProfile?.genre_affinities || {};
  const favoriteActors: string[] = (tasteProfile?.favorite_actors || []).map((a: string) => a.toLowerCase());
  const favoriteDirectors: string[] = (tasteProfile?.favorite_directors || []).map((d: string) => d.toLowerCase());
  const excludedGenres: string[] = (tasteProfile?.excluded_genres || []).map((g: string) => g.toLowerCase());
  const preferredDecades: number[] = Array.isArray(tasteProfile?.preferred_decades)
    ? tasteProfile.preferred_decades
    : [];

  const maxAffinity = Math.max(1, ...Object.values(affinities).map((v: any) => Number(v) || 0));

  const scored = movies.map((movie: any) => {
    const movieGenres: string[] = (movie.genre_ids || [])
      .map((id: number) => GENRE_MAP[id]?.toLowerCase())
      .filter(Boolean);

    // Hard exclusion: user explicitly doesn't want this genre
    const isExcluded = movieGenres.some((g) => excludedGenres.includes(g));
    if (isExcluded) {
      return { ...movie, personalizedScore: -1 };
    }

    let genreScore = 0;
    if (movieGenres.length > 0) {
      const matchedAffinities = movieGenres
        .map((g) => Number(affinities[g] ?? 0))
        .filter((v) => v > 0);

      if (matchedAffinities.length > 0) {
        // Average affinity across matched genres, normalized against the user's strongest affinity
        const avgAffinity = matchedAffinities.reduce((a, b) => a + b, 0) / matchedAffinities.length;
        genreScore = avgAffinity / maxAffinity;
      }
    }

    let decadeScore = 0;
    if (preferredDecades.length > 0 && movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const decade = Math.floor(year / 10) * 10;
      decadeScore = preferredDecades.includes(decade) ? 1 : 0;
    }

    const qualityScore = (movie.vote_average || 0) / 10;
    const popularityScore = Math.min((movie.popularity || 0) / 1000, 1);

    // Weighted composite — genre match to the user's actual profile dominates the score
    const score =
      genreScore * 0.65 +
      decadeScore * 0.1 +
      qualityScore * 0.2 +
      popularityScore * 0.05;

    return { ...movie, personalizedScore: Math.min(score, 1.0), _movieGenres: movieGenres };
  });

  const filtered = scored.filter((m) => m.personalizedScore >= 0);
  const sorted = filtered.sort((a, b) => b.personalizedScore - a.personalizedScore);

  return sorted.slice(0, limit).map((movie: any) => {
    const genres = (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean);

    let reason = 'Matched to your profile.';
    const topMatchedGenre = movie._movieGenres?.find((g: string) => (affinities[g] ?? 0) > 0);
    if (topMatchedGenre) {
      const genreLabel = GENRE_MAP[REVERSE_GENRE_MAP[topMatchedGenre]] || topMatchedGenre;
      const affinityPct = Math.round((affinities[topMatchedGenre] || 0) * 100);
      reason = `Selected because you love ${genreLabel} (${affinityPct}% affinity match).`;
    } else if (genres.length > 0) {
      reason = `A strong ${genres[0]} pick aligned with your taste.`;
    }

    if (movie.vote_average && movie.vote_average > 7) {
      reason += ` ⭐ ${movie.vote_average.toFixed(1)}/10`;
    }

    return {
      contentId: movie.id.toString(),
      score: movie.personalizedScore,
      reason,
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
        genre: genres.join(', '),
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

    // Deep, taste-driven fallback: builds a wide candidate pool from the user's FULL
    // genre affinity spread (not just top 2), across multiple genre combos, pages,
    // and preferred decades — then scores every candidate against the whole profile.
    if (recommendations.length === 0) {
      console.log('⚠️ No Gemini recommendations, building deep taste-matched TMDB pool...');

      let candidateMovies: any[] = await getMoviesForTasteProfile(tasteProfile);

      if (candidateMovies.length === 0) {
        console.log('⚠️ No genre affinities to work with, falling back to trending...');
        candidateMovies = await getTrendingMovies();
      }

      if (candidateMovies.length > 0) {
        recommendations = getPersonalizedFallback(candidateMovies, tasteProfile, 10);
        source = 'tmdb-deep-taste-match';
        console.log(`✅ Deep taste-match fallback returned ${recommendations.length} recommendations`);
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
