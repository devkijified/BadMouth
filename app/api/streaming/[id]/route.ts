// app/api/streaming/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const API_KEY = process.env.WATCHMODE_API_KEY;
    const movieId = params.id;

    if (!API_KEY) {
      console.warn('⚠️ WATCHMODE_API_KEY not set');
      return NextResponse.json(
        { success: false, error: 'API key not configured', fallback: true },
        { status: 200 }
      );
    }

    console.log(`🔍 Fetching streaming links for TMDB movie ID: ${movieId}`);

    // Step 1: Search by TMDB id directly — Watchmode supports this field natively,
    // so there's no need to convert to IMDB id first.
    const searchResponse = await fetch(
      `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_field=tmdb_movie_id&search_value=${movieId}`
    );

    if (!searchResponse.ok) {
      const body = await searchResponse.text().catch(() => '');
      console.error(`Watchmode search API error: ${searchResponse.status}`, body);
      return NextResponse.json(
        { success: false, error: `Watchmode search failed (${searchResponse.status})`, fallback: true },
        { status: 200 }
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.title_results || searchData.title_results.length === 0) {
      console.log('ℹ️ Watchmode has no title matching this TMDB id');
      return NextResponse.json(
        { success: false, error: 'No streaming sources found for this title', fallback: true },
        { status: 200 }
      );
    }

    const sourceId = searchData.title_results[0].id;
    console.log(`📺 Found Watchmode source ID: ${sourceId}`);

    // Step 2: Get streaming sources for that title
    const sourcesResponse = await fetch(
      `https://api.watchmode.com/v1/title/${sourceId}/sources/?apiKey=${API_KEY}&regions=US`
    );

    if (!sourcesResponse.ok) {
      const body = await sourcesResponse.text().catch(() => '');
      console.error(`Watchmode sources API error: ${sourcesResponse.status}`, body);
      return NextResponse.json(
        { success: false, error: `Failed to fetch sources (${sourcesResponse.status})`, fallback: true },
        { status: 200 }
      );
    }

    const sourcesData = await sourcesResponse.json();

    // Watchmode sometimes returns an error object instead of an array — guard against that
    if (!Array.isArray(sourcesData)) {
      console.error('Unexpected sources response shape:', sourcesData);
      return NextResponse.json(
        { success: false, error: 'Unexpected response from Watchmode', fallback: true },
        { status: 200 }
      );
    }

    const providerMap: Record<number, string> = {
      26: 'Prime Video',
      27: 'iTunes',
      28: 'Google Play',
      34: 'Hulu',
      35: 'Vudu',
      42: 'YouTube',
      70: 'HBO Max',
      81: 'Disney+',
      97: 'Netflix',
      100: 'Peacock',
      103: 'Paramount+',
      115: 'Apple TV+',
      120: 'Max',
      150: 'MGM+',
      190: 'Starz',
      200: 'Showtime',
    };

    const streamingLinks = sourcesData.map((source: any) => {
      const providerName = providerMap[source.source_id] || source.name || source.source_name || 'Unknown';
      return {
        provider: providerName,
        providerId: source.source_id,
        link: source.web_url || source.deeplink || '',
        type: source.type || 'flatrate', // sub, rent, buy, free
        quality: source.quality || 'HD',
        price: source.price || null,
        audio: source.audio || [],
        subtitles: source.subtitles || [],
      };
    });

    const validLinks = streamingLinks.filter((link: any) => link.link && link.link !== '');
    console.log(`✅ Found ${validLinks.length} valid streaming links`);

    return NextResponse.json({ success: true, links: validLinks, sourceId });
  } catch (error: any) {
    console.error('❌ Streaming API error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch streaming data', fallback: true },
      { status: 200 }
    );
  }
}
