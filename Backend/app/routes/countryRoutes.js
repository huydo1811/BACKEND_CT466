import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  searchCountries
} from '../controllers/countryController.js';

const router = express.Router();

// setup multer storage for countries
const uploadsDir = path.join(process.cwd(), 'uploads', 'countries');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Route tìm kiếm 
router.get('/search', searchCountries);

// CRUD routes
router.route('/')
  .get(getAllCountries)
  .post(upload.single('flag'), createCountry);

router.route('/:id')
  .get(getCountryById)
  .put(upload.single('flag'), updateCountry)
  .delete(deleteCountry);

export default router;