import express from 'express';
import upload from '../config/multerCloundinary.js';
import {
  getAllMovies,
  getMovieBySlug,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  togglePublishStatus,
  toggleHeroStatus,
  getFeaturedMovies,
  getLatestMovies,
  getHotMovies,
  getHeroMovie,
  getRankingMovies,
  getPublicStats,
  incrementView,
  searchMovies,
  getMovieStats,
  getMoviesByCategory
} from '../controllers/movieController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('admin'),
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'backdrop', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'videoUrl', maxCount: 1 },
  ]),
  createMovie
);

router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'backdrop', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'videoUrl', maxCount: 1 },
  ]),
  updateMovie
);

router.delete('/:id', protect, authorize('admin'), deleteMovie);
router.patch('/:id/toggle', protect, authorize('admin'), togglePublishStatus);
router.patch('/:id/toggle-hero', protect, authorize('admin'), toggleHeroStatus);
router.get('/admin/stats', protect, authorize('admin'), getMovieStats);

// Public routes (ĐẶT SAU admin routes)
router.get('/search', searchMovies);
router.get('/featured', getFeaturedMovies);
router.get('/latest', getLatestMovies);
router.get('/hot', getHotMovies);
router.get('/hero', getHeroMovie);
router.get('/ranking', getRankingMovies);
router.get('/stats', getPublicStats);
router.get('/category/:categoryId', getMoviesByCategory);
router.get('/slug/:slug', getMovieBySlug);
router.post('/:id/view', incrementView);
router.get('/:id', getMovieById);
router.get('/', getAllMovies);

export default router;