import User from '../models/User.js';
import authService from '../services/authService.js';
import userService from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Đăng ký
export const register = asyncHandler(async (req, res) => {
  const { username, passwordHash, email, fullName, role } = req.body;

  // Validate input
  if (!username || !passwordHash || !fullName) {
    return res.status(400).json({
      success: false,
      message: 'Tên đăng nhập và mật khẩu là bắt buộc'
    });
  }

  // Tạo user mới
  const user = await authService.register({ username, passwordHash, email, fullName, role });

  // Generate token
  const token = authService.generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: user,
    token
  });
});

// Đăng nhập
export const login = asyncHandler(async (req, res) => {
  const { username, passwordHash } = req.body;

  // Validate input
  if (!username || !passwordHash) {
    return res.status(400).json({
      success: false,
      message: 'Tên đăng nhập và mật khẩu là bắt buộc'
    });
  }

  // Đăng nhập
  const user = await authService.login(username, passwordHash);

  // Generate token
  const token = authService.generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    data: user,
    token
  });
});

// Get profile
export const getProfile = asyncHandler(async (req, res) => {
  const uid = req.user && (req.user._id || req.user.id)
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' })

  // return populated user (includes favorites)
  const user = await userService.getUserById(uid)
  res.status(200).json({ success: true, data: user })
});

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, avatar } = req.body;
  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Không xác định được user' });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { fullName, email, avatar },
    { new: true, runValidators: true }
  ).select('-passwordHash -passwordResetToken -passwordResetExpires');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User không tồn tại' });
  }

  return res.json({ success: true, data: { user } });
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Không xác định được user' });
  }

  await authService.changePassword(userId, currentPassword, newPassword);

  return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});