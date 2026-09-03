// services/ai/types.ts

export interface AIProvider {
  generateRecommendations(
    params: RecommendationParams
  ): Promise<AIRecommendationResponse>;

  explainRecommendation(
    content: any,
    userProfile: any
  ): Promise<string>;

  generateTasteProfile(
    history: any[]
  ): Promise<TasteProfile>;

  generateReview(
    params: ReviewParams
  ): Promise<AIReviewResponse>;

  generateSimilarMovies(params: {
    title: string;
    genre: string;
    year: string | number;
  }): Promise<any>;
}

export interface RecommendationParams {
  userId: string;
  userTasteProfile?: any;
  watchHistory?: any[];
  mood?: string;
  language?: string;
  maxRuntime?: number;
  minRuntime?: number;
  genres?: string[];
  limit?: number;
  excludeIds?: string[];
}

export interface AIRecommendationResponse {
  recommendations: Array<{
    contentId: string;
    score: number;
    reason: string;
  }>;
  metadata: {
    model: string;
    tokensUsed?: number;
    latencyMs: number;
    provider: string;
  };
}

export interface ReviewParams {
  title: string;
  description?: string;
  year?: string | number;
  genre?: string;
  rating?: string | number | null;
}

export interface AIReviewResponse {
  review: string;
  rating: number | null;
}

export interface TasteProfile {
  genreAffinities: Record<string, number>;
  preferredMoods: string[];
  preferredLanguages: string[];
  preferredRuntime: {
    min: number;
    max: number;
  };
  favoriteActors: string[];
  favoriteDirectors: string[];
}
