// backend/src/services/ai/types.ts
export interface AIProvider {
  generateRecommendations(params: RecommendationParams): Promise<AIRecommendationResponse>;
  explainRecommendation(content: any, userProfile: any): Promise<string>;
  generateTasteProfile(history: any[]): Promise<TasteProfile>;
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

export interface TasteProfile {
  genreAffinities: Record<string, number>;
  preferredMoods: string[];
  preferredLanguages: string[];
  preferredRuntime: { min: number; max: number };
  favoriteActors: string[];
  favoriteDirectors: string[];
}
