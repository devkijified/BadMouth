import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const { movieId } = await params;

    if (!movieId) {
      return NextResponse.json(
        { error: 'Movie ID is required' },
        { status: 400 }
      );
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY;

    /*
     * IMPORTANT:
     * TMDB_API_KEY is SERVER-ONLY.
     *
     * Do NOT rename this to:
     * NEXT_PUBLIC_TMDB_API_KEY
     */

    if (!TMDB_API_KEY) {
      console.error(
        'TMDB_API_KEY is missing from server environment'
      );

      return NextResponse.json(
        {
          error: 'TMDB API configuration missing',
        },
        { status: 500 }
      );
    }

    const baseUrl =
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(
        movieId
      )}`;

    const apiKey = encodeURIComponent(
      TMDB_API_KEY
    );

    /*
     * Fetch all required TMDB data in parallel.
     */
    const [
      movieRes,
      creditsRes,
      videosRes,
      providersRes,
    ] = await Promise.all([
      fetch(
        `${baseUrl}?api_key=${apiKey}&language=en-US&append_to_response=release_dates`,
        {
          cache: 'no-store',
        }
      ),

      fetch(
        `${baseUrl}/credits?api_key=${apiKey}&language=en-US`,
        {
          cache: 'no-store',
        }
      ),

      fetch(
        `${baseUrl}/videos?api_key=${apiKey}&language=en-US`,
        {
          cache: 'no-store',
        }
      ),

      fetch(
        `${baseUrl}/watch/providers?api_key=${apiKey}`,
        {
          cache: 'no-store',
        }
      ),
    ]);

    /*
     * If TMDB itself rejects the movie request,
     * return the appropriate error.
     */
    if (!movieRes.ok) {
      const errorBody = await movieRes
        .text()
        .catch(() => '');

      console.error(
        'TMDB movie request failed:',
        movieRes.status,
        errorBody
      );

      return NextResponse.json(
        {
          error: 'Failed to fetch movie from TMDB',
          status: movieRes.status,
        },
        {
          status: movieRes.status,
        }
      );
    }

    /*
     * Parse responses.
     *
     * Some endpoints can fail independently, so we
     * still return whatever data is available.
     */
    const movie = await movieRes.json();

    let credits = null;
    let videos = null;
    let providers = null;

    if (creditsRes.ok) {
      credits = await creditsRes.json();
    } else {
      console.error(
        'TMDB credits request failed:',
        creditsRes.status
      );
    }

    if (videosRes.ok) {
      videos = await videosRes.json();
    } else {
      console.error(
        'TMDB videos request failed:',
        videosRes.status
      );
    }

    if (providersRes.ok) {
      providers = await providersRes.json();
    } else {
      console.error(
        'TMDB providers request failed:',
        providersRes.status
      );
    }

    /*
     * Return one clean response to the client.
     *
     * The API key NEVER appears here.
     */
    return NextResponse.json(
      {
        movie,
        credits,
        videos,
        providers,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      'Unexpected TMDB API route error:',
      error
    );

    return NextResponse.json(
      {
        error: 'Internal server error while fetching TMDB data',
      },
      {
        status: 500,
      }
    );
  }
}
