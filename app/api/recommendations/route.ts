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

const SORT_OPTIONS = ['vote_average.desc', 'popularity.desc', 'vote_count.desc'];

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

async function fetchDiscover(params: Record<string, string>) {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'en-US', ...params });
  try {
    const res = await fetch(`${TMDB_BASE_URL}/discover/movie?${query.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// Fetches a genre's movie pool at a randomized page for variety, but GUARANTEES
// a non-empty attempt by retrying at page 1 (with relaxed vote_count) if the
// randomized page comes back empty — this is what was causing refreshes to
// silently starve and fall through to trending.
async function fetchGenrePool(genreId: number, page: number, minRating: number, decadeParam: Record<string, string>, sortBy: string) {
  let results = await fetchDiscover({
    with_genres: String(genreId),
    sort_by: sortBy,
    'vote_count.gte': '75',
    'vote_average.gte': String(minRating),
    page: String(page),
    ...decadeParam,
  });

  if (results.length === 0 && page !== 1) {
    results = await fetchDiscover({
      with_genres: String(genreId),
      sort_by: sortBy,
      'vote_count.gte': '75',
      'vote_average.gte': String(minRating),
      page: '1',
      ...decadeParam,
    });
  }

  if (results.length === 0) {
    results = await fetchDiscover({
      with_genres: String(genreId),
      sort_by: sortBy,
      'vote_count.gte': '25',
      page: '1',
      ...decadeParam,
    });
  }

  return results;
}

async function getMoviesForTasteProfile(tasteProfile: any, shuffleOffset: number = 1) {
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

  const sortBy = SORT_OPTIONS[(shuffleOffset - 1) % SORT_OPTIONS.length];

  const requests: Promise<any[]>[] = [];

  for (const entry of affinityEntries) {
    const relativeStrength = entry.score / maxScore;
    // Cap at page 3 max — deeper pages under strict filters run dry, which was
    // the root cause of the empty-pool bug. Strong affinities still get more
    // coverage via multiple pages, just kept inside a safe range.
    const maxPage = relativeStrength >= 0.75 ? 3 : relativeStrength >= 0.4 ? 2 : 1;
    const targetPage = ((shuffleOffset - 1) % maxPage) + 1;

    for (const decadeParam of decadeParams) {
      requests.push(fetchGenrePool(entry.genreId, targetPage, minRating, decadeParam, sortBy));
    }
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

async function getTrendingMovies(shufflePage: number = 1) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US&page=${shufflePage}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching trending:', error);
    return [];
  }
}

async function getTopRatedMovies(shufflePage: number = 1) {
  return fetchDiscover({
    sort_by: 'vote_average.desc',
    'vote_count.gte': '100',
    page: String(shufflePage),
  });
}

function getPersonalizedFallback(
  movies: any[],
  tasteProfile: any,
  limit: number = 10,
  minMatchThreshold: number = 0.35
): any[] {
  if (!movies || movies.length === 0) return [];

  const affinities: Record<string, number> = tasteProfile?.genre_affinities || {};
  const excludedGenres: string[] = (tasteProfile?.excluded_genres || []).map((g: string) => g.toLowerCase());
  const preferredDecades: number[] = Array.isArray(tasteProfile?.preferred_decades)
    ? tasteProfile.preferred_decades
    : [];

  const affinityValues = Object.values(affinities).map((v: any) => Number(v) || 0);
  const hasAffinities = affinityValues.length > 0;
  const maxAffinity = hasAffinities ? Math.max(...affinityValues) : 1;

  const scored = movies.map((movie: any) => {
    const movieGenres: string[] = (movie.genre_ids || [])
      .map((id: number) => GENRE_MAP[id]?.toLowerCase())
      .filter(Boolean);

    const isExcluded = movieGenres.some((g) => excludedGenres.includes(g));
    if (isExcluded) {
      return { ...movie, personalizedScore: -1, _movieGenres: movieGenres };
    }

    let genreScore = hasAffinities ? 0 : 0.5;
    if (hasAffinities && movieGenres.length > 0) {
      const matchedAffinities = movieGenres
        .map((g) => Number(affinities[g] ?? 0))
        .filter((v) => v > 0);

      if (matchedAffinities.length > 0) {
        const avgAffinity = matchedAffinities.reduce((a, b) => a + b, 0) / matchedAffinities.length;
        genreScore = avgAffinity / maxAffinity;
      }
    }

    let decadeScore = preferredDecades.length > 0 ? 0.5 : 1;
    if (preferredDecades.length > 0 && movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const decade = Math.floor(year / 10) * 10;
      decadeScore = preferredDecades.includes(decade) ? 1 : 0.2;
    }

    const qualityScore = (movie.vote_average || 0) / 10;

    const score =
      genreScore * 0.65 +
      decadeScore * 0.15 +
      qualityScore * 0.20;

    return { ...movie, personalizedScore: Math.min(score, 1.0), _movieGenres: movieGenres };
  });

  let filtered = scored.filter((m) => m.personalizedScore >= minMatchThreshold);
  if (filtered.length === 0) {
    filtered = scored.filter((m) => m.personalizedScore >= 0.15);
  }
  if (filtered.length === 0) {
    filtered = scored.filter((m) => m.personalizedScore >= 0);
  }

  const sorted = filtered.sort((a, b) => b.personalizedScore - a.personalizedScore);

  return sorted.slice(0, limit).map((movie: any) => {
    const genres = (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean);
    const matchPercentage = Math.round(movie.personalizedScore * 100);

    let reason = `Matched to your profile (${matchPercentage}% match).`;
    const topMatchedGenre = movie._movieGenres
      ?.filter((g: string) => (affinities[g] ?? 0) > 0)
      .sort((a: string, b: string) => (affinities[b] ?? 0) - (affinities[a] ?? 0))[0];

    if (topMatchedGenre) {
      const genreLabel = GENRE_MAP[REVERSE_GENRE_MAP[topMatchedGenre]] || topMatchedGenre;
      reason = `Selected because you love ${genreLabel} (${matchPercentage}% match to your taste).`;
    } else if (genres.length > 0) {
      reason = `A strong ${genres[0]} pick aligned with your taste (${matchPercentage}% match).`;
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

function mapMoviesDirectly(movies: any[], limit: number = 10): any[] {
  return movies.slice(0, limit).map((movie: any) => {
    const genres = (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean);
    let reason = 'Popular pick right now.';
    if (movie.vote_average && movie.vote_average > 7) {
      reason += ` ⭐ ${movie.vote_average.toFixed(1)}/10`;
    }
    return {
      contentId: movie.id.toString(),
      score: (movie.vote_average || 0) / 10,
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

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    console.log('🎯 Fetching recommendations for user:', userId, { forceRefresh });

    let recommendations: any[] = [];
    let source = 'none';

    // 1. Cache check — skipped entirely when forceRefresh=true (manual refresh button),
    // and naturally bypassed once it's older than 12h (auto-refresh on next load).
    if (!forceRefresh) {
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('user_recommendation_cache')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!cacheError && cachedData) {
          const cachedTime = new Date(cachedData.updated_at).getTime();
          const twelveHoursInMs = 12 * 60 * 60 * 1000;
          const now = Date.now();

          if (now - cachedTime < twelveHoursInMs && cachedData.recommendations?.length > 0) {
            console.log('⚡ Serving recommendations from 12-hour cache');
            return NextResponse.json({
              success: true,
              recommendations: cachedData.recommendations,
              metadata: { source: cachedData.source || 'cache', cached: true }
            });
          }
        }
      } catch (cacheError) {
        console.log('Cache check skipped (table may not exist):', cacheError);
      }
    }

    // 2. Fetch Taste Profile
    const { data: tasteProfile, error: tasteError } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tasteError) {
      console.error('Error fetching taste profile:', tasteError);
    }

    console.log('📊 Taste profile found:', tasteProfile ? 'Yes' : 'No');

    const randomShuffleOffset = Math.floor(Math.random() * 3) + 1;

    // 3. Try Gemini AI Provider
    if (tasteProfile) {
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

        console.log('📊 Gemini response count:', result.recommendations?.length || 0);

        if (result.recommendations && result.recommendations.length > 0) {
          const merged = await Promise.all(
            result.recommendations.map(async (rec: any) => {
              try {
                const tmdbData = await getMovieDetails(rec.contentId);
                if (tmdbData) {
                  return { ...rec, content: tmdbData };
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
    }

    // 4. Deep taste-match fallback — now retries page 1 per-genre before ever
    // touching trending, so a bad random page can't blank out the pool.
    if (recommendations.length === 0) {
      console.log('⚠️ Building deep taste-matched TMDB pool...');
      let candidateMovies: any[] = [];

      try {
        candidateMovies = await getMoviesForTasteProfile(tasteProfile, randomShuffleOffset);
        console.log(`📊 Found ${candidateMovies.length} candidate movies from taste match`);
      } catch (error) {
        console.error('Error getting taste-matched movies:', error);
      }

      if (candidateMovies.length === 0) {
        console.log('⚠️ No taste-matched movies, falling back to trending...');
        try {
          candidateMovies = await getTrendingMovies(randomShuffleOffset);
        } catch (error) {
          console.error('Error getting trending movies:', error);
        }
      }

      if (candidateMovies.length > 0) {
        recommendations = getPersonalizedFallback(candidateMovies, tasteProfile, 10);
        source = 'tmdb-deep-taste-match';
        console.log(`✅ Deep taste match returned ${recommendations.length} recommendations`);
      }
    }

    // 5. Fallback to Top Rated (scored)
    if (recommendations.length === 0) {
      console.log('⚠️ Falling back to top rated...');
      try {
        const topRated = await getTopRatedMovies(randomShuffleOffset);
        if (topRated.length > 0) {
          recommendations = getPersonalizedFallback(topRated, tasteProfile, 10);
          source = 'tmdb-top-rated-personalized';
        }
      } catch (error) {
        console.error('Error getting top rated movies:', error);
      }
    }

    // 6. Absolute last resort — guarantees the block is never empty
    if (recommendations.length === 0) {
      console.log('🆘 All personalized paths returned nothing — using raw fallback...');
      try {
        let rawMovies = await getTrendingMovies(1);
        if (rawMovies.length === 0) {
          rawMovies = await getTopRatedMovies(1);
        }
        if (rawMovies.length > 0) {
          recommendations = mapMoviesDirectly(rawMovies, 10);
          source = 'tmdb-raw-fallback';
        }
      } catch (error) {
        console.error('Raw fallback also failed:', error);
      }
    }

    // 7. Cache
    if (recommendations.length > 0) {
      try {
        await supabase
          .from('user_recommendation_cache')
          .upsert({
            user_id: userId,
            recommendations,
            source,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log('💾 Cache saved successfully');
      } catch (cacheError) {
        console.log('Cache save skipped (table may not exist):', cacheError);
      }
    }

    console.log(`✅ Returning ${recommendations.length} recommendations from source: ${source}`);

    return NextResponse.json({
      success: true,
      recommendations,
      metadata: { source, cached: false }
    });

  } catch (error: any) {
    console.error('❌ Recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
