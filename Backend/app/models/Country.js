import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên quốc gia là bắt buộc'],
    unique: true,
    trim: true,
    maxlength: [100, 'Tên quốc gia không được vượt quá 100 ký tự']
  },

  // thêm các trường cần thiết
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Mã không quá 10 ký tự'],
    default: ''
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  flag: {
    // lưu URL public (hoặc path), có thể để rỗng nếu chưa upload
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'countries'
});

// Index cho tìm kiếm nhanh
countrySchema.index({ name: 1 });
countrySchema.index({ code: 1 });
countrySchema.index({ slug: 1 });

const Country = mongoose.model('Country', countrySchema);

export default Country;