import mongoose from 'mongoose'
import Review from '../models/Review.js';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import Episode from '../models/Episode.js' // add at top

class ReviewService {

  _toObjectId(val) {
    if (!val) return null;
    const s = String(val);
    return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
  }

  // User tạo/cập nhật review
  async createOrUpdateReview(userId, movieId, reviewData) {
    try {
      const { rating, comment } = reviewData;

      // Kiểm tra movie tồn tại
      const movie = await Movie.findById(movieId);
      if (!movie) {
        throw new Error('Phim không tồn tại');
      }

      // Kiểm tra user đã review chưa
      let review = await Review.findOne({ user: userId, movie: movieId });

      if (review) {
        // Update review cũ
        review.rating = rating;
        review.comment = comment || review.comment;
        await review.save();
      } else {
        // Tạo review mới
        review = await Review.create({
          user: userId,
          movie: movieId,
          rating,
          comment
        });
      }

      // Cập nhật rating của movie
      await this.updateMovieRating(movieId);

      // Populate data để return
      return await Review.findById(review._id)
        .populate('user', 'username fullName avatar')
        .populate('movie', 'title poster');

    } catch (error) {
      throw new Error(`Lỗi khi tạo review: ${error.message}`);
    }
  }

  // compute rating stats for a movie
  async getMovieRatingStats(movieId) {
    try {
      const mId = mongoose.Types.ObjectId.isValid(String(movieId)) ? new mongoose.Types.ObjectId(String(movieId)) : null;
      if (!mId) return { totalReviews: 0, averageRating: 0 };

      const agg = await Review.aggregate([
        { $match: { movie: mId, isPublished: true } },
        { $group: { _id: '$movie', totalReviews: { $sum: 1 }, averageRating: { $avg: '$rating' } } }
      ]).exec();

      if (!agg || !agg.length) return { totalReviews: 0, averageRating: 0 };
      return {
        totalReviews: agg[0].totalReviews || 0,
        averageRating: Number((agg[0].averageRating || 0).toFixed(1))
      };
    } catch (error) {
      throw new Error(`Lỗi khi tính stats review: ${error.message}`);
    }
  }

  // Cập nhật rating tự động cho movie
  async updateMovieRating(movieId) {
    try {
      const stats = await this.getMovieRatingStats(movieId);

      await Movie.findByIdAndUpdate(movieId, {
        'rating.average': stats.averageRating,
        'rating.count': stats.totalReviews
      });

      return stats;
    } catch (error) {
      console.error('Error updating movie rating:', error);
      throw new Error('Lỗi khi cập nhật rating phim');
    }
  }

  // Lấy reviews của một movie
  async getMovieReviews(movieId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = -1,
        rating // Filter by rating (1-5)
      } = options;

      const skip = (page - 1) * limit;

      // chuyển movieId an toàn sang ObjectId nếu có thể
      const mId = this._toObjectId(movieId);

      let query = { isPublished: true };
      if (mId) query.movie = mId;
      else if (movieId) query.movie = String(movieId);

      if (rating) {
        query.rating = rating;
      }

      const reviews = await Review.find(query)
        .populate('user', 'username fullName avatar')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Review.countDocuments(query);

      // Lấy rating stats chỉ khi movieId hợp lệ
      let ratingStats = { totalReviews: 0, averageRating: 0 };
      if (mId) {
        const agg = await Review.aggregate([
          { $match: { movie: mId, isPublished: true } },
          { $group: { _id: '$movie', totalReviews: { $sum: 1 }, averageRating: { $avg: '$rating' } } }
        ]).exec().catch(() => []);

        if (agg && agg.length) {
          ratingStats = {
            totalReviews: agg[0].totalReviews || 0,
            averageRating: Number((agg[0].averageRating || 0).toFixed(1))
          };
        }
      }

      return {
        reviews,
        ratingStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy reviews: ${error.message}`);
    }
  }

  // Lấy review của user cho movie cụ thể
  async getUserReviewForMovie(userId, movieId) {
    try {
      return await Review.getUserReviewForMovie(userId, movieId);
    } catch (error) {
      throw new Error(`Lỗi khi lấy review của user: ${error.message}`);
    }
  }

  // Lấy tất cả reviews của user
  async getUserReviews(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const skip = (page - 1) * limit;

      const reviews = await Review.find({ user: userId, isPublished: true })
        .populate('movie', 'title poster slug')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Review.countDocuments({ user: userId, isPublished: true });

      return {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy reviews của user: ${error.message}`);
    }
  }

  // Xóa review
  async deleteReview(reviewId, userId) {
    try {
      const review = await Review.findOne({ _id: reviewId, user: userId });

      if (!review) {
        throw new Error('Review không tồn tại hoặc bạn không có quyền xóa');
      }

      const movieId = review.movie;

      await Review.findByIdAndDelete(reviewId);

      // Cập nhật lại rating của movie
      await this.updateMovieRating(movieId);

      return review;
    } catch (error) {
      throw new Error(`Lỗi khi xóa review: ${error.message}`);
    }
  }

  // Admin xóa review
  async adminDeleteReview(reviewId) {
    try {
      const review = await Review.findByIdAndDelete(reviewId);

      if (!review) {
        throw new Error('Review không tồn tại');
      }

      // Cập nhật lại rating của movie
      await this.updateMovieRating(review.movie);

      return review;
    } catch (error) {
      throw new Error(`Lỗi khi xóa review: ${error.message}`);
    }
  }

  // Lấy thống kê reviews
  async getReviewStats() {
    try {
      const stats = await Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            publishedReviews: {
              $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
            },
            averageRating: { $avg: '$rating' },
            ratingBreakdown: {
              $push: '$rating'
            }
          }
        }
      ]);

      // Rating distribution
      const ratingDistribution = await Review.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Top reviewers
      const topReviewers = await Review.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: '$user',
            reviewCount: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            username: '$user.username',
            fullName: '$user.fullName',
            reviewCount: 1,
            averageRating: { $round: ['$averageRating', 1] }
          }
        },
        { $sort: { reviewCount: -1 } },
        { $limit: 10 }
      ]);

      return {
        overview: stats[0] || {
          totalReviews: 0,
          publishedReviews: 0,
          averageRating: 0,
          ratingBreakdown: []
        },
        ratingDistribution,
        topReviewers
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê reviews: ${error.message}`);
    }
  }

  // tạo / cập nhật review theo episode
  async createOrUpdateEpisodeReview(userId, episodeId, reviewData) {
    try {
      const { rating, comment } = reviewData
      const ep = await Episode.findById(episodeId)
      if (!ep) throw new Error('Episode không tồn tại')

      // mỗi user chỉ 1 review/episode
      let review = await Review.findOne({ user: userId, episode: episodeId })
      if (review) {
        if (rating !== undefined && rating !== null) review.rating = rating
        if (comment !== undefined && comment !== null) review.comment = comment || review.comment
        await review.save()
      } else {
        const doc = {
          user: userId,
          episode: episodeId,
          movie: ep.movie, // liên kết cả movie để dễ aggregate/hiển thị
          comment
        }
        if (rating !== undefined && rating !== null) doc.rating = rating
        review = await Review.create(doc)
      }
      // cập nhật rating cho movie nếu cần
      if (ep.movie) await this.updateMovieRating(ep.movie)
      return await Review.findById(review._id).populate('user', 'username fullName avatar').populate('movie', 'title poster').populate('episode', 'title episodeNumber season')
    } catch (error) {
      throw new Error(`Lỗi khi tạo review cho tập: ${error.message}`)
    }
  }

  // Lấy reviews của một episode (public)
  async getEpisodeReviews(episodeId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = -1,
        rating
      } = options
      const skip = (page - 1) * limit
      const eId = this._toObjectId(episodeId)
      let query = { isPublished: true }
      if (eId) query.episode = eId
      else if (episodeId) query.episode = String(episodeId)
      if (rating) query.rating = rating
      const reviews = await Review.find(query)
        .populate('user', 'username fullName avatar')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
      const total = await Review.countDocuments(query)
      return {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    } catch (error) {
      throw new Error(`Lỗi khi lấy reviews tập: ${error.message}`)
    }
  }
}

export default new ReviewService();