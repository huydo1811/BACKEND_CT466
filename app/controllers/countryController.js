import countryService from '../services/countryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// helper to build public URL for uploaded file
const buildFlagUrl = (req, file) => {
  if (!file) return undefined;
  // assuming server serves /uploads static as above
  const url = `${req.protocol}://${req.get('host')}/uploads/countries/${file.filename}`;
  return url;
}

// Lấy tất cả quốc gia
export const getAllCountries = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  
  const result = await countryService.getAllCountries({
    page,
    limit,
    search
  });

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách quốc gia thành công',
    data: result.countries,
    pagination: result.pagination
  });
});

// Lấy quốc gia theo ID
export const getCountryById = asyncHandler(async (req, res) => {
  const country = await countryService.getCountryById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin quốc gia thành công',
    data: country
  });
});

// Tạo quốc gia mới
export const createCountry = asyncHandler(async (req, res) => {
  // if file uploaded, set flag url
  if (req.file) {
    req.body.flag = buildFlagUrl(req, req.file);
  }
  const country = await countryService.createCountry(req.body);

  res.status(201).json({
    success: true,
    message: 'Tạo quốc gia thành công',
    data: country
  });
});

// Cập nhật quốc gia
export const updateCountry = asyncHandler(async (req, res) => {
  if (req.file) {
    req.body.flag = buildFlagUrl(req, req.file);
  }
  const country = await countryService.updateCountry(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Cập nhật quốc gia thành công',
    data: country
  });
});

// Xóa quốc gia
export const deleteCountry = asyncHandler(async (req, res) => {
  await countryService.deleteCountry(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Xóa quốc gia thành công'
  });
});

// Tìm kiếm quốc gia
export const searchCountries = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Từ khóa tìm kiếm là bắt buộc'
    });
  }

  const countries = await countryService.searchCountries(q);

  res.status(200).json({
    success: true,
    message: 'Tìm kiếm quốc gia thành công',
    data: countries
  });
});