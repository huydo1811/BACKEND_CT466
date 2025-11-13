import reviewService from '../services/reviewService.js'
import mongoose from 'mongoose';
import Review from '../models/Review.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Tạo/cập nhật review (Protected)
export const createOrUpdateReview = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;
  
  if (!isValidObjectId(movieId)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Điểm đánh giá phải từ 1-5 sao'
    });
  }
  
  const review = await reviewService.createOrUpdateReview(userId, movieId, {
    rating,
    comment
  });
  
  res.status(200).json({
    success: true,
    message: 'Đánh giá phim thành công',
    data: review
  });
});

// Tạo/cập nhật review cho episode (Protected)
export const createOrUpdateReviewForEpisode = asyncHandler(async (req, res) => {
  const { episodeId } = req.params
  const { rating, comment } = req.body
  const userId = req.user._id

  if (!isValidObjectId(episodeId)) {
    return res.status(400).json({ success: false, message: 'ID episode không hợp lệ' })
  }
  // rating optional for episode comments
  if (rating !== undefined && rating !== null) {
    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, message: 'Điểm đánh giá phải từ 1-5 sao' })
    }
  }

  const review = await reviewService.createOrUpdateEpisodeReview(userId, episodeId, { rating, comment })
  res.status(200).json({ success: true, message: 'Bình luận tập thành công', data: review })
})

// Lấy reviews của một phim (Public)
export const getMovieReviews = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const { page, limit, sortBy, sortOrder, rating } = req.query;
  
  if (!isValidObjectId(movieId)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder === 'asc' ? 1 : -1,
    rating: rating ? parseInt(rating) : undefined
  };
  
  const result = await reviewService.getMovieReviews(movieId, options);
  
  res.status(200).json({
    success: true,
    message: 'Lấy reviews thành công',
    data: result.reviews,
    ratingStats: result.ratingStats,
    pagination: result.pagination
  });
});

// Lấy reviews cho episode (Public)
export const getEpisodeReviews = asyncHandler(async (req, res) => {
  const { episodeId } = req.params
  const { page, limit, sortBy, sortOrder, rating } = req.query

  if (!isValidObjectId(episodeId)) {
    return res.status(400).json({ success: false, message: 'ID episode không hợp lệ' })
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder === 'asc' ? 1 : -1,
    rating: rating ? parseInt(rating) : undefined
  }

  const result = await reviewService.getEpisodeReviews(episodeId, options)
  res.status(200).json({ success: true, message: 'Lấy reviews thành công', data: result.reviews, pagination: result.pagination })
})

// Lấy review của user cho phim (Protected)
export const getUserReviewForMovie = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const userId = req.user._id;
  
  if (!isValidObjectId(movieId)) {
    return res.status(400).json({
      success: false,
      message: 'ID phim không hợp lệ'
    });
  }
  
  const review = await reviewService.getUserReviewForMovie(userId, movieId);
  
  res.status(200).json({
    success: true,
    message: review ? 'Đã có review' : 'Chưa có review',
    data: review
  });
});

// Lấy tất cả reviews của user (Protected)
export const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page, limit, sortBy, sortOrder } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder === 'asc' ? 1 : -1
  };
  
  const result = await reviewService.getUserReviews(userId, options);
  
  res.status(200).json({
    success: true,
    message: 'Lấy reviews của bạn thành công',
    data: result.reviews,
    pagination: result.pagination
  });
});

// Xóa review của mình (Protected)
export const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  
  if (!isValidObjectId(reviewId)) {
    return res.status(400).json({
      success: false,
      message: 'ID review không hợp lệ'
    });
  }
  
  await reviewService.deleteReview(reviewId, userId);
  
  res.status(200).json({
    success: true,
    message: 'Xóa review thành công'
  });
});

// Admin xóa review (Admin only)
export const adminDeleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  
  if (!isValidObjectId(reviewId)) {
    return res.status(400).json({
      success: false,
      message: 'ID review không hợp lệ'
    });
  }
  
  await reviewService.adminDeleteReview(reviewId);
  
  res.status(200).json({
    success: true,
    message: 'Xóa review thành công'
  });
});

// Thống kê reviews (Admin only)
export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await reviewService.getReviewStats();
  
  res.status(200).json({
    success: true,
    message: 'Lấy thống kê reviews thành công',
    data: stats
  });
});

// Báo cáo review (Protected)
export const reportReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id
  const userId = req.user && (req.user._id || req.user.id)
  const { reason, details } = req.body

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn lý do báo cáo' })
  }

  const review = await Review.findById(reviewId)
  if (!review) return res.status(404).json({ success: false, message: 'Review không tồn tại' })

  review.reports = review.reports || []
  review.reports.push({ reporter: userId, reason: String(reason).trim(), details: String(details || '') })
  await review.save()

  // trả lại report vừa tạo
  const last = review.reports[review.reports.length - 1]
  return res.status(200).json({ success: true, data: last })
})

// Lấy danh sách review cho admin (Admin only)
export const getAdminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.max(1, Number(req.query.limit) || 20)
  const skip = (page - 1) * limit

  const match = {}

  if (req.query.q) {
    const q = String(req.query.q).trim()
    match.$or = [
      { comment: { $regex: q, $options: 'i' } },
      { 'user.username': { $regex: q, $options: 'i' } },
      { 'user.fullName': { $regex: q, $options: 'i' } }
    ]
    // note: this $or on subfields is for readability; below we also allow populate-filter fallback
  }

  if (req.query.rating) match.rating = Number(req.query.rating)
  if (req.query.status === 'hidden') match.isPublished = false
  if (req.query.status === 'published') match.isPublished = true
  if (req.query.reportedOnly === 'true' || req.query.reportedOnly === '1') 
    // only reviews that have at least one report with isHandled === false
    match['reports'] = { $elemMatch: { isHandled: false } }

  // build aggregation to allow text search on populated fields
  const agg = []
  if (Object.keys(match).length) agg.push({ $match: match })
  agg.push({ $sort: { createdAt: -1 } })
  agg.push({ $skip: skip })
  agg.push({ $limit: limit })

  // lookup user and movie for admin view
  agg.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'movies',
        localField: 'movie',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } }
  )

  const [items, countRes] = await Promise.all([
    Review.aggregate(agg).exec(),
    Review.countDocuments(match)
  ])

  const total = countRes || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return res.status(200).json({
    success: true,
    data: items,
    pagination: { page, limit, totalPages, totalItems: total }
  })
})

export const markReportHandled = asyncHandler(async (req, res) => {
  const { reviewId, reportId } = req.params
  if (!reviewId || !reportId) return res.status(400).json({ success: false, message: 'Missing params' })

  const review = await Review.findById(reviewId)
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' })

  const report = review.reports.id(reportId)
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' })

  report.isHandled = true
  await review.save()

  return res.status(200).json({ success: true, data: report })
})

export const updateReview = asyncHandler(async (req, res) => {
  const id = req.params.id
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'ID review không hợp lệ' })

  const review = await Review.findById(id)
  if (!review) return res.status(404).json({ success: false, message: 'Review không tồn tại' })

  const userId = req.user && (req.user._id || req.user.id)
  const isAdmin = Array.isArray(req.user?.roles) ? req.user.roles.includes('admin') : req.user?.role === 'admin'

  // only owner or admin can update
  if (!isAdmin && String(review.user) !== String(userId)) {
    return res.status(403).json({ success: false, message: 'Không có quyền cập nhật review này' })
  }

  const allowed = ['comment', 'rating', 'isPublished', 'reviewed']
  allowed.forEach(k => {
    if (typeof req.body[k] !== 'undefined') review[k] = req.body[k]
  })

  await review.save()
  const populated = await Review.findById(review._id).populate('user', 'username fullName avatar').populate('movie', 'title poster slug')
  return res.status(200).json({ success: true, data: populated })
})

export const markReviewed = asyncHandler(async (req, res) => {
  const id = req.params.id
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'ID review không hợp lệ' })

  // admin only — authorize middleware should protect route, but double-check
  const review = await Review.findById(id)
  if (!review) return res.status(404).json({ success: false, message: 'Review không tồn tại' })

  review.reviewed = true
  if (Array.isArray(review.reports) && review.reports.length) {
    review.reports = review.reports.map(r => {
      r.isHandled = true
      return r
    })
  }
  await review.save()
  return res.status(200).json({ success: true, message: 'Đã đánh dấu là đã xử lý', data: review })
})