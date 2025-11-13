import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthService {
  // Generate JWT Token
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
  }

  // Đăng ký user mới
  async register(userData) {
    try {
      const { username, passwordHash, email, fullName, role } = userData; // ← THÊM role

      // Kiểm tra username đã tồn tại
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        throw new Error('Tên đăng nhập đã tồn tại');
      }

      // Kiểm tra email đã tồn tại (nếu có)
      if (email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
          throw new Error('Email đã được sử dụng');
        }
      }

      // Tạo user mới
      const user = await User.create({
        username: username.toLowerCase(),
        passwordHash,
        email: email ? email.toLowerCase() : undefined,
        fullName,
        role: role || 'user' // ← THÊM role, mặc định 'user'
      });

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi đăng ký: ${error.message}`);
    }
  }

  // Đăng nhập
  async login(username, password) {
    try {
      // Tìm user và include password
      const user = await User.findOne({ username: username.toLowerCase() }).select('+passwordHash');

      if (!user || !(await user.comparePassword(password))) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      }

      // Kiểm tra trạng thái user
      if (user.status === 'banned') {
        throw new Error('Tài khoản đã bị khóa');
      }

      // Cập nhật last login
      user.lastLogin = new Date();
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi đăng nhập: ${error.message}`);
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.id);
      
      if (!user || user.status === 'banned') {
        throw new Error('Token không hợp lệ');
      }

      return user;
    } catch (error) {
      throw new Error('Token không hợp lệ');
    }
  }

  // Đổi mật khẩu
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+passwordHash');
      if (!user) {
        throw new Error('Không tìm thấy user');
      }

      // Kiểm tra mật khẩu hiện tại
      if (!(await user.comparePassword(currentPassword))) {
        throw new Error('Mật khẩu hiện tại không đúng');
      }

      // Cập nhật mật khẩu mới
      user.passwordHash = newPassword;
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Lỗi khi đổi mật khẩu: ${error.message}`);
    }
  }
}

export default new AuthService();