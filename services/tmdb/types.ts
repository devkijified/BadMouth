// services/tmdb/types.ts
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
  credits: TMDBCredits;
  videos: TMDBVideos;
  keywords: TMDBKeywords;
}

export interface TMDBGenre {
  id: number;
  name: string;
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
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
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
