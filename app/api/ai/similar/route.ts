import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
Recommend exactly 6 movies similar to this title.

Title: ${title}
Genre: ${genre}
Year: ${year}

Return only valid JSON. Do not include Markdown fences.
Use exactly this structure:

[
  { "title": "Movie title" }
]
`;

    const raw = await generateGeminiText(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let aiRecommendations: { title: string }[];

    try {
      aiRecommendations = JSON.parse(cleaned);
    } catch {
      console.error('Invalid Gemini recommendation JSON:', raw);

      return NextResponse.json(
        { error: 'Gemini returned invalid recommendation JSON' },
        { status: 502 }
      );
    }

    const tmdbKey = process.env.TMDB_API_KEY;

    if (!tmdbKey) {
      return NextResponse.json(
        { error: 'TMDB_API_KEY is missing' },
        { status: 500 }
      );
    }

    const recommendations = await Promise.all(
      aiRecommendations.slice(0, 6).map(async (movie) => {
        const url = new URL(
          'https://api.themoviedb.org/3/search/movie'
        );

        url.searchParams.set('api_key', tmdbKey);
        url.searchParams.set('query', movie.title);
        url.searchParams.set('language', 'en-US');
        url.searchParams.set('include_adult', 'false');

        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) return null;

        const data = await response.json();
        const match = data.results?.;[0]

        if (!match) return null;

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
