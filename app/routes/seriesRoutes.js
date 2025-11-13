import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { protect, authorize } from '../middleware/auth.js'
import { createMovie, updateMovie, getMovieById, deleteMovie } from '../controllers/movieController.js'

const router = express.Router()

// reuse same upload config as movies (ensure uploads/movies exists)
const uploadsDir = path.join(process.cwd(), 'uploads', 'movies')
fs.mkdirSync(uploadsDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname)}`)
})
const upload = multer({ storage })

// public/admin as in movies routes
router.use(protect, authorize('admin'))
router.post('/', upload.fields([{ name: 'poster', maxCount: 1 }]), (req, res, next) => {
  req.body.type = 'series'
  return createMovie(req, res, next)
})
router.put('/:id', upload.fields([{ name: 'poster', maxCount: 1 }]), (req, res, next) => {
  req.body.type = 'series'
  return updateMovie(req, res, next)
})
router.get('/:id', getMovieById)
router.delete('/:id', deleteMovie)

export default router