import Setting from '../models/Setting.js'

const getSettings = async () => {
  const s = await Setting.findOne().lean()
  return s || null
}

const upsertSettings = async (data) => {
  const opts = { new: true, upsert: true, setDefaultsOnInsert: true }
  const updated = await Setting.findOneAndUpdate({}, data, opts)
  return updated
}

export default {
  getSettings,
  upsertSettings
}