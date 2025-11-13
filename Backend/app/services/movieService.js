import Movie from '../models/Movie.js';
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import Category from '../models/Category.js'
import reviewService from './reviewService.js'
 
const uploadsDir = path.join(process.cwd(), 'uploads', 'movies')

const _deleteLocalFile = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return
  try {
    const segment = '/uploads/movies/'
    const idx = fileUrl.indexOf(segment)
    if (idx === -1) return
    const filename = fileUrl.slice(idx + segment.length)
    const fp = path.join(uploadsDir, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (err) {
    console.warn('delete local movie file error', err)
  }
}

class MovieService {
  
  // Lấy tất cả phim với filter và phân trang
  async getAllMovies(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        actor,
        country,
        year,
        type,
        sortBy = 'createdAt',
        sortOrder = -1,
        isPublished = true
      } = options;
      
      const skip = (page - 1) * limit;
      let query = {};
      
      // Base filter
      if (isPublished !== undefined) {
        query.isPublished = isPublished;
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { director: new RegExp(search, 'i') }
        ];
      }
      
      // Other filters
      // category: accept "id", "id1,id2", array of ids, or slug/name values
      if (category) {
        let cats = Array.isArray(category) ? category : String(category).split(',').map(s => s.trim()).filter(Boolean)
        if (cats.length) {
          // split objectId-like and name-like candidates
          const idCandidates = cats.filter(c => mongoose.Types.ObjectId.isValid(String(c))).map(c => new mongoose.Types.ObjectId(String(c)))
          const nameCandidates = cats.filter(c => !mongoose.Types.ObjectId.isValid(String(c)))

          const matchedIds = [...idCandidates]
          if (nameCandidates.length) {
            const found = await Category.find({
              $or: [
                { slug: { $in: nameCandidates } },
                { name: { $in: nameCandidates } }
              ]
            }).select('_id').lean()
            found.forEach(f => { if (f && f._id) matchedIds.push(new mongoose.Types.ObjectId(String(f._id))) })
          }

          if (matchedIds.length) query.categories = { $in: matchedIds }
          else query.categories = { $in: [] } // ensure no results if nothing matched
        }
      }

      // actor: accept single id or comma-separated ids (only valid ObjectId values)
      if (actor) {
        const actors = Array.isArray(actor) ? actor : String(actor).split(',').map(s => s.trim()).filter(Boolean)
        const validIds = actors
          .filter(a => mongoose.Types.ObjectId.isValid(String(a)))
          .map(a => new mongoose.Types.ObjectId(String(a)))
        if (validIds.length) {
          query.actors = { $in: validIds }
        } else {
          // no valid ids -> return empty set
          query.actors = { $in: [] }
        }
      }

      if (country) query.country = country;
      if (year) query.year = year;
      if (type) query.type = type;
      
      const movies = await Movie.find(query)
        .populate('categories', 'name slug')
        .populate('country', 'name code')
        .populate('actors', 'name avatar slug')
        .populate('createdBy', 'username fullName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Movie.countDocuments(query);
      
      return {
        movies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách phim: ${error.message}`);
    }
  }
  
  // Lấy phim theo slug
  async getMovieBySlug(slug) {
    try {
      const movie = await Movie.findOne({ slug, isPublished: true })
        .populate('categories', 'name slug description')
        .populate('country', 'name code')
        .populate('actors', 'name avatar')
        .populate('createdBy', 'username fullName');
      
      if (!movie) {
        throw new Error('Phim không tồn tại hoặc đã bị ẩn');
      }

      // cập nhật rating từ reviews
      try {
        const stats = await reviewService.getMovieRatingStats(movie._id)
        movie.rating = movie.rating || { average: 0, count: 0 }
        movie.rating.average = stats.averageRating || 0
        movie.rating.count = stats.totalReviews || 0
      } catch (e) {
        // ignore nếu aggregate lỗi
        console.warn('Không thể lấy stats reviews cho movie:', movie._id, e.message)
      }
      
      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin phim: ${error.message}`);
    }
  }
  
  // Lấy phim theo ID (admin)
  async getMovieById(id) {
    try {
      const movie = await Movie.findById(id)
        .populate('categories country actors createdBy');
      
      if (!movie) {
        throw new Error('Phim không tồn tại');
      }

      // cập nhật rating từ reviews (chi tiết)
      try {
        const stats = await reviewService.getMovieRatingStats(movie._id)
        movie.rating = movie.rating || { average: 0, count: 0 }
        movie.rating.average = stats.averageRating || 0
        movie.rating.count = stats.totalReviews || 0
      } catch (e) {
        console.warn('Không thể lấy stats reviews cho movie:', movie._id, e.message)
      }
      
      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi lấy phim: ${error.message}`);
    }
  }
  
  // Tạo phim mới
  async createMovie(movieData, userId) {
    try {
      movieData.createdBy = userId;
      
      const movie = await Movie.create(movieData);
      
      return await this.getMovieById(movie._id);
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Slug phim đã tồn tại');
      }
      throw new Error(`Lỗi khi tạo phim: ${error.message}`);
    }
  }
  
  // Cập nhật phim
  async updateMovie(id, movieData, userId) {
    try {
      // find existing to check old files
      const existing = await Movie.findById(id).lean()
      if (!existing) throw new Error('Phim không tồn tại')

      // if poster replaced, remove old poster file
      if (movieData.poster && existing.poster && movieData.poster !== existing.poster) {
        _deleteLocalFile(existing.poster)
      }
      // if backdrop replaced, remove old backdrop file
      if (movieData.backdrop && existing.backdrop && movieData.backdrop !== existing.backdrop) {
        _deleteLocalFile(existing.backdrop)
      }
      // if video replaced, remove old video file
      if (movieData.videoUrl && existing.videoUrl && movieData.videoUrl !== existing.videoUrl) {
        _deleteLocalFile(existing.videoUrl)
      }

      const movie = await Movie.findByIdAndUpdate(
        id,
        movieData,
        { new: true, runValidators: true }
      ).populate('categories country actors');
      
      if (!movie) {
        throw new Error('Phim không tồn tại');
      }
      
      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật phim: ${error.message}`);
    }
  }
 
  // Xóa phim
  async deleteMovie(id) {
    try {
      const movie = await Movie.findByIdAndDelete(id);
      
      if (!movie) {
        throw new Error('Phim không tồn tại');
      }

      // delete poster & video files if they are stored locally
      if (movie.poster) _deleteLocalFile(movie.poster)
      if (movie.backdrop) _deleteLocalFile(movie.backdrop)
      if (movie.videoUrl) _deleteLocalFile(movie.videoUrl)

      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi xóa phim: ${error.message}`);
    }
  }
  
  // Toggle publish status
  async togglePublishStatus(id) {
    try {
      const movie = await Movie.findById(id);
      
      if (!movie) {
        throw new Error('Phim không tồn tại');
      }
      
      movie.isPublished = !movie.isPublished;
      await movie.save();
      
      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi thay đổi trạng thái phim: ${error.message}`);
    }
  }
  
  // Lấy phim nổi bật
  async getFeaturedMovies(limit = 10) {
    try {
      const movies = await Movie.find({ 
        isPublished: true, 
        isFeatured: true 
      })
        .populate('categories', 'name slug')
        .populate('country', 'name code')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      
      return movies;
    } catch (error) {
      throw new Error(`Lỗi khi lấy phim nổi bật: ${error.message}`);
    }
  }
  
  // Lấy phim mới nhất
  async getLatestMovies(limit, type = null) {
    const query = { isPublished: true };
    if (type) query.type = type; // <-- thêm filter type
    
    return await Movie.find(query)
      .populate('categories', 'name slug')
      .populate('country', 'name')
      .populate('actors', 'name slug photoUrl')
      .sort('-createdAt')
      .limit(limit);
  }
  
  // Lấy phim hot (trending - xem nhiều trong 7 ngày gần đây)
  async getHotMovies(limit, type = null) {
    const query = { isPublished: true };
    if (type) query.type = type;
    
    // Không filter createdAt, chỉ sort theo viewCount
    return await Movie.find(query)
      .populate('categories', 'name slug')
      .populate('country', 'name')
      .sort('-viewCount -createdAt') // ưu tiên viewCount, rồi mới createdAt
      .limit(limit);
  }
  
  // Lấy phim BXH tuần/tháng
  async getRankingMovies(period = 'week', limit = 5, type = null) {
    const query = { isPublished: true };
    if (type) query.type = type;
    
    // Không filter createdAt, chỉ sort theo viewCount
    return await Movie.find(query)
      .populate('categories', 'name slug')
      .populate('country', 'name')
      .sort('-viewCount')
      .limit(limit);
  }
  
  // Lấy phim Hero
  async getHeroMovie() {
    let movie = await Movie.findOne({ isHero: true, isPublished: true })
      .populate('categories', 'name slug')
      .populate('country', 'name')
      .populate('actors', 'name slug photoUrl');
    
    if (!movie) {
      movie = await Movie.findOne({ isFeatured: true, isPublished: true })
        .sort('-createdAt')
        .populate('categories', 'name slug')
        .populate('country', 'name')
        .populate('actors', 'name slug photoUrl');
    }
    
    return movie;
  }

  // Thống kê phim (admin)
  async getMovieStats() {
    try {
      const stats = await Movie.aggregate([
        {
          $group: {
            _id: null,
            totalMovies: { $sum: 1 },
            publishedMovies: {
              $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
            },
            featuredMovies: {
              $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
            },
            hotMovies: {
              $sum: { $cond: [{ $eq: ['$isHot', true] }, 1, 0] }
            },
            totalViews: { $sum: '$viewCount' },
            averageRating: { $avg: '$rating.average' }
          }
        }
      ]);
      
      const typeStats = await Movie.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            averageRating: { $avg: '$rating.average' }
          }
        }
      ]);
      
      const yearStats = await Movie.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: '$year',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 10 }
      ]);
      
      return {
        overview: stats[0] || {
          totalMovies: 0,
          publishedMovies: 0,
          featuredMovies: 0,
          hotMovies: 0,
          totalViews: 0,
          averageRating: 0
        },
        typeBreakdown: typeStats,
        yearBreakdown: yearStats
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê phim: ${error.message}`);
    }
  }

  async incrementView(movieId) {
    try {
      const movie = await Movie.findByIdAndUpdate(
        movieId,
        { $inc: { viewCount: 1 } }, // tăng viewCount thêm 1
        { new: true, runValidators: false }
      ).select('viewCount');
      
      if (!movie) {
        throw new Error('Movie không tồn tại');
      }
      
      return movie;
    } catch (error) {
      throw new Error(`Lỗi khi tăng view count: ${error.message}`);
    }
  }
}

export default new MovieService();