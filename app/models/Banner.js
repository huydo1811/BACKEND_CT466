import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề banner là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tiêu đề không được vượt quá 100 ký tự']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Phụ đề không được vượt quá 200 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  image: {
    type: String,
    required: [true, 'Hình ảnh banner là bắt buộc']
  },
  mobileImage: {
    type: String, 
  },
  linkUrl: {
    type: String, 
    trim: true
  },
  linkType: {
    type: String,
    enum: ['movie', 'category', 'external', 'none'],
    default: 'none'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  buttonText: {
    type: String,
    trim: true,
    maxlength: [50, 'Text nút không được vượt quá 50 ký tự']
  },
  position: {
    type: String,
    enum: ['hero', 'secondary', 'sidebar', 'footer'],
    default: 'hero'
  },
  priority: {
    type: Number,
    default: 0, 
    min: 0,
    max: 999
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
  },
  clickCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  backgroundColor: {
    type: String,
    default: '#000000'
  },
  textColor: {
    type: String,
    default: '#ffffff'
  }
}, {
  timestamps: true
});

// Index để query nhanh
bannerSchema.index({ isActive: 1, position: 1, priority: -1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

// Middleware kiểm tra ngày hết hạn
bannerSchema.pre('find', function() {
  const now = new Date();
  this.where({
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  });
});

bannerSchema.pre('findOne', function() {
  const now = new Date();
  this.where({
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  });
});

// Method tăng view count
bannerSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// Method tăng click count
bannerSchema.methods.incrementClick = function() {
  this.clickCount += 1;
  return this.save();
};

export default mongoose.model('Banner', bannerSchema);