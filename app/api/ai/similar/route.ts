import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.warn('TMDB_API_KEY is not configured');
}

type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function searchTmdbMovie(title: string) {
  if (!TMDB_API_KEY) return null;

  const url = new URL(
    'https://api.themoviedb.org/3/search/movie'
  );

  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', title);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('include_adult', 'false');

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('TMDB search failed:', {
      title,
      status: response.status,
    });

    return null;
  }

  const data = await response.json();

  return (data.results?.[0] || null) as TmdbMovie | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();

    if (!title) {
      return NextResponse.json(
        { error: 'Movie title is required' },
        { status: 400 }
      );
    }

    const aiProvider = getAIProvider();

    const result = await aiProvider.generateSimilarMovies({
      title,
      genre: body.genre || '',
      year: body.year || '',
    });

    const recommendations = await Promise.all(
      result.titles.map(async (movieTitle) => {
        const movie = await searchTmdbMovie(movieTitle);

        if (!movie) return null;

        return {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          overview: movie.overview,
        };
      })
    );

    return NextResponse.json({
      recommendations: recommendations.filter(Boolean),
    });
  } catch (error) {
    console.error('AI similar API error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI recommendations failed',
      },
      { status: 500 }
    );
  }
}
