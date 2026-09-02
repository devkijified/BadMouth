// scripts/sync-tmdb.ts
import { TMDBClient } from '../services/tmdb/client';
import { supabase } from '../lib/supabase/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function syncTMDB() {
  console.log('🔄 Syncing TMDB movies...');
  
  const tmdb = new TMDBClient();

  try {
    const trending = await tmdb.getTrendingMovies('week');
    console.log(`📊 Found ${trending.results.length} trending movies`);

    let synced = 0;
    let skipped = 0;

    for (const movie of trending.results) {
      const { data: existing } = await supabase
        .from('content')
        .select('id')
        .eq('title', movie.title)
        .single();

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
  } catch (error: any) {
    console.error('❌ Sync error:', error.message);
  }
}

syncTMDB();
