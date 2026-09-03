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
      return NextResponse.json({ 
        success: false, 
        error: 'API key not configured',
        fallback: true 
      });
    }

    console.log(`🔍 Fetching streaming links for movie ID: ${movieId}`);

    // Step 1: Search for the movie by TMDB ID
    const searchResponse = await fetch(
      `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_field=imdb_id&search_value=${movieId}`
    );

    if (!searchResponse.ok) {
      console.error(`Search API error: ${searchResponse.status}`);
      
      // Try searching by title fallback
      return NextResponse.json({ 
        success: false, 
        error: 'Movie not found',
        fallback: true 
      });
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.title_results || searchData.title_results.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No streaming sources found',
        fallback: true 
      });
    }

    // Get the first result's source ID
    const sourceId = searchData.title_results[0].id;
    console.log(`📺 Found source ID: ${sourceId}`);

    // Step 2: Get streaming sources
    const sourcesResponse = await fetch(
      `https://api.watchmode.com/v1/title/${sourceId}/sources/?apiKey=${API_KEY}&regions=US`
    );

    if (!sourcesResponse.ok) {
      console.error(`Sources API error: ${sourcesResponse.status}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch sources',
        fallback: true 
      });
    }

    const sourcesData = await sourcesResponse.json();

    // Format the streaming links
    const streamingLinks = (sourcesData || []).map((source: any) => {
      // Map Watchmode source IDs to provider names
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

    // Filter out sources without links
    const validLinks = streamingLinks.filter((link: any) => link.link && link.link !== '');

    console.log(`✅ Found ${validLinks.length} valid streaming links`);

    return NextResponse.json({ 
      success: true, 
      links: validLinks,
      sourceId,
    });

  } catch (error: any) {
    console.error('❌ Streaming API error:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch streaming data',
      fallback: true 
    });
  }
}
