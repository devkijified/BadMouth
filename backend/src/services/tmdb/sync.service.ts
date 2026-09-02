// backend/src/services/tmdb/sync.service.ts
import { supabase } from '../supabase/client';
import { TMDBClient } from './client';
import { TMDBMovie, TMDBPerson } from './types';

export class TMDBSyncService {
  private tmdb: TMDBClient;
  
  constructor(tmdbClient: TMDBClient) {
    this.tmdb = tmdbClient;
  }

  async syncTrendingMovies(): Promise<{ syncedCount: number; skippedCount: number }> {
    console.log('🔄 Syncing trending movies from TMDB...');
    
    try {
      const trending = await this.tmdb.getTrendingMovies('week');
      console.log(`📊 Found ${trending.results.length} trending movies`);
      
      let syncedCount = 0;
      let skippedCount = 0;
      
      for (const movie of trending.results) {
        // Check if content exists
        const { data: existing } = await supabase
          .from('content')
          .select('id')
          .eq('title', movie.title)
          .eq('year', new Date(movie.release_date).getFullYear())
          .single();

        if (!existing) {
          console.log(`📝 Adding new movie: ${movie.title}`);
          try {
            const details = await this.tmdb.getMovieDetails(movie.id);
            await this.createContentFromTMDB(details);
            syncedCount++;
          } catch (error) {
            console.error(`❌ Error syncing ${movie.title}:`, error);
          }
        } else {
          skippedCount++;
        }
      }
      
      console.log(`✅ Sync complete: ${syncedCount} added, ${skippedCount} skipped`);
      return { syncedCount, skippedCount };
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  async syncAllMovies(limit = 100): Promise<{ totalSynced: number; totalSkipped: number }> {
    console.log('🔄 Syncing all movies from TMDB...');
    
    let page = 1;
    let totalSynced = 0;
    let totalSkipped = 0;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore && totalProcessed < limit) {
      try {
        const movies = await this.tmdb.discoverMovies({
          page,
          sort_by: 'popularity.desc',
        });

        if (!movies.results || movies.results.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`📄 Page ${page}: Found ${movies.results.length} movies`);

        for (const movie of movies.results) {
          if (totalProcessed >= limit) break;

          // Check if content exists
          const { data: existing } = await supabase
            .from('content')
            .select('id')
            .eq('title', movie.title)
            .eq('year', new Date(movie.release_date).getFullYear())
            .single();

          if (!existing) {
            console.log(`📝 Adding new movie: ${movie.title}`);
            try {
              const details = await this.tmdb.getMovieDetails(movie.id);
              await this.createContentFromTMDB(details);
              totalSynced++;
            } catch (error) {
              console.error(`❌ Error syncing ${movie.title}:`, error);
            }
          } else {
            totalSkipped++;
          }
          totalProcessed++;
        }

        page++;
        // Rate limiting - wait 500ms between pages
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error on page ${page}:`, error);
        hasMore = false;
      }
    }

    console.log(`✅ Sync complete: ${totalSynced} added, ${totalSkipped} skipped`);
    return { totalSynced, totalSkipped };
  }

  async createContentFromTMDB(details: TMDBMovie): Promise<any> {
    // Get YouTube trailer
    const trailer = details.videos?.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;

    // Get director
    const director = details.credits?.crew?.find((c: any) => c.job === 'Director');

    // Insert into content table
    const { data: content, error } = await supabase
      .from('content')
      .insert({
        title: details.title,
        description: details.overview,
        long_description: details.overview,
        image_url: this.tmdb.getImageUrl(details.poster_path),
        backdrop_url: this.tmdb.getBackdropUrl(details.backdrop_path),
        type: 'movie',
        year: new Date(details.release_date).getFullYear(),
        director: director?.name || null,
        rating: details.vote_average,
        rating_count: details.vote_count,
        genre: details.genres?.map((g: any) => g.name).join(', ') || null,
        trailer_url: trailerUrl,
        runtime: `${details.runtime} min`,
        platforms: [],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting content:', error);
      throw error;
    }

    console.log(`✅ Added content: ${details.title} (ID: ${content.id})`);

    // Insert metadata
    await supabase.from('media_metadata').insert({
      content_id: content.id,
      tmdb_id: details.id,
      imdb_id: details.imdb_id,
      tagline: details.tagline,
      release_date: details.release_date,
      budget: details.budget,
      revenue: details.revenue,
      runtime: details.runtime,
      certification: details.release_dates?.results?.[0]?.certification || null,
      tmdb_rating: details.vote_average,
      popularity: details.popularity,
      vote_count: details.vote_count,
      keywords: details.keywords?.keywords?.map((k: any) => k.name) || [],
      origin_country: details.origin_country || [],
      spoken_languages: details.spoken_languages?.map((l: any) => l.iso_639_1) || [],
      production_companies: details.production_companies?.map((c: any) => c.name) || [],
    });

    // Insert cast (top 20)
    if (details.credits?.cast) {
      for (const actor of details.credits.cast.slice(0, 20)) {
        const { data: person } = await supabase
          .from('cast_members')
          .upsert({
            tmdb_person_id: actor.id,
            name: actor.name,
            profile_path: actor.profile_path,
            known_for_department: actor.known_for_department,
            popularity: actor.popularity,
          }, { onConflict: 'tmdb_person_id' })
          .select()
          .single();

        if (person) {
          await supabase.from('content_cast').upsert({
            content_id: content.id,
            person_id: person.id,
            character_name: actor.character,
            job: 'Actor',
            ordering: actor.order,
          });
        }
      }
    }

    // Insert directors
    if (details.credits?.crew) {
      for (const crew of details.credits.crew.filter((c: any) => c.job === 'Director')) {
        const { data: person } = await supabase
          .from('cast_members')
          .upsert({
            tmdb_person_id: crew.id,
            name: crew.name,
            profile_path: crew.profile_path,
            known_for_department: crew.known_for_department,
            popularity: crew.popularity,
          }, { onConflict: 'tmdb_person_id' })
          .select()
          .single();

        if (person) {
          await supabase.from('content_cast').upsert({
            content_id: content.id,
            person_id: person.id,
            job: 'Director',
          });
        }
      }
    }

    // Insert categories
    const categories = ['Trending', ...details.genres?.map((g: any) => g.name) || []];
    for (const categoryName of categories) {
      const { data: category } = await supabase
        .from('categories')
        .upsert({
          name: categoryName,
          type: 'movie',
          is_active: true,
        }, { onConflict: 'name' })
        .select()
        .single();

      if (category) {
        await supabase.from('content_categories').upsert({
          content_id: content.id,
          category_id: category.id,
        });
      }
    }

    // Track sync status
    await supabase.from('tmdb_sync_status').insert({
      content_id: content.id,
      tmdb_id: details.id,
      sync_status: 'success',
    });

    return content;
  }

  async syncSpecificMovie(tmdbId: number): Promise<any> {
    console.log(`🎬 Syncing specific movie: ${tmdbId}`);
    const details = await this.tmdb.getMovieDetails(tmdbId);
    return await this.createContentFromTMDB(details);
  }

  async updateExistingMovies(): Promise<{ updated: number; failed: number }> {
    console.log('🔄 Updating existing movies from TMDB...');
    
    const { data: content } = await supabase
      .from('content')
      .select('id, title, year')
      .order('created_at', { ascending: false });

    if (!content || content.length === 0) {
      console.log('No content to update');
      return { updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;

    for (const item of content) {
      try {
        const search = await this.tmdb.searchMovies(item.title);
        if (search.results && search.results.length > 0) {
          const movie = search.results[0];
          const details = await this.tmdb.getMovieDetails(movie.id);
          await this.createContentFromTMDB(details);
          updated++;
          console.log(`✅ Updated: ${item.title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to update: ${item.title}`, error);
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Update complete: ${updated} updated, ${failed} failed`);
    return { updated, failed };
  }
}
