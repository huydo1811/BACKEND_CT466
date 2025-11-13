import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Middleware bảo vệ routes (kiểm tra JWT token)
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Lấy token từ header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Kiểm tra token có tồn tại không
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bạn cần đăng nhập để truy cập'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Lấy user từ token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Kiểm tra user có bị ban không
    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    // Gán user vào req để dùng ở các middleware tiếp theo
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
});

// Middleware kiểm tra role admin
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới có quyền truy cập'
    });
  }
};

// Middleware kiểm tra quyền (flexible)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} không có quyền truy cập`
      });
    }
    next();
  };
};