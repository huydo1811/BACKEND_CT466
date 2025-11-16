import movieService from '../services/movieService.js';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js'
import Episode from '../models/Episode.js' // <-- đã có rồi, kiểm tra lại
import User from '../models/User.js'       // <-- đã có rồi
import asyncHandler from '../middleware/asyncHandler.js'
import reviewService from '../services/reviewService.js'

// Helper validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

const buildFilePath = (filename, folder = 'movies') => {
  if (!filename) return undefined
  return `/uploads/${folder}/${filename}`
}

const getPublicUrl = (req, path) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

const mapMovieFileUrls = (req, movie) => {
  if (!movie) return movie
  const obj = movie.toObject ? movie.toObject() : movie
  if (obj.poster) obj.poster = getPublicUrl(req, obj.poster)
  if (obj.backdrop) obj.backdrop = getPublicUrl(req, obj.backdrop)
  if (obj.videoUrl) obj.videoUrl = getPublicUrl(req, obj.videoUrl)
  return obj
}

// Lấy tất cả phim với filters (Public)
export const getAllMovies = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    search: req.query.search,
    actor: req.query.actor,
    category: req.query.category,
    country: req.query.country,
    year: req.query.year ? parseInt(req.query.year) : undefined,
    type: req.query.type,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
    isPublished: req.query.isPublished !== undefined ? req.query.isPublished === 'true' : true
  };
  
  const result = await movieService.getAllMovies(options);
  const movies = (result.movies || []).map(m => mapMovieFileUrls(req, m));

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách phim thành công',
    data: movies,
    pagination: result.pagination,
    filters: {
      search: options.search,
      category: options.category,
      country: options.country,
      year: options.year,
      type: options.type
    }
  });
});

// Lấy phim theo slug (Public)
export const getMovieBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const movie = await movieService.getMovieBySlug(slug);
  if (!movie) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
  }

  try {
    const rev = await reviewService.getMovieReviews(movie._id || movie.id, { page: 1, limit: 1000 });
    const obj = movie.toObject ? movie.toObject() : (movie || {});
    obj.reviews = rev.reviews || [];
    obj.ratingStats = rev.ratingStats || {};
    if (obj.ratingStats && obj.ratingStats.averageRating != null) {
      obj.rating = { average: obj.ratingStats.averageRating, count: obj.ratingStats.totalReviews ?? obj.rating.count }
    }
    const mapped = mapMovieFileUrls(req, obj);
    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    const mappedFallback = mapMovieFileUrls(req, movie);
    return res.status(200).json({ success: true, data: mappedFallback });
  }
});

// Lấy phim theo ID (Public)
export const getMovieById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const movie = await movieService.getMovieById(id);
  if (!movie) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
  }

  try {
    const rev = await reviewService.getMovieReviews(movie._id || movie.id, { page: 1, limit: 1000 });
    const obj = movie.toObject ? movie.toObject() : (movie || {});
    obj.reviews = rev.reviews || [];
    obj.ratingStats = rev.ratingStats || {};
    if (obj.ratingStats && obj.ratingStats.averageRating != null) {
      obj.rating = { average: obj.ratingStats.averageRating, count: obj.ratingStats.totalReviews ?? obj.rating.count }
    }
    const mapped = mapMovieFileUrls(req, obj);
    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    const mappedFallback = mapMovieFileUrls(req, movie);
    return res.status(200).json({ success: true, data: mappedFallback });
  }
});


// Lấy phim theo ID (Admin)
export const getMovieByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const movie = await movieService.getMovieById(id);
  
  res.status(200).json({
    success: true,
    message: 'Lấy phim thành công',
    data: mapMovieFileUrls(req, movie)
  });
});

// Tạo phim mới (Admin)
export const createMovie = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  if (req.files?.poster?.[0]) {
    data.poster = req.files.poster[0].path; 
  }
  if (req.files?.backdrop?.[0]) {
    data.backdrop = req.files.backdrop[0].path;
  }
  if (req.files?.videoUrl?.[0]) {
    data.videoUrl = req.files.videoUrl[0].path;
  } else if (req.files?.video?.[0]) {
    data.videoUrl = req.files.video[0].path;
  }

  // normalize numbers
  if (typeof data.seasons !== 'undefined' && data.seasons !== '') {
    data.seasons = Number(data.seasons)
    if (Number.isNaN(data.seasons) || data.seasons < 1) data.seasons = 1
  } else {
    if (data.type === 'series') data.seasons = 1
  }
  if (typeof data.totalEpisodes !== 'undefined' && data.totalEpisodes !== '') {
    data.totalEpisodes = Number(data.totalEpisodes)
  }

  // If user requested splitting seasons into separate entries
  const createSeparate = (String(data.createSeparateSeasons || '') === 'true')

  if (data.type === 'series' && createSeparate && data.seasons > 1) {
    // create parent show
    const parentPayload = { ...data }
    parentPayload.isParentSeries = true
    parentPayload.seasonNumber = 0
    parentPayload.parentSeries = null
    // keep seasons & totalEpisodes on parent
    const parent = await Movie.create(parentPayload)

    // create individual season entries
    const seasonsToCreate = []
    for (let s = 1; s <= data.seasons; s++) {
      const seasonPayload = {
        title: `${data.title} - Season ${s}`,
        description: data.description || '',
        categories: data.categories || [],
        country: data.country || null,
        actors: data.actors || [],
        director: data.director || '',
        poster: parent.poster || data.poster || '',
        trailer: data.trailer || '',
        type: 'series',
        parentSeries: parent._id,
        seasonNumber: s,
        totalEpisodes: 0,
        isPublished: data.isPublished !== undefined ? data.isPublished : true
      }
      seasonsToCreate.push(seasonPayload)
    }
    const createdSeasons = await Movie.insertMany(seasonsToCreate)

    return res.status(201).json({
      success: true,
      message: 'Tạo series (parent + seasons) thành công',
      data: { parent, seasons: createdSeasons }
    })
  }

  // default single doc (either series single doc or movie)
  const movie = await Movie.create(data)

  const mapped = mapMovieFileUrls(req, movie)
  res.status(201).json({
    success: true,
    message: 'Tạo phim/series thành công',
    data: mapped
  })
});

// Cập nhật phim (Admin)
export const updateMovie = asyncHandler(async (req, res) => {
  const { id } = req.params
  const payload = { ...req.body }

  console.log('updateMovie req.body:', req.body)
  console.log('updateMovie req.files:', req.files)

  if (typeof payload.seasons !== 'undefined' && payload.seasons !== '') {
    payload.seasons = Number(payload.seasons)
    if (Number.isNaN(payload.seasons) || payload.seasons < 1) payload.seasons = 1
  }
  if (typeof payload.totalEpisodes !== 'undefined' && payload.totalEpisodes !== '') {
    payload.totalEpisodes = Number(payload.totalEpisodes)
  }

  // Chỉ cập nhật file nếu có upload mới
  if (req.files?.poster?.[0]) {
    payload.poster = req.files.poster[0].path
  } else {
    delete payload.poster  // Không update nếu không có file mới
  }

  if (req.files?.backdrop?.[0]) {
    payload.backdrop = req.files.backdrop[0].path
  } else {
    delete payload.backdrop
  }

  if (req.files?.video?.[0]) {
    payload.videoUrl = req.files.video[0].path
  } else if (req.files?.videoUrl?.[0]) {
    payload.videoUrl = req.files.videoUrl[0].path
  } else {
    delete payload.videoUrl
  }

  const updated = await movieService.updateMovie(id, payload, req.user?.id)
  if (!updated) return res.status(404).json({ success: false, message: 'Movie not found' })
  res.json({ success: true, data: mapMovieFileUrls(req, updated) })
});

// Xóa phim (Admin)
export const deleteMovie = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  await movieService.deleteMovie(id);
  
  res.status(200).json({
    success: true,
    message: 'Xóa phim thành công'
  });
});

// Toggle publish status (Admin)
export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const movie = await movieService.togglePublishStatus(id);
  
  res.status(200).json({
    success: true,
    message: `Phim đã ${movie.isPublished ? 'được xuất bản' : 'bị ẩn'}`,
    data: {
      _id: movie._id,
      title: movie.title,
      isPublished: movie.isPublished
    }
  });
});

// Toggle hero status (Admin)
export const toggleHeroStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const movie = await Movie.findById(id);
  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phim'
    });
  }

  // nếu đang bật isHero cho phim này -> bỏ isHero của tất cả phim khác (chỉ 1 hero duy nhất)
  if (!movie.isHero) {
    await Movie.updateMany({ _id: { $ne: id } }, { $set: { isHero: false } });
  }

  movie.isHero = !movie.isHero;
  await movie.save();
  
  res.status(200).json({
    success: true,
    message: `Phim ${movie.isHero ? 'đã được đánh dấu là Hero' : 'đã bỏ đánh dấu Hero'}`,
    data: {
      _id: movie._id,
      title: movie.title,
      isHero: movie.isHero
    }
  });
});

// Lấy phim nổi bật (Public)
export const getFeaturedMovies = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const movies = await movieService.getFeaturedMovies(limit);
  const mapped = (movies || []).map(m => mapMovieFileUrls(req, m));
  
  res.status(200).json({
    success: true,
    message: 'Lấy phim nổi bật thành công',
    data: mapped,
    count: mapped.length
  });
});

export const getLatestMovies = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const type = req.query.type || null;
  const movies = await movieService.getLatestMovies(limit, type);
  
   res.status(200).json({
    success: true,
    data: (movies || []).map(m => mapMovieFileUrls(req, m))
  });
});

export const getHotMovies = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const type = req.query.type || null;
  const movies = await movieService.getHotMovies(limit, type);
  
  res.status(200).json({
   success: true,
   data: (movies || []).map(m => mapMovieFileUrls(req, m))
  });
});

export const getRankingMovies = asyncHandler(async (req, res) => {
  const { period = 'week', limit = 5, type = null } = req.query; // <-- thêm type
  const movies = await movieService.getRankingMovies(period, parseInt(limit), type);
  
  res.status(200).json({
    success: true,
    data: (movies || []).map(m => mapMovieFileUrls(req, m))
  });
});

// Tìm kiếm phim (Public)
export const searchMovies = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
    });
  }
  
  const options = {
    search: q.trim(),
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    category: req.query.category,
    country: req.query.country,
    year: req.query.year ? parseInt(req.query.year) : undefined,
    type: req.query.type
  };
  
  const result = await movieService.getAllMovies(options);
  
  res.status(200).json({
    success: true,
    message: `Tìm thấy ${result.pagination.totalItems} kết quả cho "${q}"`,
    data: (result.movies || []).map(m => mapMovieFileUrls(req, m)),
    pagination: result.pagination,
    searchQuery: q
  });
});

// Lấy phim theo category (Public)
export const getMoviesByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (!isValidObjectId(categoryId)) {
    return res.status(400).json({
      success: false,
      message: 'ID category không hợp lệ'
    });
  }
  
  const options = {
    category: categoryId,
    page,
    limit,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
  };
  
  const result = await movieService.getAllMovies(options);
  
  res.status(200).json({
    success: true,
    message: 'Lấy phim theo category thành công',
     data: (result.movies || []).map(m => mapMovieFileUrls(req, m)),
    pagination: result.pagination
  });
});

// Tăng view count (Public)
export const incrementView = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const movie = await movieService.incrementView(id);
  
  res.status(200).json({
    success: true,
    message: 'Tăng view count thành công',
    data: {
      movieId: movie._id,
      title: movie.title,
      viewCount: movie.viewCount
    }
  });
});

// Thống kê phim (Admin)
export const getMovieStats = asyncHandler(async (req, res) => {
  const stats = await movieService.getMovieStats();
  
  res.status(200).json({
    success: true,
    message: 'Lấy thống kê phim thành công',
    data: stats
  });
});

export const getHeroMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.getHeroMovie();
 res.status(200).json({
    success: true,
    data: mapMovieFileUrls(req, movie)
  });
});



export const getPublicStats = asyncHandler(async (req, res) => {
  const [totalMovies, totalSeries, movieViewsAgg, episodeViewsAgg, totalUsers] = await Promise.all([
    Movie.countDocuments({ type: 'movie', isPublished: true }),
    Movie.countDocuments({ type: 'series', isPublished: true }),
    Movie.aggregate([
      { $match: { type: 'movie', isPublished: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$viewCount', 0] } } } }
    ]),
    Movie.aggregate([
      { $match: { type: 'series', isPublished: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$viewCount', 0] } } } }
    ]),
    User.countDocuments({})
  ]);
  
  const totalViews = (movieViewsAgg[0]?.total || 0) + (episodeViewsAgg[0]?.total || 0);
  
  res.status(200).json({
    success: true,
    data: {
      totalMovies,
      totalSeries,
      totalViews,
      totalUsers
    }
  });
});