// app/api/tmdb/movie/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;

    if (!TMDB_API_KEY) {
      console.error('❌ TMDB_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    console.log(`🎬 Fetching TMDB details for movie: ${movieId}`);

    // Fetch movie details with all required append data
    const movieRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=release_dates,credits,videos`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!movieRes.ok) {
      console.error(`❌ TMDB API error: ${movieRes.status}`);
      return NextResponse.json(
        { error: `TMDB API error: ${movieRes.status}` },
        { status: movieRes.status }
      );
    }

    const movieData = await movieRes.json();

    // Fetch watch providers separately (different endpoint)
    const providersRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }
      }
    );
    const providersData = providersRes.ok ? await providersRes.json() : null;

    return NextResponse.json({
      movie: movieData,
      credits: movieData.credits || null,
      videos: movieData.videos || null,
      providers: providersData,
    });

  } catch (error: any) {
    console.error('❌ TMDB route error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
