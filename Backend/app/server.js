import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import connectDB from './config/db.js';
import countryRoutes from './routes/countryRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import actorRoutes from './routes/actorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import seriesRoutes from './routes/seriesRoutes.js' 
import episodeRoutes from './routes/episodeRoute.js';
import reviewRoutes from './routes/reviewRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Kết nối database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/countries', countryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/admin', adminRoutes);

// Route mặc định
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Movie Streaming API đang hoạt động',
    version: '1.0.0',
    endpoints: {
      countries: '/api/countries',
      categories: '/api/categories',
      actors: '/api/actors',
      users: '/api/users',
      auth: '/api/auth',
      banners: '/api/banners',
      movies: '/api/movies',
      episodes: '/api/episodes',
      reviews: '/api/reviews',
      series: '/api/series'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
});

export default app
