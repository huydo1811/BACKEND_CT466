import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  incrementView,
  incrementClick,
  getBannerStats
} from '../controllers/bannerController.js';
import { protect, authorize } from '../middleware/auth.js'; 

// multer config: lưu vào uploads/banners
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), 'uploads', 'banners')
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

// Public routes
router.get('/active', getActiveBanners);        
router.get('/:id', getBannerById);              
router.post('/:id/view', incrementView);        
router.post('/:id/click', incrementClick);      

// Protected routes - Chỉ admin
router.use(protect, authorize('admin')); 

router.route('/')
  .get(getAllBanners)
  // accept multipart with fields "image" and "mobileImage"
  .post(upload.fields([{ name: 'image' }, { name: 'mobileImage' }]), createBanner);                        

router.route('/:id')
  .put(upload.fields([{ name: 'image' }, { name: 'mobileImage' }]), updateBanner)
  .delete(deleteBanner);                     

router.patch('/:id/toggle', toggleBannerStatus); 
router.get('/admin/stats', getBannerStats);    

export default router;