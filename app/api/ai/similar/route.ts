import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AiRecommendation = {
  title: string;
};

type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();
    const genre = String(body.genre || '').trim();
    const year = body.year || '';

    if (!title) {
      return NextResponse.json(
        { error: 'Movie title is required' },
        { status: 400 }
      );
    }

    const prompt = `
Recommend exactly 6 movies similar to this movie.

Movie title: ${title}
Genre: ${genre}
Year: ${year}

Return only valid JSON.
Do not include Markdown code fences.
Use exactly this format:

[
  { "title": "Movie title" },
  { "title": "Movie title" }
]
`;

    const raw = await generateGeminiText(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let aiRecommendations: AiRecommendation[];

    try {
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Gemini response is not an array');
      }

      aiRecommendations = parsed.filter(
        (movie): movie is AiRecommendation =>
          movie &&
          typeof movie === 'object' &&
          typeof movie.title === 'string' &&
          movie.title.trim().length > 0
      );
    } catch (error) {
      console.error('Invalid Gemini recommendation JSON:', {
        raw,
        error,
      });

      return NextResponse.json(
        { error: 'Gemini returned invalid recommendation data' },
        { status: 502 }
      );
    }

    const tmdbApiKey = process.env.TMDB_API_KEY;

    if (!tmdbApiKey) {
      return NextResponse.json(
        { error: 'TMDB_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const recommendations = await Promise.all(
      aiRecommendations.slice(0, 6).map(async (movie) => {
        const searchUrl = new URL(
          'https://api.themoviedb.org/3/search/movie'
        );

        searchUrl.searchParams.set('api_key', tmdbApiKey);
        searchUrl.searchParams.set('query', movie.title);
        searchUrl.searchParams.set('language', 'en-US');
        searchUrl.searchParams.set('include_adult', 'false');

        const response = await fetch(searchUrl.toString(), {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          console.error('TMDB recommendation search failed:', {
            title: movie.title,
            status: response.status,
          });

          return null;
        }

        const data = await response.json();

        // Correct syntax: optional chaining followed immediately by[0]
        const match: TmdbMovie | undefined = data.results?.[0];

        if (!match) {
          return null;
        }

        return {
          id: match.id,
          title: match.title,
          poster_path: match.poster_path,
          release_date: match.release_date,
          overview: match.overview,
        };
      })
    );

    return NextResponse.json({
      recommendations: recommendations.filter(Boolean),
    });
  } catch (error) {
    console.error('Similar movies API error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}
