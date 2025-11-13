import categoryService from '../services/categoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import path from 'path';

// Helper: build full URL
const buildFileUrl = (req, filename, folder = 'categories') => {
  if (!filename) return ''
  const rel = `/uploads/${folder}/${filename}`
  return `${req.protocol}://${req.get('host')}${rel}`
}

// Helper: delete file từ URL đầy đủ hoặc relative path
const deleteUploadedFile = (fileUrl, folder = 'categories') => {
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

// Lấy tất cả thể loại
export const getAllCategories = asyncHandler(async (req, res) => {
  const { limit, page, search, sortBy, withCount } = req.query;
  const result = await categoryService.getAllCategories({
    limit,
    page,
    search,
    sortBy,
    withCount: withCount === 'true'
  });
  
  res.status(200).json({
    success: true,
    data: result.categories,
    pagination: result.pagination
  });
});

// Lấy thể loại theo ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin thể loại thành công',
    data: category
  });
});

// Lấy thể loại theo slug
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin thể loại thành công',
    data: category
  });
});

// Tạo thể loại mới
export const createCategory = asyncHandler(async (req, res) => {
  const categoryData = { ...req.body };
  
  // Xử lý file upload
  if (req.file) {
    categoryData.image = buildFileUrl(req, req.file.filename, 'categories');
  }
  
  const category = await categoryService.createCategory(categoryData);

  res.status(201).json({
    success: true,
    message: 'Tạo thể loại thành công',
    data: category
  });
});

// Cập nhật thể loại
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  
  // Lấy category cũ để xóa file ảnh cũ nếu có ảnh mới
  let existing = null;
  try { 
    existing = await categoryService.getCategoryById(id);
  } catch {}
  
  // Xử lý file upload mới
  if (req.file) {
    // Xóa ảnh cũ
    if (existing && existing.image) {
      deleteUploadedFile(existing.image, 'categories');
    }
    updateData.image = buildFileUrl(req, req.file.filename, 'categories');
  }
  
  const category = await categoryService.updateCategory(id, updateData);

  res.status(200).json({
    success: true,
    message: 'Cập nhật thể loại thành công',
    data: category
  });
});

// Xóa thể loại
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Lấy category để xóa file ảnh
  let existing = null;
  try {
    existing = await categoryService.getCategoryById(id);
  } catch {}
  
  if (existing && existing.image) {
    deleteUploadedFile(existing.image, 'categories');
  }
  
  await categoryService.deleteCategory(id);

  res.status(200).json({
    success: true,
    message: 'Xóa thể loại thành công'
  });
});

// Tìm kiếm thể loại
export const searchCategories = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Từ khóa tìm kiếm là bắt buộc'
    });
  }

  const categories = await categoryService.searchCategories(q);

  res.status(200).json({
    success: true,
    message: 'Tìm kiếm thể loại thành công',
    data: categories
  });
});