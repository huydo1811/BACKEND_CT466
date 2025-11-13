import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tên phim là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tên phim không được vượt quá 200 ký tự']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Mô tả phim là bắt buộc'],
    maxlength: [1000, 'Mô tả không được vượt quá 1000 ký tự']
  },
  
  poster: {
    type: String,
    required: [true, 'Poster phim là bắt buộc']
  },
  backdrop: {
    type: String
  },
  trailer: {
    type: String // Link YouTube trailer
  },
  videoUrl: {
    type: String,
    required: function() { return this.type !== 'series' } // only required for non-series
  },
  
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: [true, 'Quốc gia sản xuất là bắt buộc']
  },
  
  actors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Actor'
  }],
  director: {
    type: String,
    required: [true, 'Đạo diễn là bắt buộc']
  },
  
  duration: {
    type: Number, 
    min: [1, 'Thời lượng phải lớn hơn 0'],
    required: function() { return this.type !== 'series' } // only required for non-series
  },
  releaseDate: {
    type: Date,
    required: function() { return this.type !== 'series' } // optional for series
  },
  year: {
    type: Number,
    required: function() { return this.type !== 'series' } // optional for series
  },
  
  // series helper (tùy chọn)
  totalEpisodes: {
    type: Number,
    default: 0
  },
  // number of seasons for a parent series
  seasons: {
    type: Number,
    min: [1, 'Số mùa phải lớn hơn 0'],
    default: 1
  },

  parentSeries: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    default: null
  },
  // season number for this entry (if it's a season record)
  seasonNumber: {
    type: Number,
    min: [1, 'Số mùa phải >= 1'],
    default: 1
  },
  // flag to mark a parent "show" (optional)
  isParentSeries: {
    type: Boolean,
    default: false
  },
  type: { type: String, enum: ['movie','series','anime'], default: 'movie' },
  
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isHot: {
    type: Boolean,
    default: false
  },

  isHero: { 
    type: Boolean, 
    default: false 
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});
movieSchema.index({ title: 'text', description: 'text' });
movieSchema.index({ slug: 1 });
movieSchema.index({ categories: 1, isPublished: 1 });
movieSchema.index({ year: -1 });
movieSchema.index({ viewCount: -1 });

movieSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

movieSchema.pre('save', function(next) {
  // respect admin-provided slug; otherwise generate from title
  const normalize = (s='') => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'')
  if (this.slug && typeof this.slug === 'string') {
    this.slug = normalize(this.slug)
  } else if ((!this.slug || this.slug === '') && this.title) {
    this.slug = normalize(this.title)
  }
  
  if (this.isModified('releaseDate')) {
    this.year = new Date(this.releaseDate).getFullYear();
  }
  
  next();
});

movieSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

export default mongoose.model('Movie', movieSchema);