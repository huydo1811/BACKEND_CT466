import mongoose from 'mongoose';
import User from '../models/User.js';
import Movie from '../models/Movie.js' // add at top if not present

class UserService {
  // Lấy tất cả users (admin only)
  async getAllUsers(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        role = '', 
        status = '' 
      } = options;
      
      let query = {};
      
      // Tìm kiếm theo username, email, fullName
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Lọc theo role
      if (role) {
        query.role = role;
      }
      
      // Lọc theo status
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: Number(limit)
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách users: ${error.message}`);
    }
  }

  // Lấy user theo ID
  async getUserById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID không hợp lệ');
      }

      // populate favorites and return plain object for frontend
      const user = await User.findById(id)
        .populate({ path: 'favorites', select: 'title poster slug year' })
        .lean();

      if (!user) {
        throw new Error('Không tìm thấy user');
      }
      // ensure stats exist and favorites count matches
      user.stats = user.stats || {}
      user.stats.favorites = user.stats.favorites || (Array.isArray(user.favorites) ? user.favorites.length : 0)
      return user;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin user: ${error.message}`);
    }
  }

  // Lấy user theo username
  async getUserByUsername(username) {
    try {
      const user = await User.findOne({ username: username.toLowerCase() });
      return user;
    } catch (error) {
      throw new Error(`Lỗi khi lấy user theo username: ${error.message}`);
    }
  }

  // Tạo user mới
  async createUser(userData) {
    try {
      // Kiểm tra username đã tồn tại
      const existingUser = await User.findOne({ 
        username: userData.username.toLowerCase() 
      });
      
      if (existingUser) {
        throw new Error('Tên đăng nhập đã được sử dụng');
      }

      // Kiểm tra email đã tồn tại (nếu có)
      if (userData.email) {
        const existingEmail = await User.findOne({ 
          email: userData.email.toLowerCase() 
        });
        
        if (existingEmail) {
          throw new Error('Email đã được sử dụng');
        }
      }

      // Tạo user mới
      const user = await User.create({
        ...userData,
        username: userData.username.toLowerCase(),
        email: userData.email ? userData.email.toLowerCase() : undefined
      });

      return user;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        throw new Error(`Dữ liệu không hợp lệ: ${errors.join(', ')}`);
      }
      throw new Error(`Lỗi khi tạo user: ${error.message}`);
    }
  }

  // Cập nhật user
  async updateUser(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID không hợp lệ');
      }

      // Không cho phép update password qua route này
      if (updateData.passwordHash) {
        delete updateData.passwordHash;
      }

      // Kiểm tra username đã tồn tại (ngoại trừ user hiện tại)
      if (updateData.username) {
        const existingUser = await User.findOne({ 
          username: updateData.username.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (existingUser) {
          throw new Error('Tên đăng nhập đã được sử dụng');
        }
        
        updateData.username = updateData.username.toLowerCase();
      }

      // Kiểm tra email đã tồn tại (ngoại trừ user hiện tại)
      if (updateData.email) {
        const existingEmail = await User.findOne({ 
          email: updateData.email.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (existingEmail) {
          throw new Error('Email đã được sử dụng');
        }
        
        updateData.email = updateData.email.toLowerCase();
      }

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('Không tìm thấy user');
      }

      return user;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        throw new Error(`Dữ liệu không hợp lệ: ${errors.join(', ')}`);
      }
      throw new Error(`Lỗi khi cập nhật user: ${error.message}`);
    }
  }

  // Ban user
  async banUser(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID không hợp lệ');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { status: 'banned' },
        { new: true }
      );

      if (!user) {
        throw new Error('Không tìm thấy user');
      }

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi ban user: ${error.message}`);
    }
  }

  // Unban user
  async unbanUser(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID không hợp lệ');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { status: 'active' },
        { new: true }
      );

      if (!user) {
        throw new Error('Không tìm thấy user');
      }

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi unban user: ${error.message}`);
    }
  }

  // Đổi role user
  async changeUserRole(id, newRole) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID không hợp lệ');
      }

      if (!['user', 'admin'].includes(newRole)) {
        throw new Error('Role không hợp lệ');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role: newRole },
        { new: true }
      );

      if (!user) {
        throw new Error('Không tìm thấy user');
      }

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi đổi role: ${error.message}`);
    }
  }

  // Tìm kiếm users
  async searchUsers(searchTerm) {
    try {
      const users = await User.find({
        $and: [
          { status: 'active' },
          {
            $or: [
              { username: { $regex: searchTerm, $options: 'i' } },
              { fullName: { $regex: searchTerm, $options: 'i' } },
              { email: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        ]
      }).sort({ username: 1 });

      return users;
    } catch (error) {
      throw new Error(`Lỗi khi tìm kiếm users: ${error.message}`);
    }
  }

  // Thống kê users
  async getUserStats() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });
      const bannedUsers = await User.countDocuments({ status: 'banned' });
      const adminUsers = await User.countDocuments({ role: 'admin' });

      return {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        admins: adminUsers,
        regularUsers: totalUsers - adminUsers
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê users: ${error.message}`);
    }
  }

  // get history paged or full
  async getUserHistory(userId, opts = {}) {
    const user = await User.findById(userId).select('history').lean()
    if (!user) return []
    let hist = (user.history || []).slice().reverse() // newest first
    if (opts.limit) hist = hist.slice(0, opts.limit)
    return hist
  }

  async addToHistory(userId, entry) {
    // entry: { movieId, title, poster, progress, duration }
    const doc = await User.findByIdAndUpdate(
      userId,
      { $push: { history: { $each: [entry] } } },
      { new: true }
    )
    return doc
  }

  async removeHistoryItem(userId, hid) {
    await User.findByIdAndUpdate(userId, { $pull: { history: { _id: hid } } })
  }

  async clearHistory(userId) {
    await User.findByIdAndUpdate(userId, { $set: { history: [] } })
  }

  async addFavorite(userId, movieId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(movieId)) throw new Error('Movie ID không hợp lệ')
      const movie = await Movie.findById(movieId).select('_id title poster')
      if (!movie) throw new Error('Movie không tồn tại')

      const user = await User.findById(userId)
      if (!user) throw new Error('User không tồn tại')

      const exists = (user.favorites || []).some(f => String(f) === String(movieId))
      if (!exists) {
        user.favorites = user.favorites || []
        user.favorites.push(movie._id)
        user.stats = user.stats || {}
        user.stats.favorites = (user.stats.favorites || 0) + 1
        await user.save()
      }
      return await User.findById(userId).populate('favorites', 'title poster slug').lean()
    } catch (error) {
      throw new Error(`Lỗi khi thêm yêu thích: ${error.message}`)
    }
  }

  async removeFavorite(userId, movieId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(movieId)) throw new Error('Movie ID không hợp lệ')
      const user = await User.findById(userId)
      if (!user) throw new Error('User không tồn tại')

      const prevCount = (user.favorites || []).length
      user.favorites = (user.favorites || []).filter(f => String(f) !== String(movieId))
      if ((user.stats?.favorites || 0) > 0 && user.favorites.length !== prevCount) {
        user.stats.favorites = Math.max(0, (user.stats.favorites || 0) - 1)
      }
      await user.save()
      return await User.findById(userId).populate('favorites', 'title poster slug').lean()
    } catch (error) {
      throw new Error(`Lỗi khi xóa yêu thích: ${error.message}`)
    }
  }

  async getFavorites(userId) {
    try {
      const user = await User.findById(userId)
        .populate({
          path: 'favorites',
          select: 'title poster slug year type rating' // <-- THÊM 'type' và 'rating'
        })
        .lean();
      
      if (!user) {
        throw new Error('User không tồn tại');
      }
      
      return (user.favorites || []).map(m => ({
        _id: m._id,
        title: m.title,
        poster: m.poster,
        slug: m.slug,
        year: m.year,
        type: m.type, // <-- ĐẢM BẢO có type
        rating: m.rating?.average || 0
      }));
    } catch (error) {
      throw new Error(`Lỗi khi lấy favorites: ${error.message}`)
    }
  }

  // Add to watch history
  async addToHistory(userId, movieId, progress = 0) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User không tồn tại');
      
      const movie = await Movie.findById(movieId);
      if (!movie) throw new Error('Movie không tồn tại');
      
      user.history = user.history.filter(h => String(h.movie) !== String(movieId));
      
      user.history.unshift({
        movie: movieId,
        progress: progress,
        watchedAt: new Date()
      });
      
      if (user.history.length > 50) {
        user.history = user.history.slice(0, 50);
      }
      
      await user.save();
      return user;
    } catch (error) {
      throw new Error(`Lỗi khi thêm lịch sử: ${error.message}`);
    }
  }

  async getHistory(userId) {
    try {
      const user = await User.findById(userId)
        .populate({
          path: 'history.movie',
          select: 'title slug poster year duration type rating',
          match: { isPublished: true }
        })
        .lean();
      
      if (!user) throw new Error('User không tồn tại');
      
      return (user.history || [])
        .filter(h => h.movie)
        .map(h => ({
          _id: h._id,
          id: h.movie._id,
          title: h.movie.title,
          slug: h.movie.slug,
          poster: h.movie.poster,
          year: h.movie.year,
          duration: h.movie.duration ? `${h.movie.duration} phút` : '',
          type: h.movie.type,
          rating: h.movie.rating?.average || 0,
          progress: h.progress || 0,
          watchedAt: h.watchedAt
        }));
    } catch (error) {
      throw new Error(`Lỗi khi lấy lịch sử: ${error.message}`);
    }
  }

  async removeFromHistory(userId, historyId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User không tồn tại');
      
      user.history = user.history.filter(h => String(h._id) !== String(historyId));
      await user.save();
    } catch (error) {
      throw new Error(`Lỗi khi xóa lịch sử: ${error.message}`);
    }
  }

  async clearHistory(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User không tồn tại');
      
      user.history = [];
      await user.save();
    } catch (error) {
      throw new Error(`Lỗi khi xóa lịch sử: ${error.message}`);
    }
  }

  async getUserReviews(userId) {
    try {
      const Review = mongoose.model('Review');
      const reviews = await Review.find({ user: userId })
        .populate({
          path: 'movie',
          select: 'title slug poster year type' 
        })
        .sort('-createdAt')
        .lean();

      return reviews
        .filter(r => r.movie)
        .map(r => ({
          _id: r._id,
          movieId: r.movie._id,
          movieTitle: r.movie.title,
          movieSlug: r.movie.slug,
          moviePoster: r.movie.poster,
          movieYear: r.movie.year,
          movieType: r.movie.type, 
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt
        }));
    } catch (error) {
      throw new Error(`Lỗi khi lấy reviews: ${error.message}`);
    }
  }
}

export default new UserService();