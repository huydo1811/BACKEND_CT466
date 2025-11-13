import Actor from '../models/Actor.js'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import Movie from '../models/Movie.js'
import Country from '../models/Country.js'

const uploadsDir = path.join(process.cwd(), 'uploads', 'actors')

const _deleteFileIfLocal = (photoUrl) => {
  if (!photoUrl) return
  try {
    const segment = '/uploads/actors/'
    const idx = photoUrl.indexOf(segment)
    if (idx === -1) return
    const filename = photoUrl.slice(idx + segment.length)
    const fp = path.join(uploadsDir, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (err) {
    console.warn('delete actor photo error', err)
  }
}

const getAllActors = async ({ page = 1, limit = 20, search, isActive, nationality, genre, ageRange, sort } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.max(1, parseInt(limit, 10) || 20)
  const filter = {}

  if (typeof isActive === 'boolean') filter.isActive = isActive

  if (search) {
    const re = new RegExp(search, 'i')
    filter.$or = [{ name: re }, { nationality: re }, { bio: re }]
  }

  // nationality: try to resolve country name if id/slug provided
  if (nationality) {
    let countryName = null
    try {
      if (mongoose.Types.ObjectId.isValid(String(nationality))) {
        const c = await Country.findById(String(nationality)).lean()
        if (c) countryName = c.name
      }
      if (!countryName) {
        // try slug or direct match
        const c = await Country.findOne({ $or: [{ slug: String(nationality) }, { name: { $regex: String(nationality), $options: 'i' } }, { code: String(nationality).toUpperCase() }] }).lean()
        if (c) countryName = c.name
      }
    } catch (e) {
      // ignore lookup errors and fall back to using raw value
    }
    if (countryName) filter.nationality = countryName
    else filter.nationality = String(nationality)
  }

  // ageRange: convert to birthDate range
  if (ageRange) {
    const today = new Date()
    const y = today.getFullYear()
    if (ageRange === 'under30') {
      const from = new Date(today)
      from.setFullYear(y - 30)
      filter.birthDate = { $gte: from }
    } else if (ageRange === '30to50') {
      const from = new Date(today); from.setFullYear(y - 50)
      const to = new Date(today); to.setFullYear(y - 30)
      filter.birthDate = { $gte: from, $lte: to }
    } else if (ageRange === 'over50') {
      const to = new Date(today); to.setFullYear(y - 50)
      filter.birthDate = { $lte: to }
    }
  }

  // genre: find actors who appear in movies with this category
  if (genre) {
    try {
      const movieQuery = { isPublished: true }
      // match category id or slug/name; Movie.categories stores ObjectIds so try to use as id
      if (mongoose.Types.ObjectId.isValid(String(genre))) {
        movieQuery.categories = String(genre)
      } else {
        const movies = await Movie.find({ isPublished: true }).populate('categories', 'name slug').lean()
        const matchedActorIds = new Set()
        movies.forEach(m => {
          if (Array.isArray(m.categories) && m.categories.some(c => (c.slug === String(genre)) || (c.name && c.name.toLowerCase() === String(genre).toLowerCase()))) {
            (m.actors || []).forEach(a => {
              if (a) matchedActorIds.add(String(a))
            })
          }
        })
        if (matchedActorIds.size === 0) {
          // no matches -> return empty page
          return { actors: [], pagination: { page: p, limit: l, totalItems: 0, totalPages: 1 } }
        }
        filter._id = { $in: Array.from(matchedActorIds).map(id => mongoose.Types.ObjectId(id)) }
      }

      if (!filter._id) {
        // simple pipeline to get actor ids
        const actorIds = await Movie.distinct('actors', movieQuery)
        if (!actorIds || actorIds.length === 0) {
          return { actors: [], pagination: { page: p, limit: l, totalItems: 0, totalPages: 1 } }
        }
        filter._id = { $in: actorIds }
      }
    } catch (e) {
      console.warn('genre filter failed', e)
    }
  }

  // Build sort object
  let sortObj = { createdAt: -1 }
  if (sort) {
    // support '-field' or 'field'
    const dir = String(sort).startsWith('-') ? -1 : 1
    const field = String(sort).replace(/^-/, '')
    // allow only safe fields
    const allowed = ['name', 'createdAt', 'birthDate']
    if (allowed.includes(field)) sortObj = { [field]: dir }
    else sortObj = { createdAt: -1 }
  }

  const skip = (p - 1) * l
  const [actors, totalItems] = await Promise.all([
    Actor.find(filter).sort(sortObj).skip(skip).limit(l).lean(),
    Actor.countDocuments(filter)
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / l))
  const pagination = { page: p, limit: l, totalItems, totalPages }

  return { actors, pagination }
}

const createActor = async (data) => {
  // allow duplicate names: do not enforce uniqueness here
  const actor = await Actor.create(data)
  return actor
}

const updateActor = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ')
  const existing = await Actor.findById(id).lean()
  if (!existing) throw new Error('Không tìm thấy diễn viên')

  // delete old local photo if replaced
  if (updateData.photoUrl && existing.photoUrl && updateData.photoUrl !== existing.photoUrl) {
    _deleteFileIfLocal(existing.photoUrl)
  }

  const updated = await Actor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
  if (!updated) throw new Error('Cập nhật thất bại')
  return updated
}

const deleteActor = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ')
  const existing = await Actor.findByIdAndDelete(id)
  if (!existing) throw new Error('Không tìm thấy diễn viên')
  if (existing.photoUrl) _deleteFileIfLocal(existing.photoUrl)
  return true
}

export async function getActorById(id) {
  const actor = await Actor.findById(id).lean()
  if (!actor) throw new Error('Actor not found')
  return actor
}

export async function getActorBySlug(slug) {
  if (!slug) throw new Error('Missing slug')
  const actor = await Actor.findOne({ slug }).lean()
  if (!actor) throw new Error('Actor not found')
  return actor
}

// optional default export object (keep existing API)
export default {
  getActorById,
  getAllActors,
  createActor,
  updateActor,
  deleteActor,
  getActorBySlug
}