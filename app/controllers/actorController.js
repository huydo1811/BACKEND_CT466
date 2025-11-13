import actorService from '../services/actorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';

// helper: build public URL for uploaded photo
const buildPhotoUrl = (req, file) => {
  if (!file) return undefined
  return `${req.protocol}://${req.get('host')}/uploads/actors/${file.filename}`
}

// Lấy tất cả diễn viên
export const getAllActors = asyncHandler(async (req, res) => {
  // existing params
  const { page, limit, search } = req.query

  // new params for filtering/sorting
  const nationality = req.query.nationality || req.query.nationalityId || undefined
  const genre = req.query.genre || req.query.genreId || undefined
  const ageRange = req.query.ageRange || undefined
  // support both 'sort' and 'sortBy' sent by frontend
  const sort = req.query.sort || req.query.sortBy || undefined

  // parse isActive: 'true'|'false' -> boolean, else undefined
  let isActive
  if (req.query.isActive === 'true') isActive = true
  else if (req.query.isActive === 'false') isActive = false
  else isActive = undefined

  const options = {
    page,
    limit,
    search,
    isActive,
    nationality,
    genre,
    ageRange,
    sort
  }

  const result = await actorService.getAllActors(options)

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách diễn viên thành công',
    data: result.actors,
    pagination: result.pagination
  });
});

// Lấy diễn viên theo ID
export const getActorById = asyncHandler(async (req, res) => {
  const actor = await actorService.getActorById(req.params.id);
  res.status(200).json({ success: true, message: 'Lấy thông tin diễn viên thành công', data: actor });
});

// Lấy diễn viên theo slug (Public)
export const getActorBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const actor = await actorService.getActorBySlug(slug)
  res.status(200).json({ success: true, message: 'Lấy diễn viên thành công', data: actor })
});

// Tạo diễn viên mới
export const createActor = asyncHandler(async (req, res) => {
  if (req.file) req.body.photoUrl = buildPhotoUrl(req, req.file)
  const actor = await actorService.createActor(req.body)
   res.status(201).json({ success: true, message: 'Tạo diễn viên thành công', data: actor })
});

// Cập nhật diễn viên
export const updateActor = asyncHandler(async (req, res) => {
  if (req.file) req.body.photoUrl = buildPhotoUrl(req, req.file)
  const actor = await actorService.updateActor(req.params.id, req.body)
   res.status(200).json({ success: true, message: 'Cập nhật diễn viên thành công', data: actor })
});

// Xóa diễn viên (soft delete)
export const deleteActor = asyncHandler(async (req, res) => {
  await actorService.deleteActor(req.params.id)
   res.status(200).json({ success: true, message: 'Xóa diễn viên thành công' })
});

// Xóa vĩnh viễn
export const permanentDeleteActor = asyncHandler(async (req, res) => {
  const actor = await actorService.permanentDeleteActor(req.params.id)

  res.status(200).json({
    success: true,
    message: 'Xóa vĩnh viễn diễn viên thành công',
    data: actor
  });
});

// Tìm kiếm diễn viên
export const searchActors = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Từ khóa tìm kiếm là bắt buộc'
    });
  }

  const actors = await actorService.searchActors(q);

  res.status(200).json({
    success: true,
    message: 'Tìm kiếm diễn viên thành công',
    data: actors
  });
});

// Lấy diễn viên theo quốc tịch
export const getActorsByNationality = asyncHandler(async (req, res) => {
  const actors = await actorService.getActorsByNationality(req.params.nationality);

  res.status(200).json({
    success: true,
    message: 'Lấy diễn viên theo quốc tịch thành công',
    data: actors
  });
});