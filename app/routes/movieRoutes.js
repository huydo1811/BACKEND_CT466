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
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'backdrop', maxCount: 1 },
    { name: 'video', maxCount: 1 },      
    { name: 'videoUrl', maxCount: 1 },   
  ]),
  createMovie
);

// Public routes
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

// Protected routes - Admin only
router.use(protect, authorize('admin'));

router.get('/admin/stats', getMovieStats);
router.put(
  '/:id',
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'backdrop', maxCount: 1 },
    { name: 'video', maxCount: 1 },      
    { name: 'videoUrl', maxCount: 1 },
  ]),
  updateMovie
);
router.delete('/:id', deleteMovie);
router.patch('/:id/toggle', togglePublishStatus);
router.patch('/:id/toggle-hero', toggleHeroStatus); 

export default router;