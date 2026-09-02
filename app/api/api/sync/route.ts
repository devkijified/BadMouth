// app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { TMDBClient } from '@/services/tmdb/client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting TMDB sync...');
    
    const tmdb = new TMDBClient();
    const trending = await tmdb.getTrendingMovies('week');
    
    console.log(`📊 Found ${trending.results.length} trending movies`);
    
    let synced = 0;
    let skipped = 0;
    
    for (const movie of trending.results) {
      // Check if content exists
      const { data: existing } = await supabase
        .from('content')
        .select('id')
        .eq('title', movie.title)
        .maybeSingle();

      if (!existing) {
        console.log(`📝 Adding: ${movie.title}`);
        const details = await tmdb.getMovieDetails(movie.id);
        
        await supabase.from('content').insert({
          title: details.title,
          description: details.overview,
          image_url: tmdb.getImageUrl(details.poster_path),
          backdrop_url: tmdb.getBackdropUrl(details.backdrop_path),
          type: 'movie',
          year: new Date(details.release_date).getFullYear(),
          rating: details.vote_average,
          rating_count: details.vote_count,
          genre: details.genres?.map((g: any) => g.name).join(', '),
          runtime: `${details.runtime} min`,
        });
        synced++;
      } else {
        skipped++;
      }
    }

    console.log(`✅ Sync complete: ${synced} added, ${skipped} skipped`);
    return NextResponse.json({ 
      success: true, 
      synced, 
      skipped,
      total: trending.results.length 
    });
    
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Optional: POST method to handle different sync types
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tmdbId } = body;
    const tmdb = new TMDBClient();

    if (action === 'trending') {
      // Same as GET
      return await GET(request);
    }

    if (action === 'movie' && tmdbId) {
      const details = await tmdb.getMovieDetails(parseInt(tmdbId));
      await supabase.from('content').insert({
        title: details.title,
        description: details.overview,
        image_url: tmdb.getImageUrl(details.poster_path),
        backdrop_url: tmdb.getBackdropUrl(details.backdrop_path),
        type: 'movie',
        year: new Date(details.release_date).getFullYear(),
        rating: details.vote_average,
        rating_count: details.vote_count,
        genre: details.genres?.map((g: any) => g.name).join(', '),
        runtime: `${details.runtime} min`,
      });
      return NextResponse.json({ success: true, movie: details.title });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
