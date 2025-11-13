import { getPermissions } from '../config/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Lấy permissions của current user
export const getMyPermissions = asyncHandler(async (req, res) => {
  const userRole = req.user?.role || 'user';
  const permissions = getPermissions(userRole);

  res.json({
    success: true,
    data: {
      role: userRole,
      permissions
    }
  });
});