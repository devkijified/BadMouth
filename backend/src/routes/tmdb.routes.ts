// backend/src/routes/tmdb.routes.ts
import { Router } from 'express';
import { TMDBSyncService } from '../services/tmdb/sync.service';
import { TMDBClient } from '../services/tmdb/client';

export function setupTMDBRoutes(): Router {
  const router = Router();
  const tmdbClient = new TMDBClient();
  const syncService = new TMDBSyncService(tmdbClient);

  router.post('/sync/trending', async (req, res) => {
    try {
      const result = await syncService.syncTrendingMovies();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/sync/all', async (req, res) => {
    try {
      const { limit } = req.body;
      const result = await syncService.syncAllMovies(limit || 100);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/sync/movie/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await syncService.syncSpecificMovie(parseInt(id));
      res.json({ success: true, movie: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
