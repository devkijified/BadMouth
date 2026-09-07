import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const { movieId } = await params;

    const searchParams = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY!,
      language: 'en-US',
      page: '1',
    });

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/similar?${searchParams.toString()}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB request failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('TMDB similar movies error:', error);

    return NextResponse.json(
      { results: [], error: 'Could not load similar movies' },
      { status: 500 }
    );
  }
}
