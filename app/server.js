import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import actorRoutes from './routes/actorRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import countryRoutes from './routes/countryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import seriesRoutes from './routes/seriesRoutes.js';
import episodeRoutes from './routes/episodeRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://movie.huyquang.site',
    'https://*.pages.dev'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend ChillFilm API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingRoutes);

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.path} not found` 
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();