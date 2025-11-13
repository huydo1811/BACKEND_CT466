import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const client = new OAuth2Client();

// Google OAuth login
export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: 'Google credential là bắt buộc'
    });
  }

  try {
    // Verify Google token - không check audience
    const ticket = await client.verifyIdToken({
      idToken: credential
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    console.log('Google User:', { googleId, email, name });

    // Tìm user với googleId
    let user = await User.findOne({ googleId });

    if (user) {
      console.log('User đã tồn tại:', user.username);
    } else {
      // Kiểm tra email đã được dùng
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        // Link Google với account hiện tại
        existingEmailUser.googleId = googleId;
        existingEmailUser.avatar = picture;
        await existingEmailUser.save();
        user = existingEmailUser;
        console.log('Linked Google với user hiện tại:', user.username);
      } else {
        // Tạo username unique
        let username = email.split('@')[0];
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          username = username + '_' + Date.now();
        }

        // Tạo user mới từ Google
        user = await User.create({
          googleId,
          username,
          email,
          fullName: name,
          avatar: picture,
          role: 'user'
        });
        console.log('Tạo user mới từ Google:', user.username);
      }
    }

    // Generate JWT token
    const token = authService.generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công',
      data: user,
      token
    });

  } catch (error) {
    console.error('Google OAuth Error:', error);
    res.status(400).json({
      success: false,
      message: 'Token Google không hợp lệ'
    });
  }
});