// backend/src/services/tmdb/types.ts
export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TMDBGenre[];
  runtime: number;
  tagline: string;
  budget: number;
  revenue: number;
  imdb_id: string;
  status: string;
  origin_country: string[];
  spoken_languages: TMDBSpokenLanguage[];
  production_companies: TMDBProductionCompany[];
  credits: TMDBCredits;
  videos: TMDBVideos;
  keywords: TMDBKeywords;
  similar: TMDBSimilarMovies;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBSpokenLanguage {
  iso_639_1: string;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBCredits {
  cast: TMDBCast[];
  crew: TMDBPerson[];
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
  popularity: number;
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  job: string;
}

export interface TMDBVideos {
  results: TMDBVideo[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TMDBKeywords {
  keywords: TMDBKeyword[];
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBSimilarMovies {
  results: TMDBMovie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface TMDBTrendingResult {
  results: TMDBMovie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface TMDBDiscoverParams {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  vote_average_gte?: number;
  vote_average_lte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  with_original_language?: string;
  primary_release_year?: number;
}

export interface TMDBImageSizes {
  poster: string;
  backdrop: string;
  profile: string;
}
