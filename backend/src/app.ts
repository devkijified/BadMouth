// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RecommendationEngine } from './services/recommendations/engine.service';
import { LearningService } from './services/recommendations/learning.service';
import { RecommendationsController } from './controllers/recommendations.controller';
import { setupRecommendationRoutes } from './routes/recommendations.routes';
import { setupTMDBRoutes } from './routes/tmdb.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const learningService = new LearningService();
const recommendationEngine = new RecommendationEngine();
const recommendationsController = new RecommendationsController(
  recommendationEngine,
  learningService
);

// Routes
app.use('/api', setupRecommendationRoutes(recommendationsController));
app.use('/api/tmdb', setupTMDBRoutes());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
