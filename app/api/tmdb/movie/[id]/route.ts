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
        { 
          error: 'TMDB API key not configured',
          fallback: true 
        },
        { status: 500 }
      );
    }

    // Validate movie ID
    if (!movieId || isNaN(parseInt(movieId))) {
      console.error(`❌ Invalid movie ID: ${movieId}`);
      return NextResponse.json(
        { 
          error: 'Invalid movie ID',
          fallback: true 
        },
        { status: 400 }
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

    // Handle TMDB API errors
    if (!movieRes.ok) {
      console.error(`❌ TMDB API error: ${movieRes.status}`);
      
      // Try alternative with different language or fallback
      if (movieRes.status === 404) {
        return NextResponse.json(
          { 
            error: 'Movie not found on TMDB',
            fallback: true 
          },
          { status: 404 }
        );
      }
      
      if (movieRes.status === 429) {
        return NextResponse.json(
          { 
            error: 'TMDB rate limit exceeded. Please try again later.',
            fallback: true 
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: `TMDB API error: ${movieRes.status}`,
          fallback: true 
        },
        { status: movieRes.status }
      );
    }

    const movieData = await movieRes.json();

    // Verify we got valid data
    if (!movieData || !movieData.id) {
      console.error('❌ Invalid TMDB response');
      return NextResponse.json(
        { 
          error: 'Invalid response from TMDB',
          fallback: true 
        },
        { status: 500 }
      );
    }

    // Fetch watch providers separately (different endpoint)
    let providersData = null;
    try {
      const providersRes = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`,
        {
          headers: {
            'Accept': 'application/json',
          },
          next: { revalidate: 3600 }
        }
      );
      providersData = providersRes.ok ? await providersRes.json() : null;
    } catch (providerError) {
      console.warn('⚠️ Failed to fetch watch providers:', providerError);
      // Continue without providers
    }

    return NextResponse.json({
      movie: movieData,
      credits: movieData.credits || null,
      videos: movieData.videos || null,
      providers: providersData,
    });

  } catch (error: any) {
    console.error('❌ TMDB route error:', error.message);
    
    // Check for specific errors
    if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
      return NextResponse.json(
        { 
          error: 'Network error connecting to TMDB',
          fallback: true 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        fallback: true 
      },
      { status: 500 }
    );
  }
}
