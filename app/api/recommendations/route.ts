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

// Builds candidate pool dynamically from EVERY genre the user has an affinity score for,
// weighted by how strong that affinity is — no fixed/hardcoded genre list, no arbitrary
// top-N cutoff. Genres with near-zero affinity contribute near-zero query weight.
async function getMoviesForTasteProfile(tasteProfile: any) {
  const affinities: Record<string, number> = tasteProfile?.genre_affinities || {};
  const affinityEntries = Object.entries(affinities)
    .map(([genre, score]) => ({
      genreId: REVERSE_GENRE_MAP[genre.toLowerCase()],
      genre: genre.toLowerCase(),
      score: Number(score) || 0,
    }))
    .filter((e) => e.genreId !== undefined && e.score > 0)
    .sort((a, b) => b.score - a.score);

  if (affinityEntries.length === 0) {
    return [];
  }

  const maxScore = affinityEntries[0].score;
  const minRating = typeof tasteProfile?.min_rating === 'number' ? tasteProfile.min_rating : 6.0;
  const preferredDecades: number[] = Array.isArray(tasteProfile?.preferred_decades)
    ? tasteProfile.preferred_decades
    : [];
  const decadeParams = preferredDecades.length > 0
    ? preferredDecades.map((decade) => ({
        'primary_release_date.gte': `${decade}-01-01`,
        'primary_release_date.lte': `${decade + 9}-12-31`,
      }))
    : [{}];

  // Pages per genre scale with the user's affinity strength for that genre
  // relative to their strongest one — strong affinities get searched deeper.
  const requests: Promise<any[]>[] = [];

  for (const entry of affinityEntries) {
    const relativeStrength = entry.score / maxScore;
    const pagesToFetch = relativeStrength >= 0.75 ? 3 : relativeStrength >= 0.4 ? 2 : 1;

    for (const decadeParam of decadeParams) {
      for (let page = 1; page <= pagesToFetch; page++) {
        const params = new URLSearchParams({
          api_key: TMDB_API_KEY,
          language: 'en-US',
          with_genres: String(entry.genreId),
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

  // Also pull cross-genre combos for the strongest pair(s), so films matching
  // multiple high-affinity genres at once are represented in the pool too.
  if (affinityEntries.length >= 2) {
    const [first, second] = affinityEntries;
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      with_genres: `${first.genreId},${second.genreId}`,
      sort_by: 'vote_average.desc',
      'vote_count.gte': '75',
      'vote_average.gte': String(minRating),
      page: '1',
    });
    requests.push(
      fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data) => data.results || [])
        .catch(() => [])
    );
  }

  const results = await Promise.all(requests);
  const combined = results.flat();

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

// Scores every candidate against the FULL affinity map (every genre the user has a
// score for, not a fixed subset), normalized against the user's own strongest affinity.
function getPersonalizedFallback(
  movies: any[],
  tasteProfile: any,
  limit: number = 10
): any[] {
  if (!movies || movies.length === 0) return [];

  const affinities: Record<string, number> = tasteProfile?.genre_affinities || {};
  const excludedGenres: string[] = (tasteProfile?.excluded_genres || []).map((g: string) => g.toLowerCase());
  const preferredDecades: number[] = Array.isArray(tasteProfile?.preferred_decades)
    ? tasteProfile.preferred_decades
    : [];

  const affinityValues = Object.values(affinities).map((v: any) => Number(v) || 0);
  const maxAffinity = affinityValues.length > 0 ? Math.max(...affinityValues) : 1;

  const scored = movies.map((movie: any) => {
    const movieGenres: string[] = (movie.genre_ids || [])
      .map((id: number) => GENRE_MAP[id]?.toLowerCase())
      .filter(Boolean);

    const isExcluded = movieGenres.some((g) => excludedGenres.includes(g));
    if (isExcluded) {
      return { ...movie, personalizedScore: -1, _movieGenres: movieGenres };
    }

    let genreScore = 0;
    if (movieGenres.length > 0) {
      const matchedAffinities = movieGenres
        .map((g) => Number(affinities[g] ?? 0))
        .filter((v) => v > 0);

      if (matchedAffinities.length > 0) {
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

    const score =
      genreScore * 0.7 +
      decadeScore * 0.1 +
      qualityScore * 0.15 +
      popularityScore * 0.05;

    return { ...movie, personalizedScore: Math.min(score, 1.0), _movieGenres: movieGenres };
  });

  const filtered = scored.filter((m) => m.personalizedScore >= 0);
  const sorted = filtered.sort((a, b) => b.personalizedScore - a.personalizedScore);

  return sorted.slice(0, limit).map((movie: any) => {
    const genres = (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean);

    let reason = 'Matched to your profile.';
    const topMatchedGenre = movie._movieGenres
      ?.filter((g: string) => (affinities[g] ?? 0) > 0)
      .sort((a: string, b: string) => (affinities[b] ?? 0) - (affinities[a] ?? 0))[0];

    if (topMatchedGenre) {
      const genreLabel = GENRE_MAP[REVERSE_GENRE_MAP[topMatchedGenre]] || topMatchedGenre;
      const affinityPct = Math.round(((affinities[topMatchedGenre] || 0) / maxAffinity) * 100);
      reason = `Selected because you love ${genreLabel} (${affinityPct}% match to your top taste).`;
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
