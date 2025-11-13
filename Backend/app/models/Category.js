import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên thể loại là bắt buộc'],
    unique: true,
    trim: true,
    maxlength: [50, 'Tên thể loại không được vượt quá 50 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Mô tả không được vượt quá 200 ký tự']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  image: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'categories'
});

// Tự động tạo slug từ name
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Index để tìm kiếm nhanh
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;