// backend/src/controllers/recommendations.controller.ts
import { Request, Response } from 'express';
import { RecommendationEngine } from '../services/recommendations/engine.service';
import { LearningService } from '../services/recommendations/learning.service';

export class RecommendationsController {
  private engine: RecommendationEngine;
  private learning: LearningService;

  constructor(engine: RecommendationEngine, learning: LearningService) {
    this.engine = engine;
    this.learning = learning;
  }

  async getRecommendations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { mood, language, limit } = req.query;
      
      const recommendations = await this.engine.getPersonalizedRecommendations(userId, {
        mood: mood as string,
        language: language as string,
        limit: limit ? parseInt(limit as string) : 10,
      });
      
      res.json({ success: true, recommendations });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ success: false, error: 'Failed to get recommendations' });
    }
  }

  async trackInteraction(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { contentId, type, metadata } = req.body;
      
      await this.learning.trackInteraction(userId, contentId, type, metadata);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking interaction:', error);
      res.status(500).json({ success: false, error: 'Failed to track interaction' });
    }
  }

  async getTasteProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      const profile = await this.learning.getUserTasteProfile(userId);
      
      res.json({ success: true, profile });
    } catch (error) {
      console.error('Error getting taste profile:', error);
      res.status(500).json({ success: false, error: 'Failed to get taste profile' });
    }
  }
}
