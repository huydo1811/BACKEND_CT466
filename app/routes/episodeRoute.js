import express from 'express';
import multer from 'multer'
import fs from 'fs'
import path from 'path';
import {
  getEpisodesByMovie,
  getEpisodeBySlug,
  incrementEpisodeView,
  createEpisode,
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
  getAdminEpisodes
} from '../controllers/episodeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// create uploads folder for episodes
const uploadsDir = path.join(process.cwd(), 'uploads', 'episodes')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`
    cb(null, name)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit (tùy chỉnh)
})

// Public routes
router.get('/movie/:movieId', getEpisodesByMovie);      // Lấy episodes của series
router.get('/slug/:slug', getEpisodeBySlug);            // Lấy episode theo slug
router.post('/:id/view', incrementEpisodeView);         // Tăng view count

router.get('/:id', getEpisodeById);                     // Lấy episode theo ID

// Protected routes - Admin only
router.use(protect, authorize('admin'));

// <-- moved admin listing BEFORE the param routes
router.get('/admin', getAdminEpisodes); // admin list

// accept thumbnail (image) and video file when creating/updating episode
router.post('/', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 1 }]), createEpisode);                        // Tạo episode mới
router.put('/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 1 }]), updateEpisode);                      // Cập nhật episode
router.delete('/:id', deleteEpisode);                   // Xóa episode

export default router;