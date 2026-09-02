// app/api/tmdb/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TMDBClient } from '@/services/tmdb/client';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { action, tmdbId } = await request.json();
    const tmdb = new TMDBClient();

    if (action === 'trending') {
      const trending = await tmdb.getTrendingMovies('week');
      
      let synced = 0;
      for (const movie of trending.results) {
        const { data: existing } = await supabase
          .from('content')
          .select('id')
          .eq('title', movie.title)
          .single();

        if (!existing) {
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
        }
      }

      return NextResponse.json({ success: true, synced, total: trending.results.length });
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
