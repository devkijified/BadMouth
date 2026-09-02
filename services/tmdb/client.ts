// services/tmdb/client.ts
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export class TMDBClient {
  private apiKey: string;

  constructor(apiKey: string = process.env.TMDB_API_KEY || '') {
    this.apiKey = apiKey;
  }

  private getParams(extraParams: any = {}) {
    return {
      api_key: this.apiKey,
      language: 'en-US',
      ...extraParams,
    };
  }

  async searchMovies(query: string, page = 1) {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: this.getParams({ query, page, include_adult: false }),
    });
    return response.data;
  }

  async getMovieDetails(tmdbId: number) {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: this.getParams({
        append_to_response: 'credits,keywords,similar,videos,images',
      }),
    });
    return response.data;
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week') {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/${timeWindow}`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async discoverMovies(params: any = {}) {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: this.getParams({
        sort_by: 'popularity.desc',
        page: 1,
        ...params,
      }),
    });
    return response.data;
  }

  getImageUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  getBackdropUrl(path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
}
