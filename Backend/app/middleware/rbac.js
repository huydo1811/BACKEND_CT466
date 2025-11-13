import { can, isAdminRole } from '../config/roles.js';

/**
 * Middleware kiểm tra permission cho resource cụ thể
 * @param {string} resource - movies, users, settings, ...
 * @param {string} action - view, create, edit, delete, ban, moderate
 */
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - No role found'
        });
      }

      // Check permission
      if (!can(userRole, resource, action)) {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền ${action} ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('requirePermission error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi kiểm tra quyền hạn'
      });
    }
  };
};

/**
 * Middleware chỉ cho phép admin (bất kỳ loại admin nào)
 */
export const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  
  if (!isAdminRole(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Yêu cầu quyền admin'
    });
  }
  
  next();
};

/**
 * Middleware chỉ cho phép superadmin
 */
export const requireSuperAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'superadmin' && userRole !== 'admin') { // admin cũ = superadmin
    return res.status(403).json({
      success: false,
      message: 'Yêu cầu quyền superadmin'
    });
  }
  
  next();
};