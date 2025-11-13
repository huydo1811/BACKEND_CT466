import mongoose from 'mongoose'

const SettingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'MyCinema' },
  siteUrl: { type: String, default: '' },
  logo: { type: String, default: '' },
  emails: { type: [String], default: [] },
  phones: { type: [String], default: [] }
}, { timestamps: true })

export default mongoose.model('Setting', SettingSchema)