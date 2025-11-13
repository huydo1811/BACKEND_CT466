import bannerService from '../services/bannerService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs'
import path from 'path'

const buildFileUrl = (req, filename, folder = 'banners') => {
  if (!filename) return ''
  const rel = `/uploads/${folder}/${filename}`
  return `${req.protocol}://${req.get('host')}${rel}`
}

// replace safeUnlink + usages with robust helper that works with full URL or relative path
const deleteUploadedFile = (fileUrl, folder = 'banners') => {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return
    const segment = `/uploads/${folder}/`
    const idx = fileUrl.indexOf(segment)
    if (idx === -1) return
    const filename = fileUrl.slice(idx + segment.length)
    const fp = path.join(process.cwd(), 'uploads', folder, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (e) {
    console.warn('deleteUploadedFile fail', e)
  }
}

// Lấy tất cả banners (Admin + Public)
export const getAllBanners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, position, isActive } = req.query;
  
  const filters = {};
  if (position) filters.position = position;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  
  const result = await bannerService.getAllBanners(
    parseInt(page),
    parseInt(limit),
    filters
  );
  
  res.status(200).json({
    success: true,
    message: 'Lấy danh sách banner thành công',
    data: result.banners,
    pagination: result.pagination
  });
});

// Lấy banners active theo position (Public)
export const getActiveBanners = asyncHandler(async (req, res) => {
  const { position = 'hero', limit = 5 } = req.query;
  
  const banners = await bannerService.getActiveBanners(position, parseInt(limit));
  
  res.status(200).json({
    success: true,
    message: `Lấy banner ${position} thành công`,
    data: banners
  });
});

// Lấy banner theo ID
export const getBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const banner = await bannerService.getBannerById(id);
  
  res.status(200).json({
    success: true,
    message: 'Lấy banner thành công',
    data: banner
  });
});

// Tạo banner mới (Admin only)
export const createBanner = asyncHandler(async (req, res) => {
  const bannerData = { ...req.body }

  // map uploaded files
  if (req.files && req.files.image && req.files.image[0]) {
    bannerData.image = buildFileUrl(req, req.files.image[0].filename, 'banners')
  }
  if (req.files && req.files.mobileImage && req.files.mobileImage[0]) {
    bannerData.mobileImage = buildFileUrl(req, req.files.mobileImage[0].filename, 'banners')
  }

  const banner = await bannerService.createBanner(bannerData);
  
  res.status(201).json({
    success: true,
    message: 'Tạo banner thành công',
    data: banner
  });
});

// Cập nhật banner (Admin only)
export const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bannerData = { ...req.body }

  // fetch existing to remove old files if replaced
  let existing = null
  try { existing = await bannerService.getBannerById(id) } catch {}

  if (req.files && req.files.image && req.files.image[0]) {
    // delete old file on disk (works for '/uploads/...' or 'http://host/uploads/...')
    if (existing && existing.image) deleteUploadedFile(existing.image, 'banners')
    bannerData.image = buildFileUrl(req, req.files.image[0].filename, 'banners')
  }
  if (req.files && req.files.mobileImage && req.files.mobileImage[0]) {
    if (existing && existing.mobileImage) deleteUploadedFile(existing.mobileImage, 'banners')
    bannerData.mobileImage = buildFileUrl(req, req.files.mobileImage[0].filename, 'banners')
  }

  const banner = await bannerService.updateBanner(id, bannerData);
  
  res.status(200).json({
    success: true,
    message: 'Cập nhật banner thành công',
    data: banner
  });
});

// Xóa banner (Admin only)
export const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // get existing to delete files
  let existing = null
  try { existing = await bannerService.getBannerById(id) } catch {}
  if (existing) {
    if (existing.image) deleteUploadedFile(existing.image, 'banners')
    if (existing.mobileImage) deleteUploadedFile(existing.mobileImage, 'banners')
  }

  await bannerService.deleteBanner(id);
  
  res.status(200).json({
    success: true,
    message: 'Xóa banner thành công'
  });
});

// Toggle trạng thái banner (Admin only)
export const toggleBannerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const banner = await bannerService.toggleBannerStatus(id);
  
  res.status(200).json({
    success: true,
    message: 'Thay đổi trạng thái banner thành công',
    data: banner
  });
});

// Tăng view count (Public)
export const incrementView = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const banner = await bannerService.incrementView(id);
  
  res.status(200).json({
    success: true,
    message: 'Tăng view count thành công',
    data: {
      bannerId: banner._id,
      viewCount: banner.viewCount
    }
  });
});

// Tăng click count (Public)
export const incrementClick = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const banner = await bannerService.incrementClick(id);
  
  res.status(200).json({
    success: true,
    message: 'Tăng click count thành công',
    data: {
      bannerId: banner._id,
      clickCount: banner.clickCount,
      linkUrl: banner.linkUrl
    }
  });
});

// Lấy thống kê banner (Admin only)
export const getBannerStats = asyncHandler(async (req, res) => {
  const stats = await bannerService.getBannerStats();
  
  res.status(200).json({
    success: true,
    message: 'Lấy thống kê banner thành công',
    data: stats
  });
});