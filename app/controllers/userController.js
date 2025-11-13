import userService from '../services/userService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import fs from 'fs'
import path from 'path'

const buildFileUrl = (req, filename, folder = 'avatars') => {
  if (!filename) return ''
  const rel = `/uploads/${folder}/${filename}`
  return `${req.protocol}://${req.get('host')}${rel}`
}

const deleteUploadedFile = (fileUrl, folder = 'avatars') => {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return
    const segment = `/uploads/${folder}/`
    const idx = fileUrl.indexOf(segment)
    if (idx === -1) return
    const filename = fileUrl.slice(idx + segment.length)
    const fp = path.join(process.cwd(), 'uploads', folder, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (e) { console.warn('deleteUploadedFile fail', e) }
}

// Lấy tất cả users (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role, status } = req.query;
  
  const result = await userService.getAllUsers({
    page,
    limit,
    search,
    role,
    status
  });

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách users thành công',
    data: result.users,
    pagination: result.pagination
  });
});

// Lấy user theo ID
export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin user thành công',
    data: user
  });
});

// Tạo user mới (admin only)
export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    message: 'Tạo user thành công',
    data: user
  });
});

// Cập nhật user
export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Cập nhật user thành công',
    data: user
  });
});

// Ban user
export const banUser = asyncHandler(async (req, res) => {
  await userService.banUser(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Ban user thành công'
  });
});

// Unban user
export const unbanUser = asyncHandler(async (req, res) => {
  await userService.unbanUser(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Unban user thành công'
  });
});

// Đổi role user
export const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role là bắt buộc'
    });
  }

  await userService.changeUserRole(req.params.id, role);

  res.status(200).json({
    success: true,
    message: 'Đổi role thành công'
  });
});

// Tìm kiếm users
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Từ khóa tìm kiếm là bắt buộc'
    });
  }

  const users = await userService.searchUsers(q);

  res.status(200).json({
    success: true,
    message: 'Tìm kiếm users thành công',
    data: users
  });
});

// Thống kê users
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats();

  res.status(200).json({
    success: true,
    message: 'Lấy thống kê users thành công',
    data: stats
  });
});

// Lấy profile current user
export const getMe = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id)
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })
  const user = await userService.getUserById(uid)
  res.status(200).json({ success: true, data: user })
})

// Cập nhật profile current user (accept multipart with avatar)
export const updateMe = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id)
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })
  
  const body = req.body || {}
  const payload = {}
  if (body.fullName || body.name) payload.fullName = body.fullName ?? body.name
  if (typeof body.phone !== 'undefined') payload.phone = body.phone || null
  if (typeof body.bio !== 'undefined') payload.bio = body.bio || ''
  if (body.birthdate) payload.birthdate = new Date(body.birthdate)
  
  // handle avatar file (multer sets req.file)
  const existing = await userService.getUserById(uid).catch(()=>null)
  if (req.file && req.file.filename) {
    if (existing && existing.avatar) deleteUploadedFile(existing.avatar, 'avatars')
    payload.avatar = buildFileUrl(req, req.file.filename, 'avatars')
  } else if (body.avatar) {
    payload.avatar = body.avatar
  } else if (existing && existing.avatar) {
    payload.avatar = existing.avatar
  }
  
  const updated = await userService.updateUser(uid, payload)
  res.status(200).json({ success: true, data: updated })
})

// Lấy danh sách favorite của user hiện tại
export async function getMyFavorites(req, res) {
  try {
    const uid = req.user && (req.user._id || req.user.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const favs = await userService.getFavorites(uid)
    return res.status(200).json({ success: true, data: favs })
  } catch (err) {
    console.error('getMyFavorites error', err)
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}

// Thêm movie vào favorites của user
export async function addFavorite(req, res) {
  try {
    const uid = req.user && (req.user._id || req.user.id)
    const { mid } = req.params
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })
    if (!mid) return res.status(400).json({ success: false, message: 'Missing movieId' })

    const updated = await userService.addFavorite(uid, mid)
    return res.status(200).json({ success: true, data: updated.favorites || updated })
  } catch (err) {
    console.error('addFavorite error', err)
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}

// Xóa movie khỏi favorites của user
export async function removeFavorite(req, res) {
  try {
    const uid = req.user && (req.user._id || req.user.id)
    const { mid } = req.params
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })
    if (!mid) return res.status(400).json({ success: false, message: 'Missing movieId' })

    const updated = await userService.removeFavorite(uid, mid)
    return res.status(200).json({ success: true, data: updated.favorites || updated })
  } catch (err) {
    console.error('removeFavorite error', err)
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}

// Get watch history
export const getMyHistory = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id);
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
  
  const history = await userService.getHistory(uid);
  res.json({ success: true, data: history });
});

// Add to history
export const addToHistory = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id);
  const { movieId, progress } = req.body;
  
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });
  
  await userService.addToHistory(uid, movieId, progress || 0);
  res.json({ success: true, message: 'Đã lưu lịch sử xem' });
});

// Remove history item
export const deleteHistoryItem = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id);
  const { hid } = req.params;
  
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!hid) return res.status(400).json({ success: false, message: 'Missing history id' });
  
  await userService.removeFromHistory(uid, hid);
  res.json({ success: true, message: 'Đã xóa lịch sử' });
});

// Clear all history
export const clearMyHistory = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id);
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
  
  await userService.clearHistory(uid);
  res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử' });
});

// Get user's reviews
export const getMyReviews = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id);
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
  
  const reviews = await userService.getUserReviews(uid);
  res.json({ success: true, data: reviews });
});