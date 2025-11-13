import { asyncHandler } from '../utils/asyncHandler.js'
import settingService from '../services/settingService.js'
import fs from 'fs'
import path from 'path'

const buildFileUrl = (req, filename, folder = 'settings') => {
  if (!filename) return ''
  const rel = `/uploads/${folder}/${filename}`
  return `${req.protocol}://${req.get('host')}${rel}`
}

const deleteUploadedFile = (fileUrl, folder = 'settings') => {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return
    const segment = `/uploads/${folder}/`
    const idx = fileUrl.indexOf(segment)
    if (idx === -1) return
    const filename = fileUrl.slice(idx + segment.length)
    const fp = path.join(process.cwd(), 'uploads', folder, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (e) {
    console.warn('deleteUploadedFile fail', e)
  }
}

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.getSettings()
  res.json({ success: true, data: settings || {} })
})

export const updateSettings = asyncHandler(async (req, res) => {
  // req may be multipart (upload.single('logo')) or normal JSON
  const body = req.body || {}

  // prepare payload
  const payload = {}
  payload.siteName = body.siteName ?? ''
  payload.siteUrl = body.siteUrl ?? ''

  // emails / phones can come as JSON string or array
  const parseArrayField = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {}
      // if plain comma separated
      return v.split(',').map(x => x.trim()).filter(Boolean)
    }
    return []
  }

  payload.emails = parseArrayField(body.emails)
  payload.phones = parseArrayField(body.phones)

  // fetch existing settings to remove previous logo if replaced
  const existing = await settingService.getSettings()

  // If multer placed file in req.file, set logo url and delete old local file
  if (req.file && req.file.filename) {
    if (existing && existing.logo) {
      deleteUploadedFile(existing.logo, 'settings')
    }
    payload.logo = buildFileUrl(req, req.file.filename, 'settings')
  } else if (body.logo) {
    // if frontend sent dataURL or URL as logo string, store it directly
    payload.logo = body.logo
  } else {
    // if no logo field, keep existing logo (upsert will not remove)
    if (existing && existing.logo) payload.logo = existing.logo
  }

  const updated = await settingService.upsertSettings(payload)
  res.json({ success: true, data: updated })
})