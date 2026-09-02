// backend/src/services/recommendations/learning.service.ts
import { supabase } from '../supabase/client';

export class LearningService {
  async trackInteraction(userId: string, contentId: string, type: string, metadata: any = {}) {
    await supabase.from('user_interactions').insert({
      user_id: userId,
      content_id: contentId,
      interaction_type: type,
      metadata,
    });

    // Update taste profile asynchronously
    if (['like', 'rating', 'watch'].includes(type)) {
      await this.updateTasteProfile(userId);
    }
  }

  async updateTasteProfile(userId: string) {
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('*, content(genre, type, year, rating)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!interactions || interactions.length < 10) return;

    const genreAffinities: Record<string, { count: number; totalWeight: number }> = {};
    const weights = {
      like: 1.0,
      rating: 0.8,
      watch: 0.6,
      view: 0.3,
    };

    for (const interaction of interactions) {
      const weight = weights[interaction.interaction_type as keyof typeof weights] || 0.3;
      const genres = interaction.content?.genre?.split(',') || [];
      
      for (const genre of genres) {
        const trimmed = genre.trim();
        if (!genreAffinities[trimmed]) {
          genreAffinities[trimmed] = { count: 0, totalWeight: 0 };
        }
        genreAffinities[trimmed].count += 1;
        genreAffinities[trimmed].totalWeight += weight;
      }
    }

    const normalizedAffinities: Record<string, number> = {};
    const maxScore = Math.max(
      ...Object.values(genreAffinities).map(v => v.totalWeight),
      1
    );
    
    for (const [genre, data] of Object.entries(genreAffinities)) {
      normalizedAffinities[genre] = Math.min(data.totalWeight / maxScore, 1);
    }

    await supabase
      .from('user_taste_profiles')
      .upsert({
        user_id: userId,
        genre_affinities: normalizedAffinities,
        updated_at: new Date().toISOString(),
      });
  }

  async getUserTasteProfile(userId: string) {
    const { data } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }
}
