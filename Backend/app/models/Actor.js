import mongoose from 'mongoose';

const actorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên diễn viên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên diễn viên không được vượt quá 100 ký tự'],
    index: true
  },
  slug: {
    type: String,
    lowercase: true,
    unique: true,
    sparse: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Tiểu sử không được vượt quá 1000 ký tự'],
    default: ''
  },
  birthDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date <= new Date();
      },
      message: 'Ngày sinh không được trong tương lai'
    }
  },
  photoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'URL ảnh không hợp lệ (phải là jpg, jpeg, png, gif, webp)'
    }
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: [50, 'Quốc tịch không được vượt quá 50 ký tự']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'actors'
});

// Virtual field để tính tuổi
actorSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthYear = this.birthDate.getFullYear();
  const currentYear = today.getFullYear();
  const age = currentYear - birthYear;
  
  // Kiểm tra xem đã qua sinh nhật chưa
  const monthDiff = today.getMonth() - this.birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.birthDate.getDate())) {
    return age - 1;
  }
  return age;
});

// Include virtuals when converting to JSON
actorSchema.set('toJSON', { virtuals: true });

// Index để tìm kiếm nhanh
actorSchema.index({ name: 'text', bio: 'text' });
actorSchema.index({ nationality: 1 });
actorSchema.index({ isActive: 1 });
actorSchema.index({ slug: 1 });

// Pre-save: nếu không có slug, tạo tự động từ tên; nếu admin cung cấp slug thì sanitize
function normalizeSlug(s) {
  if (!s) return ''
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
actorSchema.pre('save', function(next) {
  if (this.slug && typeof this.slug === 'string') {
    this.slug = normalizeSlug(this.slug)
  }
  if ((!this.slug || this.slug.length === 0) && this.name) {
    this.slug = normalizeSlug(this.name)
  }
  next()
})

const Actor = mongoose.model('Actor', actorSchema);

export default Actor;