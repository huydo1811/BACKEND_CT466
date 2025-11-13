import Banner from '../models/Banner.js';

class BannerService {
  
  // Lấy tất cả banners với phân trang
  async getAllBanners(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      
      let query = {};
      
      // Filter theo position
      if (filters.position) {
        query.position = filters.position;
      }
      
      // Filter theo isActive
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      const banners = await Banner.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('targetId');
      
      const total = await Banner.countDocuments(query);
      
      return {
        banners,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách banner: ${error.message}`);
    }
  }
  
  // Lấy banners active theo position
  async getActiveBanners(position = 'hero', limit = 5) {
    try {
      const banners = await Banner.find({
        position,
        isActive: true
      })
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('targetId');
      
      return banners;
    } catch (error) {
      throw new Error(`Lỗi khi lấy banner active: ${error.message}`);
    }
  }
  
  // Lấy banner theo ID
  async getBannerById(id) {
    try {
      const banner = await Banner.findById(id).populate('targetId');
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi lấy banner: ${error.message}`);
    }
  }
  
  // Tạo banner mới
  async createBanner(bannerData) {
    try {
      const banner = await Banner.create(bannerData);
      return banner;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Banner đã tồn tại');
      }
      throw new Error(`Lỗi khi tạo banner: ${error.message}`);
    }
  }
  
  // Cập nhật banner
  async updateBanner(id, bannerData) {
    try {
      const banner = await Banner.findByIdAndUpdate(
        id,
        bannerData,
        { new: true, runValidators: true }
      ).populate('targetId');
      
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật banner: ${error.message}`);
    }
  }
  
  // Xóa banner
  async deleteBanner(id) {
    try {
      const banner = await Banner.findByIdAndDelete(id);
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi xóa banner: ${error.message}`);
    }
  }
  
  // Toggle active status
  async toggleBannerStatus(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      
      banner.isActive = !banner.isActive;
      await banner.save();
      
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi thay đổi trạng thái banner: ${error.message}`);
    }
  }
  
  // Tăng view count
  async incrementView(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      
      await banner.incrementView();
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi tăng view count: ${error.message}`);
    }
  }
  
  // Tăng click count
  async incrementClick(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new Error('Banner không tồn tại');
      }
      
      await banner.incrementClick();
      return banner;
    } catch (error) {
      throw new Error(`Lỗi khi tăng click count: ${error.message}`);
    }
  }
  
  // Thống kê banner
  async getBannerStats() {
    try {
      const stats = await Banner.aggregate([
        {
          $group: {
            _id: null,
            totalBanners: { $sum: 1 },
            activeBanners: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            totalViews: { $sum: '$viewCount' },
            totalClicks: { $sum: '$clickCount' }
          }
        }
      ]);
      
      const positionStats = await Banner.aggregate([
        {
          $group: {
            _id: '$position',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            totalClicks: { $sum: '$clickCount' }
          }
        }
      ]);
      
      return {
        overview: stats[0] || {
          totalBanners: 0,
          activeBanners: 0,
          totalViews: 0,
          totalClicks: 0
        },
        positionBreakdown: positionStats
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê banner: ${error.message}`);
    }
  }
}

export default new BannerService();