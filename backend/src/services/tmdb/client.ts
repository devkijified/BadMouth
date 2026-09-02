// backend/src/services/tmdb/client.ts
import axios from 'axios';
import {
  TMDBMovie,
  TMDBTrendingResult,
  TMDBDiscoverParams,
  TMDBGenre,
  TMDBVideos,
  TMDBCredits,
  TMDBKeywords,
  TMDBSimilarMovies,
} from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export class TMDBClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string = process.env.TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f') {
    this.apiKey = apiKey;
    this.baseURL = TMDB_BASE_URL;
  }

  private getParams(extraParams: any = {}) {
    return {
      api_key: this.apiKey,
      language: 'en-US',
      ...extraParams,
    };
  }

  async searchMovies(query: string, page = 1): Promise<TMDBTrendingResult> {
    const response = await axios.get(`${this.baseURL}/search/movie`, {
      params: this.getParams({
        query,
        page,
        include_adult: false,
      }),
    });
    return response.data;
  }

  async getMovieDetails(tmdbId: number): Promise<TMDBMovie> {
    const response = await axios.get(`${this.baseURL}/movie/${tmdbId}`, {
      params: this.getParams({
        append_to_response: 'credits,keywords,reviews,similar,videos,images',
      }),
    });
    return response.data;
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBTrendingResult> {
    const response = await axios.get(`${this.baseURL}/trending/movie/${timeWindow}`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getTrendingTV(timeWindow: 'day' | 'week' = 'week'): Promise<any> {
    const response = await axios.get(`${this.baseURL}/trending/tv/${timeWindow}`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async discoverMovies(params: TMDBDiscoverParams = {}): Promise<TMDBTrendingResult> {
    const response = await axios.get(`${this.baseURL}/discover/movie`, {
      params: this.getParams({
        sort_by: 'popularity.desc',
        page: 1,
        ...params,
      }),
    });
    return response.data;
  }

  async getGenres(): Promise<{ genres: TMDBGenre[] }> {
    const response = await axios.get(`${this.baseURL}/genre/movie/list`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getSimilarMovies(movieId: number): Promise<TMDBSimilarMovies> {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/similar`, {
      params: this.getParams({ page: 1 }),
    });
    return response.data;
  }

  async getMovieVideos(movieId: number): Promise<TMDBVideos> {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/videos`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getMovieCredits(movieId: number): Promise<TMDBCredits> {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/credits`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getMovieKeywords(movieId: number): Promise<TMDBKeywords> {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/keywords`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getPersonDetails(personId: number): Promise<any> {
    const response = await axios.get(`${this.baseURL}/person/${personId}`, {
      params: this.getParams({
        append_to_response: 'movie_credits,tv_credits',
      }),
    });
    return response.data;
  }

  // Utility methods for images
  getImageUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  getBackdropUrl(path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  getProfileUrl(path: string, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
}
