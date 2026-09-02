// backend/src/services/tmdb/client.ts
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export class TMDBClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string = 'e40a2dd7da8c15d302e6790211dd958f') {
    this.apiKey = apiKey;
    this.baseURL = TMDB_BASE_URL;
  }

  private getParams(extraParams: any = {}) {
    return {
      api_key: this.apiKey,
      ...extraParams,
    };
  }

  async searchMovies(query: string, page = 1) {
    const response = await axios.get(`${this.baseURL}/search/movie`, {
      params: this.getParams({
        query,
        page,
        include_adult: false,
      }),
    });
    return response.data;
  }

  async getMovieDetails(tmdbId: number) {
    const response = await axios.get(`${this.baseURL}/movie/${tmdbId}`, {
      params: this.getParams({
        append_to_response: 'credits,keywords,reviews,similar,videos,images',
        language: 'en-US',
      }),
    });
    return response.data;
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week') {
    const response = await axios.get(`${this.baseURL}/trending/movie/${timeWindow}`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async getTrendingTV(timeWindow: 'day' | 'week' = 'week') {
    const response = await axios.get(`${this.baseURL}/trending/tv/${timeWindow}`, {
      params: this.getParams(),
    });
    return response.data;
  }

  async discoverMovies(params: any = {}) {
    const response = await axios.get(`${this.baseURL}/discover/movie`, {
      params: this.getParams({
        sort_by: 'popularity.desc',
        page: 1,
        ...params,
      }),
    });
    return response.data;
  }

  async getGenres() {
    const response = await axios.get(`${this.baseURL}/genre/movie/list`, {
      params: this.getParams({
        language: 'en-US',
      }),
    });
    return response.data;
  }

  async getSimilarMovies(movieId: number) {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/similar`, {
      params: this.getParams({
        page: 1,
      }),
    });
    return response.data;
  }

  async getMovieVideos(movieId: number) {
    const response = await axios.get(`${this.baseURL}/movie/${movieId}/videos`, {
      params: this.getParams({
        language: 'en-US',
      }),
    });
    return response.data;
  }

  // Utility methods for images
  getImageUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  getBackdropUrl(path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
}
