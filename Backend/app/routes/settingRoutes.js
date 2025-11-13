import express from 'express'
import { getSettings, updateSettings } from '../controllers/settingController.js'
import { protect, authorize } from '../middleware/auth.js' // path matches project
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), 'uploads', 'settings')
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    cb(null, dest)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`)
  }
})
const upload = multer({ storage })

// public read
router.get('/', getSettings)

// admin update
router.put('/', protect, authorize('admin'), upload.single('logo'), updateSettings)

export default router