import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  banUser,
  unbanUser,
  changeUserRole,
  searchUsers,
  getUserStats,
  getMe,
  updateMe,
  getMyHistory,
  deleteHistoryItem,
  clearMyHistory,
  getMyFavorites,
  addFavorite,
  removeFavorite,
  addToHistory,
  getMyReviews
} from '../controllers/userController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// multer for avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), 'uploads', 'avatars')
    try { if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true }) } catch(e){/*ignore*/ }
    cb(null, dest)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`)
  }
})
// renamed local multer instance to avoid duplicate identifier with imported `upload`
const avatarUpload = multer({ storage })

// protected for current user
router.use(protect)
router.get('/me', getMe)
router.put('/me', avatarUpload.single('avatar'), updateMe)

// favorites
router.get('/me/favorites', getMyFavorites)
router.post('/me/favorites/:mid', addFavorite)
router.delete('/me/favorites/:mid', removeFavorite)

// history endpoints
router.get('/me/history', getMyHistory)
router.post('/me/history', addToHistory)
router.delete('/me/history/:hid', deleteHistoryItem)
router.delete('/me/history', clearMyHistory)

router.get('/me/reviews', getMyReviews)

// admin-only routes — use authorize middleware already imported
router.use(authorize('admin'))

router.get('/search', searchUsers)
router.get('/stats', getUserStats)

router.route('/')
  .get(getAllUsers)
  .post(createUser)

router.route('/:id')
  .get(getUserById)
  .put(updateUser)

export default router;