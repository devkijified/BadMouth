// backend/src/services/tmdb/search.service.ts
import { TMDBClient } from './client';
import { supabase } from '../supabase/client';

export class TM DBSearchService {
  private tmdb: TMDBClient;

  constructor(tmdbClient: TMDBClient) {
    this.tmdb = tmdbClient;
  }

  async searchMovies(query: string, page = 1) {
    const results = await this.tmdb.searchMovies(query, page);
    
    // Check which movies already exist in our database
    const existingTitles = new Set();
    const { data: existing } = await supabase
      .from('content')
      .select('title, year')
      .in('title', results.results.map((m: any) => m.title));

    if (existing) {
      existing.forEach((item: any) => {
        existingTitles.add(`${item.title}-${item.year}`);
      });
    }

    // Enrich results with our data
    const enriched = results.results.map((movie: any) => ({
      ...movie,
      exists_in_db: existingTitles.has(`${movie.title}-${new Date(movie.release_date).getFullYear()}`),
      poster_url: this.tmdb.getImageUrl(movie.poster_path),
      backdrop_url: this.tmdb.getBackdropUrl(movie.backdrop_path),
    }));

    return {
      ...results,
      results: enriched,
    };
  }

  async searchByGenre(genreId: number, page = 1) {
    return await this.tmdb.discoverMovies({
      with_genres: genreId.toString(),
      page,
    });
  }

  async searchByKeyword(keyword: string, page = 1) {
    return await this.tmdb.discoverMovies({
      with_keywords: keyword,
      page,
    });
  }

  async getPopularMovies(page = 1) {
    return await this.tmdb.discoverMovies({
      sort_by: 'popularity.desc',
      page,
    });
  }

  async getTopRatedMovies(page = 1) {
    return await this.tmdb.discoverMovies({
      sort_by: 'vote_average.desc',
      page,
      vote_count_gte: 100,
    });
  }

  async getUpcomingMovies(page = 1) {
    return await this.tmdb.discoverMovies({
      sort_by: 'release_date.desc',
      page,
      'release_date.gte': new Date().toISOString().split('T')[0],
    });
  }
}
