// backend/src/services/recommendations/engine.service.ts
import { supabase } from '../supabase/client';
import { AIProvider } from '../ai/types';
import { TMDBClient } from '../tmdb/client';
import { getAIProvider } from '../ai/provider';

export class RecommendationEngine {
  private aiProvider: AIProvider;
  private tmdb: TMDBClient;
  private cacheEnabled: boolean;

  constructor(aiProvider?: AIProvider, tmdbClient?: TMDBClient, cacheEnabled = true) {
    this.aiProvider = aiProvider || getAIProvider();
    this.tmdb = tmdbClient || new TMDBClient();
    this.cacheEnabled = cacheEnabled;
  }

  async getPersonalizedRecommendations(userId: string, options: {
    mood?: string;
    language?: string;
    limit?: number;
  } = {}) {
    // 1. Check cache
    if (this.cacheEnabled) {
      const cached = await this.getCachedRecommendations(userId);
      if (cached) {
        console.log('📦 Using cached recommendations');
        return cached;
      }
    }

    // 2. Get user data
    const [userProfile, watchHistory, tasteProfile] = await Promise.all([
      this.getUserProfile(userId),
      this.getWatchHistory(userId),
      this.getTasteProfile(userId),
    ]);

    // 3. Get AI recommendations
    const aiRecs = await this.aiProvider.generateRecommendations({
      userId,
      userTasteProfile: tasteProfile || userProfile,
      watchHistory,
      mood: options.mood,
      language: options.language,
      limit: options.limit || 10,
      excludeIds: watchHistory.map(h => h.content_id),
    });

    // 4. Get full content details for recommendations
    const contentIds = aiRecs.recommendations.map((r: any) => r.contentId);
    const { data: content } = await supabase
      .from('content')
      .select('*')
      .in('id', contentIds);

    // 5. Merge with AI data
    const merged = aiRecs.recommendations.map((rec: any) => {
      const contentItem = content?.find((c: any) => c.id === rec.contentId);
      return {
        ...rec,
        content: contentItem || null,
      };
    });

    // 6. Cache results
    if (this.cacheEnabled && merged.length > 0) {
      await this.cacheRecommendations(userId, merged);
    }

    return merged;
  }

  private async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  private async getWatchHistory(userId: string) {
    const { data } = await supabase
      .from('user_watch_history')
      .select('*, content(*)')
      .eq('user_id', userId)
      .order('watch_date', { ascending: false })
      .limit(100);
    return data || [];
  }

  private async getTasteProfile(userId: string) {
    const { data } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }

  private async getCachedRecommendations(userId: string) {
    const { data } = await supabase
      .from('ai_recommendations_cache')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data;
  }

  private async cacheRecommendations(userId: string, recommendations: any[]) {
    await supabase
      .from('ai_recommendations_cache')
      .upsert({
        user_id: userId,
        content_ids: recommendations.map((r: any) => r.contentId),
        explanation: recommendations.map((r: any) => r.reason).join('\n'),
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
  }
}
