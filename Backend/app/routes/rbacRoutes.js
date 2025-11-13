import express from 'express';
import { getMyPermissions } from '../controllers/rbacController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get current user's permissions
router.get('/me', protect, getMyPermissions);

export default router;