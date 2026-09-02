// backend/src/routes/recommendations.routes.ts
import { Router } from 'express';
import { RecommendationsController } from '../controllers/recommendations.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function setupRecommendationRoutes(controller: RecommendationsController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/recommendations', (req, res) => controller.getRecommendations(req, res));
  router.post('/interactions', (req, res) => controller.trackInteraction(req, res));
  router.get('/taste-profile', (req, res) => controller.getTasteProfile(req, res));

  return router;
}
