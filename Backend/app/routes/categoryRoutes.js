import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  searchCategories
} from '../controllers/categoryController.js';

// multer config: lưu vào uploads/categories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), 'uploads', 'categories')
    try {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    } catch (err) {
      console.warn('mkdir failed', dest, err)
    }
    cb(null, dest)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`
    cb(null, name)
  }
})
const upload = multer({ storage })

const router = express.Router();

// Route tìm kiếm
router.get('/search', searchCategories);

// Route slug
router.get('/slug/:slug', getCategoryBySlug);

// CRUD routes
router.route('/')
  .get(getAllCategories)
  .post(upload.single('image'), createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(upload.single('image'), updateCategory)
  .delete(deleteCategory);

export default router;