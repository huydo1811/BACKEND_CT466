export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

//Sử dụng asyncHandler trong các controller để bắt lỗi async, không cần try-catch quá nhiều trong controller